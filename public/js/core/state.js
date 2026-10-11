/*
 * Zustand des Overlays: Standardwerte, Vorlagen, Szenen und der Reducer,
 * der alle Änderungen ausführt. Wie timer.js läuft diese Datei unverändert
 * im Browser (window.CFO.state) und im Node-Server (require).
 *
 * Alle Änderungen laufen über Aktionen (siehe reduce()). Dadurch können
 * Bedienoberfläche, Fernsteuerung und Server dieselbe Logik nutzen.
 */
(function (root, factory) {
  var timer = typeof module === 'object' && module.exports ? require('./timer.js') : root.CFO.timer;
  var api = factory(timer);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CFO = root.CFO || {}; root.CFO.state = api; }
})(typeof self !== 'undefined' ? self : this, function (T) {
  'use strict';

  var VERSION = 1;
  var MAX_TEXT = 20000;
  var MAX_IMAGE = 4 * 1024 * 1024; // Data-URL eines hochgeladenen Logos
  var MAX_SCENES = 60;
  var ZONES = ['left', 'center', 'right'];
  var ELEMENT_TYPES = ['logo', 'text', 'rich', 'labeled', 'clock', 'timer'];
  var CONTENT_KEYS = ['text', 'label', 'src'];

  /** Mitgelieferte Schriften (alle SIL Open Font License, lokal in assets/fonts). */
  var FONTS = {
    barlow: { label: 'Barlow Condensed', css: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif" },
    oswald: { label: 'Oswald', css: "'Oswald', 'Arial Narrow', Arial, sans-serif" },
    bebas: { label: 'Bebas Neue', css: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif" },
    anton: { label: 'Anton', css: "'Anton', Impact, sans-serif" },
    chalk: { label: 'Cabin Sketch (Kreide)', css: "'Cabin Sketch', 'Comic Sans MS', cursive" },
    inter: { label: 'Inter', css: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif" },
    mono: { label: 'Roboto Mono', css: "'Roboto Mono', Consolas, 'Courier New', monospace" },
    system: { label: 'Systemschrift', css: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" }
  };

  function style(font, size, color, weight, upper, align) {
    return { font: font, size: size, color: color, weight: weight, upper: !!upper, align: align || 'zone' };
  }

  function panel(over) {
    var p = { show: true, color: '#111214', opacity: 80, radius: 4, stripe: true, cut: true, padding: 28, blur: false };
    for (var k in over) p[k] = over[k];
    return p;
  }

  function defaults() {
    return {
      version: VERSION,
      global: {
        visible: true,
        animation: 'slide', // slide | fade | zoom | none
        animMs: 450,
        accent: '#E30613',
        textShadow: true,
        // Optionales Hintergrundbild hinter den Zonen (deckt das Kamerabild in OBS ab!)
        background: { show: false, src: 'assets/backgrounds/kreidetafel.jpg', dim: 0 }
      },
      zones: {
        left: { visible: true, h: 'left', v: 'top', mx: 48, my: 48, width: 470, align: 'left', scale: 100, panel: panel({}) },
        center: { visible: true, h: 'center', v: 'bottom', mx: 0, my: 40, width: 640, align: 'center', scale: 100, panel: panel({ padding: 22 }) },
        right: { visible: true, h: 'right', v: 'top', mx: 48, my: 48, width: 450, align: 'left', scale: 100, panel: panel({}) }
      },
      elements: {
        logo: { type: 'logo', name: 'Logo', zone: 'left', order: 1, visible: true, src: 'assets/logos/the-online-box.png', size: 150, shape: 'none', align: 'zone' },
        brand: { type: 'text', name: 'Markentitel', zone: 'left', order: 2, visible: true, text: 'The Online Box', style: style('barlow', 56, '#FFFFFF', 800, true) },
        title: { type: 'text', name: 'Trainings-/Veranstaltungstitel', zone: 'left', order: 3, visible: true, text: 'Home WOD · Live', style: style('barlow', 34, '#E30613', 700, true) },
        subtitle: { type: 'text', name: 'Untertitel', zone: 'left', order: 4, visible: true, text: 'Fitness, die funktioniert', style: style('inter', 22, '#D5D8DE', 500, false) },
        freeText: { type: 'text', name: 'Freier Text', zone: 'left', order: 5, visible: false, text: 'Heute: Ganzkörper – alle Level willkommen', style: style('inter', 20, '#FFFFFF', 400, false) },
        timer: { type: 'timer', name: 'Timer', zone: 'center', order: 1, visible: true },
        wodTitle: { type: 'text', name: 'WOD-Überschrift', zone: 'right', order: 1, visible: true, text: 'WOD', style: style('barlow', 46, '#FFFFFF', 800, true) },
        wod: { type: 'rich', name: 'WOD / Trainingsinfos', zone: 'right', order: 2, visible: true, text: 'AMRAP 12 Min\n- 10 Burpees\n- 15 Air Squats\n- 20 Sit-ups\n# Skalierung\n- Burpees ohne Sprung', style: style('inter', 26, '#FFFFFF', 500, false) },
        coach: { type: 'labeled', name: 'Trainer', zone: 'right', order: 3, visible: true, label: 'Coach', text: 'Dein Name', style: style('barlow', 30, '#FFFFFF', 700, true) },
        notes: { type: 'text', name: 'Hinweise', zone: 'right', order: 4, visible: true, text: 'Wasser bereitstellen · Matte & Kettlebell', style: style('inter', 20, '#C9CCD3', 400, false) },
        clock: { type: 'clock', name: 'Live-Uhr', zone: 'right', order: 5, visible: true, label: 'Live', seconds: false, date: false, style: style('barlow', 30, '#FFFFFF', 700, true) }
      },
      timer: {
        config: {
          mode: 'countdown',
          durationSec: 720,
          capSec: 900,
          emomIntervalSec: 60,
          emomRounds: 10,
          rounds: 8,
          workSec: 20,
          restSec: 10,
          skipLastRest: true,
          sets: 1,
          setRestSec: 60,
          sequence: '2m + 30 + 1:00',
          prepSec: 10,
          direction: 'auto',
          title: 'AMRAP 12'
        },
        run: T.idleRun(),
        style: {
          font: 'barlow',
          size: 190,
          weight: 700,
          progress: 'bar', // bar | ring | none
          showTitle: true,
          showPhase: true,
          showRounds: true,
          showPips: true,
          prepFullscreen: true,
          colorShift: true,
          warnSec: 10,
          alertSec: 5,
          colorBase: '#FFFFFF',
          colorOk: '#35D07F',
          colorWarn: '#FFC531',
          colorAlert: '#FF3B30',
          colorRest: '#5AB8FF',
          colorPrep: '#FFC531',
          titleColor: '#D5D8DE'
        },
        labels: { work: 'Arbeit', rest: 'Pause', prep: 'Bereit', go: 'Los!', done: 'Zeit!', paused: 'Pausiert', round: 'Runde', set: 'Satz', interval: 'Intervall', cap: 'Time Cap' },
        sound: { enabled: true, output: 'overlay', volume: 80 }
      },
      scenes: [],
      activeSceneId: null
    };
  }

  // ---------------------------------------------------------------------------
  // Vorlagen (verändern nur Gestaltung, nie Texte oder Logo)
  // ---------------------------------------------------------------------------

  var PRESETS = {
    broadcast: {
      name: 'Broadcast (Standard)',
      apply: function () {}
    },
    classic: {
      name: 'Kreidetafel (wie Referenz)',
      apply: function (s) {
        var z = s.zones;
        z.left = { visible: true, h: 'left', v: 'top', mx: 40, my: 40, width: 560, align: 'left', scale: 100, panel: panel({ color: '#1C201F', opacity: 70, radius: 0, stripe: false, cut: false, padding: 30 }) };
        z.right = { visible: true, h: 'right', v: 'top', mx: 40, my: 40, width: 380, align: 'center', scale: 100, panel: panel({ color: '#000000', opacity: 50, radius: 0, stripe: false, cut: false, padding: 24 }) };
        z.center = { visible: true, h: 'right', v: 'top', mx: 40, my: 480, width: 380, align: 'center', scale: 100, panel: panel({ show: false }) };
        var e = s.elements;
        e.wodTitle.zone = 'left'; e.wodTitle.order = 1; e.wodTitle.style = style('chalk', 86, '#FFFFFF', 700, false);
        e.wod.zone = 'left'; e.wod.order = 2; e.wod.style = style('chalk', 30, '#FFFFFF', 400, false);
        e.coach.zone = 'left'; e.coach.order = 3; e.coach.style = style('chalk', 28, '#FFFFFF', 400, false);
        e.notes.zone = 'left'; e.notes.order = 4; e.notes.style = style('chalk', 22, '#E8E8E8', 400, false);
        e.logo.zone = 'right'; e.logo.order = 1; e.logo.size = 260;
        e.brand.zone = 'right'; e.brand.order = 2; e.brand.visible = false;
        e.title.zone = 'right'; e.title.order = 3; e.title.style = style('chalk', 30, '#FFFFFF', 700, false);
        e.subtitle.zone = 'right'; e.subtitle.order = 4; e.subtitle.visible = false;
        e.freeText.zone = 'right'; e.freeText.order = 5;
        e.clock.zone = 'right'; e.clock.order = 6; e.clock.style = style('chalk', 28, '#FFFFFF', 400, false);
        var ts = s.timer.style;
        ts.font = 'barlow'; ts.size = 104; ts.progress = 'ring'; ts.showPips = false; ts.colorShift = false;
        ts.colorBase = '#FFFFFF'; ts.colorRest = '#FFFFFF';
        s.global.accent = '#E30613';
        s.global.animation = 'fade';
      }
    },
    minimal: {
      name: 'Minimal (ohne Flächen)',
      apply: function (s) {
        ZONES.forEach(function (id) { s.zones[id].panel.show = false; });
        s.zones.left.width = 420;
        s.zones.right.width = 420;
        s.zones.center.my = 24;
        s.zones.center.width = 900;
        s.elements.subtitle.visible = false;
        s.elements.notes.visible = false;
        s.elements.logo.size = 120;
        s.timer.style.size = 240;
        s.timer.style.showPips = false;
        s.timer.style.progress = 'none';
        s.global.animation = 'fade';
      }
    }
  };

  /** Schnellstart-Programme für Regie und Fernbedienung. */
  var TIMER_PRESETS = [
    ['AMRAP 12', { mode: 'countdown', durationSec: 720, title: 'AMRAP 12' }],
    ['For Time · Cap 15', { mode: 'stopwatch', capSec: 900, title: '' }],
    ['EMOM 10', { mode: 'emom', emomIntervalSec: 60, emomRounds: 10, title: '' }],
    ['Tabata', { mode: 'interval', rounds: 8, workSec: 20, restSec: 10, sets: 1, skipLastRest: true, title: '' }],
    ['40/20 × 3 Sätze', { mode: 'interval', rounds: 5, workSec: 40, restSec: 20, sets: 3, setRestSec: 60, skipLastRest: true, title: '' }],
    ['Stoppuhr', { mode: 'stopwatch', capSec: 0, title: 'Stoppuhr' }],
    ['2m + 30 + 1:00', { mode: 'sequence', sequence: '2m + 30 + 1:00', title: '' }],
    ['Pause 5:00', { mode: 'countdown', durationSec: 300, title: 'Pause', prepSec: 0 }]
  ];

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  var SAFE_KEY = /^[A-Za-z0-9_-]{1,40}$/;
  function safeKey(k) { return SAFE_KEY.test(k) && k !== '__proto__' && k !== 'constructor' && k !== 'prototype'; }

  /** Legt "given" typsicher über "base" (für Laden, Import, Migration). */
  function mergeTyped(base, given) {
    if (!isObj(base)) {
      if (typeof given === typeof base && (typeof given !== 'number' || isFinite(given))) return given;
      if (base === null && (given === null || typeof given === 'string')) return given;
      return base;
    }
    var out = {};
    for (var k in base) out[k] = isObj(given) && k in given ? mergeTyped(base[k], given[k]) : clone(base[k]);
    return out;
  }

  /** Bringt beliebige (auch alte oder importierte) Daten in die aktuelle Form. */
  function normalize(input) {
    var d = defaults();
    if (!isObj(input)) return d;
    var s = {
      version: VERSION,
      global: mergeTyped(d.global, input.global),
      zones: {},
      elements: {},
      timer: {
        config: mergeTyped(d.timer.config, input.timer && input.timer.config),
        run: normalizeRun(input.timer && input.timer.run),
        style: mergeTyped(d.timer.style, input.timer && input.timer.style),
        labels: mergeTyped(d.timer.labels, input.timer && input.timer.labels),
        sound: mergeTyped(d.timer.sound, input.timer && input.timer.sound)
      },
      scenes: [],
      activeSceneId: typeof input.activeSceneId === 'string' ? input.activeSceneId : null
    };
    ZONES.forEach(function (z) { s.zones[z] = mergeTyped(d.zones[z], input.zones && input.zones[z]); });
    s.elements = normalizeElements(d.elements, input.elements);
    if (Array.isArray(input.scenes)) {
      input.scenes.slice(0, MAX_SCENES).forEach(function (sc) {
        if (isObj(sc) && typeof sc.id === 'string' && safeKey(sc.id) && isObj(sc.data)) {
          s.scenes.push({ id: sc.id, name: String(sc.name || 'Szene').slice(0, 60), savedAt: Number(sc.savedAt) || 0, data: sc.data });
        }
      });
    }
    return s;
  }

  function normalizeElements(defs, given) {
    var out = {};
    for (var id in defs) out[id] = mergeTyped(defs[id], given && given[id]);
    // Zusätzliche Elemente (spätere Erweiterungen) übernehmen, wenn der Typ bekannt ist
    if (isObj(given)) {
      for (var gid in given) {
        if (out[gid] || !safeKey(gid)) continue;
        var g = given[gid];
        if (isObj(g) && ELEMENT_TYPES.indexOf(g.type) >= 0) out[gid] = clone(g);
      }
    }
    for (var k in out) {
      if (ZONES.indexOf(out[k].zone) < 0) out[k].zone = 'left';
    }
    return out;
  }

  function normalizeRun(run) {
    if (!isObj(run) || ['idle', 'running', 'paused'].indexOf(run.status) < 0) return T.idleRun();
    var num = function (v) { return typeof v === 'number' && isFinite(v) ? v : null; };
    var r = { status: run.status, startedAt: num(run.startedAt), pausedAt: num(run.pausedAt), pausedMs: num(run.pausedMs) || 0 };
    if (r.status !== 'idle' && r.startedAt === null) return T.idleRun();
    if (r.status === 'paused' && r.pausedAt === null) return T.idleRun();
    return r;
  }

  function getIn(obj, parts) {
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!isObj(cur) || !(parts[i] in cur)) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /** Unveränderlich setzen: kopiert nur die Objekte entlang des Pfads. */
  function setIn(obj, parts, value) {
    if (!parts.length) return value;
    var copy = {};
    for (var k in obj) copy[k] = obj[k];
    copy[parts[0]] = setIn(isObj(obj[parts[0]]) ? obj[parts[0]] : {}, parts.slice(1), value);
    return copy;
  }

  var NUMBER_LIMITS = {
    size: [8, 2000], width: [120, 1920], mx: [-1920, 1920], my: [-1080, 1080], scale: [30, 300],
    opacity: [0, 100], radius: [0, 200], padding: [0, 200], animMs: [0, 3000], weight: [100, 900],
    order: [-100, 100], dim: [0, 90], warnSec: [0, 3600], alertSec: [0, 3600], volume: [0, 100]
  };

  /** Prüft einen einzelnen Schreibzugriff. Gibt den bereinigten Wert oder undefined zurück. */
  function validateSet(state, path, value) {
    if (typeof path !== 'string') return undefined;
    var parts = path.split('.');
    if (parts.length < 2 || !parts.every(safeKey)) return undefined;
    var head = parts[0];
    if (['global', 'zones', 'elements', 'timer'].indexOf(head) < 0) return undefined;
    if (head === 'timer' && ['style', 'labels', 'sound'].indexOf(parts[1]) < 0) return undefined;
    if (head === 'zones' && ZONES.indexOf(parts[1]) < 0) return undefined;

    var reference = getIn(defaults(), parts);
    if (reference === undefined) reference = getIn(state, parts);
    if (reference === undefined || isObj(reference)) return undefined;

    var key = parts[parts.length - 1];
    if (typeof reference === 'number') {
      if (typeof value === 'string' && value.trim() !== '') value = Number(value);
      if (typeof value !== 'number' || !isFinite(value)) return undefined;
      var lim = NUMBER_LIMITS[key];
      if (lim) value = Math.min(lim[1], Math.max(lim[0], value));
      return value;
    }
    if (typeof reference === 'boolean') return typeof value === 'boolean' ? value : undefined;
    if (typeof reference === 'string' || reference === null) {
      if (typeof value !== 'string') return undefined;
      if (key === 'src') {
        if (value.length > MAX_IMAGE) return undefined;
        if (value && !/^(data:image\/(png|jpeg|webp|gif|svg\+xml);base64,|assets\/|https?:\/\/)/i.test(value)) return undefined;
        return value;
      }
      if (key === 'zone' && ZONES.indexOf(value) < 0) return undefined;
      if (key === 'font' && !FONTS[value]) return undefined;
      return value.slice(0, MAX_TEXT);
    }
    return undefined;
  }

  function sceneData(state) {
    return clone({ global: state.global, zones: state.zones, elements: state.elements, timer: { config: state.timer.config, style: state.timer.style, labels: state.timer.labels, sound: state.timer.sound } });
  }

  /** Übernimmt Szenen-/Importdaten; der Timer läuft weiter, wenn sich das Programm nicht ändert. */
  function applyData(state, data) {
    var merged = normalize({ global: data.global, zones: data.zones, elements: data.elements, timer: { config: data.timer && data.timer.config, style: data.timer && data.timer.style, labels: data.timer && data.timer.labels, sound: data.timer && data.timer.sound, run: state.timer.run } });
    var sameProgram = JSON.stringify(withoutCosmetics(merged.timer.config)) === JSON.stringify(withoutCosmetics(state.timer.config));
    merged.timer.run = sameProgram ? state.timer.run : T.idleRun();
    merged.scenes = state.scenes;
    merged.activeSceneId = state.activeSceneId;
    return merged;
  }

  function withoutCosmetics(cfg) {
    var c = clone(cfg);
    delete c.title;
    delete c.direction;
    return c;
  }

  /** Setzt die Gestaltung zurück, behält aber Texte, Logo und Szenen. */
  function layoutFrom(state, presetId) {
    var d = defaults();
    var preset = PRESETS[presetId] || PRESETS.broadcast;
    preset.apply(d);
    for (var id in state.elements) {
      if (!d.elements[id]) { d.elements[id] = clone(state.elements[id]); continue; }
      CONTENT_KEYS.forEach(function (k) {
        if (k in state.elements[id] && k in d.elements[id]) d.elements[id][k] = state.elements[id][k];
      });
    }
    d.timer.config = clone(state.timer.config);
    d.timer.run = state.timer.run;
    d.timer.labels = clone(state.timer.labels);
    d.timer.sound = clone(state.timer.sound);
    d.scenes = state.scenes;
    d.activeSceneId = null;
    return d;
  }

  function newId(now) {
    return 's' + Math.floor(now).toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ---------------------------------------------------------------------------
  // Reducer
  // ---------------------------------------------------------------------------

  /**
   * Führt eine Aktion aus und gibt den neuen Zustand zurück
   * (oder denselben, wenn die Aktion ungültig war).
   */
  function reduce(state, action, now) {
    if (!isObj(action)) return state;
    switch (action.type) {
      case 'set': {
        var v = validateSet(state, action.path, action.value);
        return v === undefined ? state : setIn(state, action.path.split('.'), v);
      }
      case 'setMany': {
        if (!Array.isArray(action.entries)) return state;
        var s = state;
        action.entries.slice(0, 200).forEach(function (en) {
          if (!Array.isArray(en)) return;
          var val = validateSet(s, en[0], en[1]);
          if (val !== undefined) s = setIn(s, en[0].split('.'), val);
        });
        return s;
      }
      case 'timer': {
        var program = T.buildProgram(state.timer.config);
        var run = T.command(program, state.timer.run, action.cmd, now);
        if (run === state.timer.run) return state;
        return setIn(state, ['timer', 'run'], run);
      }
      case 'timerConfig': {
        if (!isObj(action.config)) return state;
        var cfg = mergeTyped(state.timer.config, action.config);
        if (T.MODES[cfg.mode] === undefined) cfg.mode = state.timer.config.mode;
        if (['auto', 'up', 'down'].indexOf(cfg.direction) < 0) cfg.direction = 'auto';
        cfg.title = String(cfg.title || '').slice(0, 80);
        cfg.sequence = String(cfg.sequence || '').slice(0, 2000);
        var keepRun = JSON.stringify(withoutCosmetics(cfg)) === JSON.stringify(withoutCosmetics(state.timer.config));
        var t = {};
        for (var tk in state.timer) t[tk] = state.timer[tk];
        t.config = cfg;
        t.run = keepRun ? state.timer.run : T.idleRun();
        return setIn(state, ['timer'], t);
      }
      case 'sceneSave': {
        var name = String(action.name || '').trim().slice(0, 60) || 'Szene ' + (state.scenes.length + 1);
        var scenes = state.scenes.slice();
        var idx = -1;
        if (typeof action.id === 'string') scenes.forEach(function (sc, i) { if (sc.id === action.id) idx = i; });
        var entry = { id: idx >= 0 ? scenes[idx].id : newId(now), name: name, savedAt: now, data: sceneData(state) };
        if (idx >= 0) scenes[idx] = entry;
        else if (scenes.length < MAX_SCENES) scenes.push(entry);
        else return state;
        var next = setIn(state, ['scenes'], scenes);
        return setIn(next, ['activeSceneId'], entry.id);
      }
      case 'sceneLoad': {
        var scene = null;
        state.scenes.forEach(function (sc) { if (sc.id === action.id) scene = sc; });
        if (!scene) return state;
        var loaded = applyData(state, scene.data);
        loaded.activeSceneId = scene.id;
        return loaded;
      }
      case 'sceneDelete': {
        var rest = state.scenes.filter(function (sc) { return sc.id !== action.id; });
        if (rest.length === state.scenes.length) return state;
        var after = setIn(state, ['scenes'], rest);
        return state.activeSceneId === action.id ? setIn(after, ['activeSceneId'], null) : after;
      }
      case 'sceneRename': {
        var renamed = false;
        var list = state.scenes.map(function (sc) {
          if (sc.id !== action.id) return sc;
          renamed = true;
          return { id: sc.id, name: String(action.name || sc.name).trim().slice(0, 60) || sc.name, savedAt: sc.savedAt, data: sc.data };
        });
        return renamed ? setIn(state, ['scenes'], list) : state;
      }
      case 'sceneImport': {
        if (!Array.isArray(action.scenes)) return state;
        var merged = state.scenes.slice();
        action.scenes.forEach(function (sc) {
          if (merged.length >= MAX_SCENES || !isObj(sc) || !isObj(sc.data)) return;
          merged.push({ id: newId(now + merged.length), name: String(sc.name || 'Importierte Szene').slice(0, 60), savedAt: now, data: sceneData(normalize(sc.data)) });
        });
        return setIn(state, ['scenes'], merged);
      }
      case 'preset':
        if (!PRESETS[action.id]) return state;
        return layoutFrom(state, action.id);
      case 'resetLayout':
        return layoutFrom(state, 'broadcast');
      case 'resetAll': {
        var fresh = defaults();
        fresh.scenes = state.scenes;
        return fresh;
      }
      case 'replace': {
        var replaced = normalize(action.state);
        if (!action.keepScenes) return replaced;
        replaced.scenes = state.scenes;
        return replaced;
      }
      default:
        return state;
    }
  }

  /** Elemente einer Zone in Anzeigereihenfolge. */
  function zoneElements(state, zone) {
    var list = [];
    for (var id in state.elements) {
      if (state.elements[id].zone === zone) list.push({ id: id, el: state.elements[id] });
    }
    list.sort(function (a, b) { return (a.el.order || 0) - (b.el.order || 0); });
    return list;
  }

  return {
    VERSION: VERSION,
    ZONES: ZONES,
    FONTS: FONTS,
    PRESETS: PRESETS,
    TIMER_PRESETS: TIMER_PRESETS,
    ELEMENT_TYPES: ELEMENT_TYPES,
    defaults: defaults,
    normalize: normalize,
    reduce: reduce,
    validateSet: validateSet,
    sceneData: sceneData,
    zoneElements: zoneElements,
    getIn: getIn,
    clone: clone
  };
});
