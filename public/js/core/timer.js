/*
 * Timer-Engine – reine Logik ohne DOM.
 * Läuft im Browser (window.CFO.timer) und in Node (require), damit Server,
 * Bedienoberfläche, Overlay und Fernsteuerung exakt gleich rechnen.
 *
 * Grundidee: Der Timer speichert keinen "Sekundenzähler", sondern nur
 * Zeitstempel (startedAt, pausedAt, pausedMs). Jede Ansicht berechnet die
 * aktuelle Anzeige selbst aus der Uhrzeit. Dadurch laufen mehrere Ansichten
 * synchron und ein Neuladen des Overlays verliert keine Zeit.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CFO = root.CFO || {}; root.CFO.timer = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_SEGMENTS = 500;
  var MAX_SEGMENT_SEC = 24 * 3600;

  var MODES = {
    countdown: 'Countdown / AMRAP',
    stopwatch: 'Stoppuhr / For Time',
    emom: 'EMOM',
    interval: 'Arbeit / Pause',
    sequence: 'Zeitfolge'
  };

  // ---------------------------------------------------------------------------
  // Zeit-Formatierung
  // ---------------------------------------------------------------------------

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /** Sekunden -> "m:ss" bzw. "h:mm:ss". */
  function formatClock(totalSec) {
    totalSec = Math.max(0, Math.floor(totalSec));
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) return h + ':' + pad2(m) + ':' + pad2(s);
    return m + ':' + pad2(s);
  }

  // ---------------------------------------------------------------------------
  // Zeitfolgen-Parser, z. B. "2m + 30 + 1:00" oder "8*(20 + 10p)"
  // ---------------------------------------------------------------------------

  function ParseError(message, pos) {
    this.name = 'ParseError';
    this.message = message;
    this.pos = pos;
  }
  ParseError.prototype = Object.create(Error.prototype);

  var UNIT_WORDS = { m: 60, min: 60, mins: 60, minute: 60, minuten: 60, s: 1, sec: 1, sek: 1, sekunden: 1, h: 3600, std: 3600 };
  var REST_WORDS = { p: 1, pause: 1, r: 1, rest: 1 };
  var WORK_WORDS = { w: 1, work: 1, a: 1, arbeit: 1 };

  function tokenize(src) {
    var tokens = [];
    var i = 0;
    while (i < src.length) {
      var ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '+' || ch === ',' || ch === ';') { tokens.push({ t: 'plus', pos: i }); i++; continue; }
      if (ch === '*' || ch === '×') { tokens.push({ t: 'mul', pos: i }); i++; continue; }
      if (ch === '(' || ch === '[') { tokens.push({ t: 'lp', pos: i }); i++; continue; }
      if (ch === ')' || ch === ']') { tokens.push({ t: 'rp', pos: i }); i++; continue; }
      if (/[0-9]/.test(ch)) {
        var start = i;
        while (i < src.length && /[0-9:.]/.test(src[i])) i++;
        var raw = src.slice(start, i);
        tokens.push({ t: 'num', raw: raw, pos: start });
        continue;
      }
      if (/[a-zäöüß]/i.test(ch)) {
        var ws = i;
        while (i < src.length && /[a-zäöüß]/i.test(src[i])) i++;
        var word = src.slice(ws, i).toLowerCase();
        pushWord(tokens, word, ws);
        continue;
      }
      throw new ParseError('Unbekanntes Zeichen „' + ch + '“', i);
    }
    return tokens;
  }

  function pushWord(tokens, word, pos) {
    if (word === 'x') { tokens.push({ t: 'mul', pos: pos }); return; }
    if (UNIT_WORDS[word]) { tokens.push({ t: 'unit', mult: UNIT_WORDS[word], pos: pos }); return; }
    if (REST_WORDS[word]) { tokens.push({ t: 'mark', kind: 'rest', pos: pos }); return; }
    if (WORK_WORDS[word]) { tokens.push({ t: 'mark', kind: 'work', pos: pos }); return; }
    // Kombinationen wie "mp" (Minuten + Pause) oder "sr"
    for (var u in UNIT_WORDS) {
      if (word.indexOf(u) === 0) {
        var rest = word.slice(u.length);
        if (REST_WORDS[rest] || WORK_WORDS[rest]) {
          tokens.push({ t: 'unit', mult: UNIT_WORDS[u], pos: pos });
          tokens.push({ t: 'mark', kind: REST_WORDS[rest] ? 'rest' : 'work', pos: pos + u.length });
          return;
        }
      }
    }
    throw new ParseError('Unbekanntes Wort „' + word + '“', pos);
  }

  function parseNumberToken(tok) {
    var raw = tok.raw;
    if (raw.indexOf(':') >= 0) {
      var parts = raw.split(':');
      if (parts.length > 3 || parts.some(function (p) { return p === '' || !/^\d+$/.test(p); })) {
        throw new ParseError('Ungültige Zeitangabe „' + raw + '“', tok.pos);
      }
      var n = parts.map(Number);
      if (n.length === 2) return { value: n[0] * 60 + n[1], clock: true };
      return { value: n[0] * 3600 + n[1] * 60 + n[2], clock: true };
    }
    if (!/^\d+(\.\d+)?$/.test(raw)) throw new ParseError('Ungültige Zahl „' + raw + '“', tok.pos);
    return { value: parseFloat(raw), clock: false, integer: /^\d+$/.test(raw) };
  }

  /**
   * Parst eine Zeitfolge und liefert eine Liste von {sec, kind}.
   * kind ist "work" oder "rest" (Suffix p/pause/r/rest).
   */
  function parseSequence(src) {
    if (typeof src !== 'string' || !src.trim()) throw new ParseError('Bitte eine Zeitfolge eingeben', 0);
    var tokens = tokenize(src);
    var pos = 0;

    function peek(o) { return tokens[pos + (o || 0)]; }
    function next() { return tokens[pos++]; }

    function parseExpr() {
      var items = parseTerm();
      while (peek() && peek().t === 'plus') {
        next();
        if (!peek()) break; // abschließendes "+" tolerieren
        items = items.concat(parseTerm());
      }
      return items;
    }

    function parseTerm() {
      var tok = peek();
      if (!tok) throw new ParseError('Zeitangabe fehlt', src.length);
      // Wiederholung: "4*(...)" oder "4x1m"
      if (tok.t === 'num' && peek(1) && peek(1).t === 'mul') {
        var nInfo = parseNumberToken(tok);
        if (!nInfo.integer || nInfo.value < 1) throw new ParseError('Wiederholungen müssen eine ganze Zahl ≥ 1 sein', tok.pos);
        next(); next();
        var inner = parseFactor();
        var out = [];
        for (var r = 0; r < nInfo.value; r++) {
          out = out.concat(inner);
          if (out.length > MAX_SEGMENTS) throw new ParseError('Zu viele Intervalle (max. ' + MAX_SEGMENTS + ')', tok.pos);
        }
        return out;
      }
      return parseFactor();
    }

    function parseFactor() {
      var tok = peek();
      if (!tok) throw new ParseError('Zeitangabe fehlt', src.length);
      if (tok.t === 'lp') {
        next();
        var items = parseExpr();
        var close = next();
        if (!close || close.t !== 'rp') throw new ParseError('Schließende Klammer fehlt', close ? close.pos : src.length);
        var mark = peek();
        if (mark && mark.t === 'mark') {
          next();
          items = items.map(function (it) { return { sec: it.sec, kind: mark.kind }; });
        }
        return items;
      }
      if (tok.t === 'num') return [parseTime()];
      throw new ParseError('Zeitangabe erwartet', tok.pos);
    }

    function parseTime() {
      var total = 0;
      var kind = 'work';
      var first = true;
      var lastMult = null;
      while (peek() && peek().t === 'num') {
        var tok = next();
        var info = parseNumberToken(tok);
        var unit = peek() && peek().t === 'unit' ? next() : null;
        var mult;
        if (unit) {
          if (info.clock) throw new ParseError('Einheit nach „' + tok.raw + '“ nicht erlaubt', unit.pos);
          mult = unit.mult;
        } else if (!first && lastMult === 3600) {
          mult = 60; // "1h30" -> 1 h 30 min
        } else {
          mult = 1; // "1m30" -> 1 min 30 s; reine Zahl = Sekunden
        }
        total += info.value * mult;
        lastMult = mult;
        first = false;
        if (!unit) break;
      }
      if (peek() && peek().t === 'mark') kind = next().kind;
      total = Math.round(total);
      if (total <= 0) throw new ParseError('Intervalle müssen länger als 0 Sekunden sein', tokens[pos - 1] ? tokens[pos - 1].pos : 0);
      if (total > MAX_SEGMENT_SEC) throw new ParseError('Intervall zu lang (max. 24 h)', tokens[pos - 1].pos);
      return { sec: total, kind: kind };
    }

    var result = parseExpr();
    if (pos < tokens.length) {
      var bad = tokens[pos];
      throw new ParseError(bad.t === 'rp' ? 'Zu viele schließende Klammern' : 'Unerwartete Eingabe', bad.pos);
    }
    if (!result.length) throw new ParseError('Keine Intervalle gefunden', 0);
    if (result.length > MAX_SEGMENTS) throw new ParseError('Zu viele Intervalle (max. ' + MAX_SEGMENTS + ')', 0);
    return result;
  }

  /** Einzelne Zeit wie "12:00", "90", "1m30" -> Sekunden (oder NaN). */
  function parseDuration(value) {
    if (typeof value === 'number') return isFinite(value) && value >= 0 ? Math.round(value) : NaN;
    if (typeof value !== 'string' || !value.trim()) return NaN;
    try {
      var items = parseSequence(value);
      if (items.length !== 1) return NaN;
      return items[0].sec;
    } catch (e) {
      // "0", "0:00", "0s" usw. sind gültige Null-Werte (z. B. "keine Pause")
      if (/^\s*0+(:0+){0,2}\s*(m|min|s|sek|sec)?\s*$/i.test(value)) return 0;
      return NaN;
    }
  }

  // ---------------------------------------------------------------------------
  // Programm (Liste der Abschnitte) aus der Konfiguration bauen
  // ---------------------------------------------------------------------------

  function clampInt(v, min, max, fallback) {
    v = Math.round(Number(v));
    if (!isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  }

  /**
   * Liefert { segments, totalSec, openEnded, error }.
   * Segment: { kind: 'prep'|'work'|'rest', sec, round, rounds, set, sets, index, count }
   *   round/rounds  = Runde innerhalb des Programms (nur Arbeitsabschnitte zählen)
   *   index/count   = laufende Nummer aller Intervalle (ohne Vorlauf)
   */
  function buildProgram(cfg) {
    cfg = cfg || {};
    var mode = MODES[cfg.mode] ? cfg.mode : 'countdown';
    var body = [];
    var openEnded = false;
    var error = null;

    if (mode === 'countdown') {
      body.push({ kind: 'work', sec: clampInt(cfg.durationSec, 1, MAX_SEGMENT_SEC, 600) });
    } else if (mode === 'stopwatch') {
      var cap = clampInt(cfg.capSec, 0, MAX_SEGMENT_SEC, 0);
      if (cap > 0) body.push({ kind: 'work', sec: cap });
      else { body.push({ kind: 'work', sec: Infinity }); openEnded = true; }
    } else if (mode === 'emom') {
      var every = clampInt(cfg.emomIntervalSec, 1, MAX_SEGMENT_SEC, 60);
      var emomRounds = clampInt(cfg.emomRounds, 1, MAX_SEGMENTS, 10);
      for (var e = 0; e < emomRounds; e++) body.push({ kind: 'work', sec: every });
    } else if (mode === 'interval') {
      var rounds = clampInt(cfg.rounds, 1, 200, 8);
      var work = clampInt(cfg.workSec, 1, MAX_SEGMENT_SEC, 20);
      var rest = clampInt(cfg.restSec, 0, MAX_SEGMENT_SEC, 10);
      var sets = clampInt(cfg.sets, 1, 20, 1);
      var setRest = clampInt(cfg.setRestSec, 0, MAX_SEGMENT_SEC, 60);
      for (var s = 0; s < sets; s++) {
        for (var r = 0; r < rounds; r++) {
          body.push({ kind: 'work', sec: work, set: s + 1 });
          var lastRound = r === rounds - 1;
          if (!lastRound && rest > 0) body.push({ kind: 'rest', sec: rest, set: s + 1 });
          if (lastRound && !cfg.skipLastRest && rest > 0 && s === sets - 1) body.push({ kind: 'rest', sec: rest, set: s + 1 });
        }
        if (s < sets - 1) {
          var between = setRest > 0 ? setRest : rest;
          if (between > 0) body.push({ kind: 'rest', sec: between, set: s + 1, setBreak: true });
        }
      }
      if (body.length > MAX_SEGMENTS) body = body.slice(0, MAX_SEGMENTS);
    } else if (mode === 'sequence') {
      try {
        body = parseSequence(cfg.sequence || '').map(function (it) { return { kind: it.kind, sec: it.sec }; });
      } catch (err) {
        error = err.message;
        body = [{ kind: 'work', sec: 60 }];
      }
    }

    // Rundenzählung (nur Arbeitsabschnitte) und Intervall-Index vergeben
    var workCount = body.filter(function (b) { return b.kind === 'work'; }).length;
    var roundsPerSet = mode === 'interval' ? clampInt(cfg.rounds, 1, 200, 8) : workCount;
    var setsTotal = mode === 'interval' ? clampInt(cfg.sets, 1, 20, 1) : 1;
    var w = 0;
    body.forEach(function (seg, i) {
      seg.index = i + 1;
      seg.count = body.length;
      if (seg.kind === 'work') w++;
      seg.round = Math.max(1, w);
      seg.rounds = workCount;
      if (mode === 'interval') {
        seg.set = seg.set || 1;
        seg.sets = setsTotal;
        seg.roundInSet = ((Math.max(1, w) - 1) % roundsPerSet) + 1;
        seg.roundsPerSet = roundsPerSet;
      }
    });

    var segments = [];
    var prep = clampInt(cfg.prepSec, 0, 600, 0);
    if (prep > 0) segments.push({ kind: 'prep', sec: prep, round: 0, rounds: workCount, index: 0, count: body.length });
    segments = segments.concat(body);

    var totalSec = 0;
    segments.forEach(function (seg) { totalSec += seg.sec; });

    return { mode: mode, segments: segments, totalSec: totalSec, openEnded: openEnded, error: error, hasPrep: prep > 0, workCount: workCount };
  }

  /** Automatischer Titel, falls kein eigener Titel gesetzt ist. */
  function autoTitle(cfg) {
    cfg = cfg || {};
    switch (cfg.mode) {
      case 'stopwatch':
        return 'FOR TIME';
      case 'emom':
        return 'EMOM ' + clampInt(cfg.emomRounds, 1, 999, 10) + ' × ' + formatClock(cfg.emomIntervalSec || 60);
      case 'interval': {
        var isTabata = Number(cfg.workSec) === 20 && Number(cfg.restSec) === 10 && Number(cfg.rounds) === 8;
        var sets = clampInt(cfg.sets, 1, 20, 1);
        var base = (isTabata ? 'TABATA ' : 'INTERVALL ') + clampInt(cfg.rounds, 1, 200, 8) + ' × ' + formatClock(cfg.workSec) + ' / ' + formatClock(cfg.restSec);
        return sets > 1 ? sets + ' SÄTZE · ' + base : base;
      }
      case 'sequence': {
        var p = buildProgram(cfg);
        return p.error ? 'ZEITFOLGE' : 'ZEITFOLGE · ' + p.workCount + ' INTERVALLE';
      }
      default:
        return 'COUNTDOWN ' + formatClock(cfg.durationSec || 600);
    }
  }

  // ---------------------------------------------------------------------------
  // Laufzustand
  // ---------------------------------------------------------------------------

  function idleRun() {
    return { status: 'idle', startedAt: null, pausedAt: null, pausedMs: 0 };
  }

  function elapsedMs(run, now) {
    if (!run || run.status === 'idle' || run.startedAt == null) return 0;
    var end = run.status === 'paused' && run.pausedAt != null ? run.pausedAt : now;
    return Math.max(0, end - run.startedAt - (run.pausedMs || 0));
  }

  function locate(program, ms) {
    var acc = 0;
    var segs = program.segments;
    for (var i = 0; i < segs.length; i++) {
      var len = segs[i].sec * 1000;
      if (ms < acc + len || i === segs.length - 1 && program.openEnded) {
        return { i: i, startMs: acc, endMs: acc + len };
      }
      acc += len;
    }
    var last = segs.length - 1;
    return { i: last, startMs: acc - segs[last].sec * 1000, endMs: acc, done: true };
  }

  /**
   * Momentaufnahme für die Anzeige.
   * direction: 'auto' | 'up' | 'down'
   */
  function snapshot(program, run, now, direction) {
    var ms = elapsedMs(run, now);
    var status0 = run && run.status ? run.status : 'idle';
    // Im Ruhezustand den ersten echten Abschnitt zeigen (nicht den Vorlauf)
    var locMs = status0 === 'idle' && program.hasPrep && program.segments.length > 1 ? program.segments[0].sec * 1000 : ms;
    var loc = locate(program, locMs);
    var seg = program.segments[loc.i];
    var done = !!loc.done && !program.openEnded;
    var status = run && run.status ? run.status : 'idle';
    if (done && status !== 'idle') status = 'done';

    var segElapsed = Math.max(0, Math.min(locMs - loc.startMs, seg.sec * 1000));
    var segRemaining = seg.sec === Infinity ? Infinity : Math.max(0, seg.sec * 1000 - segElapsed);
    if (done) { segElapsed = seg.sec * 1000; segRemaining = 0; }

    var dir = direction === 'up' || direction === 'down' ? direction : (program.mode === 'stopwatch' ? 'up' : 'down');
    if (seg.kind === 'prep') dir = 'down';
    if (seg.sec === Infinity) dir = 'up';

    var displaySec = dir === 'up' ? Math.floor(segElapsed / 1000) : Math.ceil(segRemaining / 1000);

    return {
      status: status, // idle | running | paused | done
      elapsedMs: ms,
      segIndex: loc.i,
      segment: seg,
      kind: seg.kind,
      segElapsedMs: segElapsed,
      segRemainingMs: segRemaining,
      remainingSec: segRemaining === Infinity ? Infinity : Math.ceil(segRemaining / 1000),
      progress: seg.sec === Infinity ? 0 : Math.min(1, segElapsed / (seg.sec * 1000)),
      direction: dir,
      displaySec: displaySec,
      display: formatClock(displaySec),
      openEnded: program.openEnded
    };
  }

  /** Wendet einen Steuerbefehl an und gibt einen NEUEN Laufzustand zurück. */
  function command(program, run, cmd, now) {
    run = run ? { status: run.status, startedAt: run.startedAt, pausedAt: run.pausedAt, pausedMs: run.pausedMs || 0 } : idleRun();
    var snap = snapshot(program, run, now, 'auto');

    switch (cmd) {
      case 'start':
        if (run.status === 'idle' || snap.status === 'done') return { status: 'running', startedAt: now, pausedAt: null, pausedMs: 0 };
        if (run.status === 'paused') return resume(run, now);
        return run;
      case 'pause':
        if (run.status === 'running' && snap.status !== 'done') return { status: 'paused', startedAt: run.startedAt, pausedAt: now, pausedMs: run.pausedMs };
        return run;
      case 'resume':
        return run.status === 'paused' ? resume(run, now) : run;
      case 'toggle':
        if (run.status === 'running' && snap.status !== 'done') return command(program, run, 'pause', now);
        return command(program, run, 'start', now);
      case 'reset':
        return idleRun();
      case 'next':
      case 'prev': {
        if (run.status === 'idle') {
          // Aus dem Ruhezustand: pausiert am Ziel-Abschnitt starten
          run = { status: 'paused', startedAt: now, pausedAt: now, pausedMs: 0 };
          snap = snapshot(program, run, now, 'auto');
        }
        var target;
        var starts = [];
        var acc = 0;
        program.segments.forEach(function (s) { starts.push(acc); acc += s.sec * 1000; });
        if (cmd === 'next') {
          if (snap.segIndex >= program.segments.length - 1) {
            target = program.openEnded ? snap.elapsedMs : acc; // ans Ende springen
          } else {
            target = starts[snap.segIndex + 1];
          }
        } else {
          var cur = starts[snap.segIndex];
          var into = snap.elapsedMs - cur;
          if (snap.status === 'done') target = starts[program.segments.length - 1];
          else if (into > 2000 || snap.segIndex === 0) target = cur;
          else target = starts[snap.segIndex - 1];
        }
        var ref = run.status === 'paused' ? run.pausedAt : now;
        var startedAt = ref - (run.pausedMs || 0) - target;
        var status = run.status === 'paused' ? 'paused' : 'running';
        return { status: status, startedAt: startedAt, pausedAt: run.pausedAt, pausedMs: run.pausedMs || 0 };
      }
      default:
        return run;
    }
  }

  function resume(run, now) {
    return { status: 'running', startedAt: run.startedAt, pausedAt: null, pausedMs: (run.pausedMs || 0) + Math.max(0, now - run.pausedAt) };
  }

  return {
    MODES: MODES,
    formatClock: formatClock,
    parseSequence: parseSequence,
    parseDuration: parseDuration,
    ParseError: ParseError,
    buildProgram: buildProgram,
    autoTitle: autoTitle,
    idleRun: idleRun,
    elapsedMs: elapsedMs,
    snapshot: snapshot,
    command: command
  };
});
