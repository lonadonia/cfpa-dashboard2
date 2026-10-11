/*
 * Overlay-Renderer: baut aus dem Zustand die 1920×1080-Bühne mit den drei
 * Zonen. Wird vom Overlay (overlay.html) UND von der Live-Vorschau der
 * Bedienoberfläche verwendet – beide zeigen daher exakt dasselbe Bild.
 *
 * Wichtig für Sicherheit: Nutzertexte werden ausschließlich über textContent
 * eingefügt, Farben/Größen über style-Eigenschaften (kein innerHTML mit Daten).
 */
(function (root) {
  'use strict';
  var T = root.CFO.timer;
  var S = root.CFO.state;

  var STAGE_W = 1920;
  var STAGE_H = 1080;
  var ALIGNS = ['left', 'center', 'right'];
  var MAX_PIPS = 40;

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function setText(node, text) {
    text = text == null ? '' : String(text);
    if (node.textContent !== text) node.textContent = text;
  }

  function setStyle(node, prop, value) {
    value = value == null ? '' : String(value);
    if (node.style.getPropertyValue(prop) !== value) node.style.setProperty(prop, value);
  }

  function toggle(node, cls, on) {
    if (node.classList.contains(cls) !== !!on) node.classList.toggle(cls, !!on);
  }

  function fontCss(id) { return (S.FONTS[id] || S.FONTS.inter).css; }

  function rgba(hex, opacityPct) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    var a = Math.max(0, Math.min(100, Number(opacityPct))) / 100;
    if (!m) return 'rgba(17,18,20,' + a + ')';
    var x = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return 'rgba(' + parseInt(x.slice(0, 2), 16) + ',' + parseInt(x.slice(2, 4), 16) + ',' + parseInt(x.slice(4, 6), 16) + ',' + a + ')';
  }

  function applyTextStyle(node, st, zoneAlign) {
    st = st || {};
    setStyle(node, 'font-family', fontCss(st.font));
    setStyle(node, 'font-size', (Number(st.size) || 24) + 'px');
    setStyle(node, 'color', st.color || '#ffffff');
    setStyle(node, 'font-weight', String(Number(st.weight) || 400));
    setStyle(node, 'text-transform', st.upper ? 'uppercase' : 'none');
    setStyle(node, 'text-align', ALIGNS.indexOf(st.align) >= 0 ? st.align : zoneAlign);
  }

  // ---------------------------------------------------------------------------
  // Ziffernbreite messen, damit der Timer beim Zählen nicht "springt"
  // ---------------------------------------------------------------------------

  var measureCanvas = null;
  function measureDigits(fontId, weight) {
    measureCanvas = measureCanvas || document.createElement('canvas');
    var g = measureCanvas.getContext('2d');
    g.font = weight + ' 100px ' + fontCss(fontId);
    var max = 0;
    for (var i = 0; i < 10; i++) max = Math.max(max, g.measureText(String(i)).width);
    return { dw: Math.max(0.4, max / 100 + 0.02), cw: Math.max(0.2, g.measureText(':').width / 100 + 0.04) };
  }

  // ---------------------------------------------------------------------------
  // Elemente
  // ---------------------------------------------------------------------------

  var builders = {
    logo: {
      build: function (inner) {
        var img = h('img', 'cfo-logo');
        img.alt = 'Logo';
        img.decoding = 'async';
        inner.appendChild(img);
        return { img: img };
      },
      update: function (ref, el, ctx) {
        var src = el.src || '';
        if (ref.img.getAttribute('src') !== src) {
          if (src) ref.img.setAttribute('src', src);
          else ref.img.removeAttribute('src');
        }
        setStyle(ref.img, 'width', (Number(el.size) || 150) + 'px');
        ref.img.setAttribute('data-shape', ['circle', 'rounded'].indexOf(el.shape) >= 0 ? el.shape : 'none');
        setStyle(ref.inner, 'text-align', ALIGNS.indexOf(el.align) >= 0 ? el.align : ctx.align);
        return !!src;
      }
    },

    text: {
      build: function (inner) {
        var n = h('div', 'cfo-text');
        inner.appendChild(n);
        return { n: n };
      },
      update: function (ref, el, ctx) {
        setText(ref.n, el.text);
        applyTextStyle(ref.n, el.style, ctx.align);
        return !!String(el.text || '').trim();
      }
    },

    rich: {
      build: function (inner) {
        var n = h('div', 'cfo-rich');
        inner.appendChild(n);
        return { n: n, last: null };
      },
      update: function (ref, el, ctx) {
        applyTextStyle(ref.n, el.style, ctx.align);
        if (ref.last !== el.text) {
          ref.last = el.text;
          renderRich(ref.n, String(el.text || ''));
        }
        return !!String(el.text || '').trim();
      }
    },

    labeled: {
      build: function (inner) {
        var n = h('div', 'cfo-labeled');
        var label = h('span', 'cfo-labeled__label');
        var value = h('span', 'cfo-labeled__value');
        n.appendChild(label);
        n.appendChild(value);
        inner.appendChild(n);
        return { n: n, label: label, value: value };
      },
      update: function (ref, el, ctx) {
        applyTextStyle(ref.n, el.style, ctx.align);
        setText(ref.label, el.label);
        toggle(ref.label, 'is-empty', !String(el.label || '').trim());
        setText(ref.value, el.text);
        var a = ALIGNS.indexOf(el.style && el.style.align) >= 0 ? el.style.align : ctx.align;
        setStyle(ref.n, 'justify-content', a === 'center' ? 'center' : a === 'right' ? 'flex-end' : 'flex-start');
        return !!String(el.text || '').trim() || !!String(el.label || '').trim();
      }
    },

    clock: {
      build: function (inner) {
        var n = h('div', 'cfo-clock');
        var label = h('span', 'cfo-clock__label');
        label.appendChild(h('i', 'cfo-clock__dot'));
        var labelText = h('span', 'cfo-clock__label-text');
        label.appendChild(labelText);
        var time = h('span', 'cfo-clock__time');
        var date = h('span', 'cfo-clock__date');
        n.appendChild(label);
        n.appendChild(time);
        n.appendChild(date);
        inner.appendChild(n);
        return { n: n, label: label, labelText: labelText, time: time, date: date, el: null };
      },
      update: function (ref, el, ctx) {
        ref.el = el;
        applyTextStyle(ref.n, el.style, ctx.align);
        setText(ref.labelText, el.label);
        toggle(ref.label, 'is-empty', !String(el.label || '').trim());
        toggle(ref.date, 'is-empty', !el.date);
        var a = ALIGNS.indexOf(el.style && el.style.align) >= 0 ? el.style.align : ctx.align;
        setStyle(ref.n, 'justify-content', a === 'center' ? 'center' : a === 'right' ? 'flex-end' : 'flex-start');
        tickClock(ref, new Date());
        return true;
      }
    },

    timer: {
      build: function (inner) {
        var n = h('div', 'cfo-timer');
        var title = h('div', 'cfo-timer__title');
        var face = h('div', 'cfo-timer__face');
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'cfo-timer__ring');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('aria-hidden', 'true');
        var track = document.createElementNS(svgNS, 'circle');
        track.setAttribute('class', 'cfo-timer__ring-track');
        var arc = document.createElementNS(svgNS, 'circle');
        arc.setAttribute('class', 'cfo-timer__ring-arc');
        [track, arc].forEach(function (c) { c.setAttribute('cx', '50'); c.setAttribute('cy', '50'); c.setAttribute('r', '46'); svg.appendChild(c); });
        var digits = h('div', 'cfo-timer__digits');
        face.appendChild(svg);
        face.appendChild(digits);
        var bar = h('div', 'cfo-timer__bar');
        var barFill = h('i', 'cfo-timer__bar-fill');
        bar.appendChild(barFill);
        var meta = h('div', 'cfo-timer__meta');
        var phase = h('span', 'cfo-timer__phase');
        var round = h('span', 'cfo-timer__round');
        meta.appendChild(phase);
        meta.appendChild(round);
        var pips = h('div', 'cfo-timer__pips');
        n.appendChild(title);
        n.appendChild(face);
        n.appendChild(bar);
        n.appendChild(meta);
        n.appendChild(pips);
        inner.appendChild(n);
        return { n: n, title: title, face: face, arc: arc, digits: digits, bar: bar, barFill: barFill, meta: meta, phase: phase, round: round, pips: pips, text: null, pipKey: null, metrics: null, fontKey: null };
      },
      update: function (ref, el, ctx) {
        var st = ctx.state.timer.style;
        var fontKey = st.font + '|' + st.weight;
        if (ref.fontKey !== fontKey) {
          ref.fontKey = fontKey;
          ref.metrics = measureDigits(st.font, st.weight);
          applyMetrics(ref);
          var fam = (S.FONTS[st.font] || S.FONTS.inter).css.split(',')[0];
          if (document.fonts && document.fonts.load) {
            document.fonts.load(st.weight + ' 100px ' + fam).then(function () {
              if (ref.fontKey !== fontKey) return;
              ref.metrics = measureDigits(st.font, st.weight);
              applyMetrics(ref);
              ref.text = null;
            }).catch(function () {});
          }
        }
        setStyle(ref.n, '--timer-size', (Number(st.size) || 190) + 'px');
        setStyle(ref.digits, 'font-family', fontCss(st.font));
        setStyle(ref.digits, 'font-weight', String(Number(st.weight) || 700));
        setStyle(ref.title, 'color', st.titleColor || '#ffffff');
        ref.n.setAttribute('data-progress', ['bar', 'ring', 'none'].indexOf(st.progress) >= 0 ? st.progress : 'bar');
        toggle(ref.title, 'is-off', !st.showTitle);
        ref.text = null; // erzwingt Neuzeichnen beim nächsten Tick
        return true;
      }
    }
  };

  function applyMetrics(ref) {
    setStyle(ref.n, '--dw', ref.metrics.dw.toFixed(3) + 'em');
    setStyle(ref.n, '--cw', ref.metrics.cw.toFixed(3) + 'em');
  }

  /** WOD-Text: "# Überschrift", "- Aufzählung", "**fett**", Leerzeile = Abstand. */
  function renderRich(container, text) {
    while (container.firstChild) container.removeChild(container.firstChild);
    text.split(/\r?\n/).forEach(function (line) {
      var trimmed = line.trim();
      var node;
      if (!trimmed) {
        node = h('div', 'cfo-rich__gap');
      } else if (/^#{1,3}\s+/.test(trimmed)) {
        node = h('div', 'cfo-rich__h');
        inline(node, trimmed.replace(/^#{1,3}\s+/, ''));
      } else if (/^[-*•–]\s+/.test(trimmed)) {
        node = h('div', 'cfo-rich__li');
        inline(node, trimmed.replace(/^[-*•–]\s+/, ''));
      } else {
        node = h('div', 'cfo-rich__p');
        inline(node, trimmed);
      }
      container.appendChild(node);
    });
  }

  function inline(node, text) {
    text.split('**').forEach(function (part, i) {
      if (!part) return;
      node.appendChild(i % 2 ? h('strong', null, part) : document.createTextNode(part));
    });
  }

  var WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function tickClock(ref, d) {
    var el = ref.el;
    if (!el) return;
    var p2 = function (n) { return n < 10 ? '0' + n : String(n); };
    var t = p2(d.getHours()) + ':' + p2(d.getMinutes()) + (el.seconds ? ':' + p2(d.getSeconds()) : '');
    setText(ref.time, t);
    if (el.date) setText(ref.date, WEEKDAYS[d.getDay()] + ' ' + p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.');
  }

  // ---------------------------------------------------------------------------
  // Timer pro Frame aktualisieren
  // ---------------------------------------------------------------------------

  function timerColor(st, snap) {
    if (snap.status === 'done') return st.colorAlert;
    if (snap.kind === 'prep') return st.colorPrep;
    if (snap.status === 'idle') return st.colorBase;
    var shift = st.colorShift && snap.remainingSec !== Infinity;
    if (snap.kind === 'rest') {
      return shift && snap.remainingSec <= st.alertSec ? st.colorAlert : st.colorRest;
    }
    if (shift) {
      if (snap.remainingSec <= st.alertSec) return st.colorAlert;
      if (snap.remainingSec <= st.warnSec) return st.colorWarn;
      return st.colorOk;
    }
    return st.colorBase;
  }

  function setDigits(ref, text) {
    if (ref.text === text) return;
    var nodes = ref.digits.childNodes;
    if (!ref.text || ref.text.length !== text.length) {
      while (ref.digits.firstChild) ref.digits.removeChild(ref.digits.firstChild);
      for (var i = 0; i < text.length; i++) ref.digits.appendChild(h('span', /[0-9]/.test(text[i]) ? 'd' : 'c', text[i]));
      // Ringgröße an Zeichenanzahl anpassen
      var digitsCount = text.replace(/[^0-9]/g, '').length;
      var sepCount = text.length - digitsCount;
      var widthEm = digitsCount * ref.metrics.dw + sepCount * ref.metrics.cw;
      setStyle(ref.n, '--ring-d', (widthEm + 0.75).toFixed(3) + 'em');
    } else {
      for (var j = 0; j < text.length; j++) {
        if (ref.text[j] !== text[j]) {
          nodes[j].textContent = text[j];
          nodes[j].className = /[0-9]/.test(text[j]) ? 'd' : 'c';
        }
      }
    }
    ref.text = text;
  }

  function roundText(labels, program, snap, cfg) {
    var seg = snap.segment;
    if (seg.kind === 'prep') return '';
    switch (program.mode) {
      case 'stopwatch':
        return program.openEnded ? '' : labels.cap + ' ' + T.formatClock(seg.sec);
      case 'emom':
        return labels.round + ' ' + seg.round + ' / ' + seg.rounds;
      case 'interval':
        if (seg.sets > 1) return labels.set + ' ' + seg.set + '/' + seg.sets + ' · ' + labels.round + ' ' + seg.roundInSet + '/' + seg.roundsPerSet;
        return labels.round + ' ' + seg.round + ' / ' + seg.rounds;
      case 'sequence':
        return seg.rounds > 1 ? labels.interval + ' ' + seg.round + ' / ' + seg.rounds : '';
      default:
        return cfg && cfg.capLabel ? cfg.capLabel : '';
    }
  }

  function phaseText(labels, program, snap) {
    if (snap.status === 'done') return program.mode === 'stopwatch' ? labels.cap : labels.done;
    if (snap.status === 'paused') return labels.paused;
    if (snap.kind === 'prep') return labels.prep;
    var hasRest = program.segments.some(function (s) { return s.kind === 'rest'; });
    if (!hasRest) return '';
    return snap.kind === 'rest' ? (snap.segment.setBreak ? labels.rest + ' · ' + labels.set : labels.rest) : labels.work;
  }

  function tickTimer(ref, ctx, now) {
    var state = ctx.state;
    var st = state.timer.style;
    var labels = state.timer.labels;
    var program = ctx.program;
    var snap = T.snapshot(program, state.timer.run, now, state.timer.config.direction);

    var text = snap.kind === 'prep' && snap.status !== 'idle' ? String(snap.displaySec) : snap.display;
    setDigits(ref, text);

    var color = timerColor(st, snap);
    setStyle(ref.n, '--tc', color);
    ref.n.setAttribute('data-kind', snap.kind);
    ref.n.setAttribute('data-status', snap.status);

    var titleText = state.timer.config.title || T.autoTitle(state.timer.config);
    setText(ref.title, titleText);

    // Fortschritt (Balken = scaleX, Ring = Strichlänge)
    var prog = snap.status === 'idle' ? 0 : snap.progress;
    if (program.openEnded) prog = 0;
    var remainingShare = snap.direction === 'down' ? 1 - prog : prog;
    setStyle(ref.barFill, 'transform', 'scaleX(' + remainingShare.toFixed(4) + ')');
    toggle(ref.bar, 'is-off', program.openEnded);
    var circ = 2 * Math.PI * 46;
    setStyle(ref.arc, 'stroke-dasharray', circ.toFixed(2));
    setStyle(ref.arc, 'stroke-dashoffset', (circ * (1 - (snap.status === 'idle' ? 1 : remainingShare))).toFixed(2));

    var phase = st.showPhase ? phaseText(labels, program, snap) : '';
    var round = st.showRounds ? roundText(labels, program, snap) : '';
    setText(ref.phase, phase);
    setText(ref.round, round);
    toggle(ref.phase, 'is-empty', !phase);
    toggle(ref.round, 'is-empty', !round);
    toggle(ref.meta, 'is-empty', !phase && !round);

    // Rundenanzeige als "Hantelscheiben"-Punkte
    var showPips = st.showPips && program.workCount > 1 && program.workCount <= MAX_PIPS;
    var currentRound = snap.kind === 'prep' ? 0 : snap.segment.round;
    var pipKey = showPips ? program.workCount + '|' + currentRound + '|' + snap.kind + '|' + snap.status : 'off';
    if (ref.pipKey !== pipKey) {
      ref.pipKey = pipKey;
      while (ref.pips.firstChild) ref.pips.removeChild(ref.pips.firstChild);
      toggle(ref.pips, 'is-empty', !showPips);
      if (showPips) {
        for (var i = 1; i <= program.workCount; i++) {
          var pip = h('i');
          var done = snap.status === 'done' || i < currentRound || (i === currentRound && snap.kind === 'rest');
          if (done) pip.className = 'is-done';
          else if (i === currentRound && snap.status !== 'idle') pip.className = 'is-current';
          ref.pips.appendChild(pip);
        }
      }
    }
    return snap;
  }

  // ---------------------------------------------------------------------------
  // Bühne
  // ---------------------------------------------------------------------------

  function create(stage, options) {
    options = options || {};
    stage.classList.add('cfo-stage', 'cfo-stage--instant');
    var zones = {};
    var elements = {};
    var bgLayer = h('div', 'cfo-bg');
    var bgDim = h('div', 'cfo-bg__dim');
    bgLayer.appendChild(bgDim);
    stage.appendChild(bgLayer);
    var prep = h('div', 'cfo-prep');
    var prepNum = h('span', 'cfo-prep__num');
    prep.appendChild(prepNum);
    var ctx = { state: null, program: null };
    var lastSnap = null;
    var lastPrepText = null;
    var goTimer = null;

    S.ZONES.forEach(function (id) {
      var zone = h('section', 'cfo-zone');
      zone.setAttribute('data-zone', id);
      var inner = h('div', 'cfo-zone__inner');
      var panel = h('div', 'cfo-zone__panel');
      inner.appendChild(panel);
      zone.appendChild(inner);
      stage.appendChild(zone);
      zones[id] = { node: zone, inner: inner, panel: panel };
    });
    stage.appendChild(prep);

    function updateZone(id, z, global) {
      var ref = zones[id];
      var node = ref.node;
      var hz = ALIGNS.indexOf(z.h) >= 0 ? z.h : 'left';
      var vz = ['top', 'middle', 'bottom'].indexOf(z.v) >= 0 ? z.v : 'top';
      node.setAttribute('data-h', hz);
      node.setAttribute('data-v', vz);
      setStyle(node, 'width', z.width + 'px');
      setStyle(node, 'left', hz === 'left' ? z.mx + 'px' : hz === 'center' ? '50%' : 'auto');
      setStyle(node, 'right', hz === 'right' ? z.mx + 'px' : 'auto');
      setStyle(node, 'top', vz === 'top' ? z.my + 'px' : vz === 'middle' ? '50%' : 'auto');
      setStyle(node, 'bottom', vz === 'bottom' ? z.my + 'px' : 'auto');
      var tx = hz === 'center' ? 'calc(-50% + ' + z.mx + 'px)' : '0px';
      var ty = vz === 'middle' ? 'calc(-50% + ' + z.my + 'px)' : '0px';
      setStyle(node, 'transform', 'translate(' + tx + ', ' + ty + ') scale(' + (z.scale / 100) + ')');
      setStyle(node, 'transform-origin', (hz === 'center' ? 'center' : hz) + ' ' + (vz === 'middle' ? 'center' : vz));
      var align = ALIGNS.indexOf(z.align) >= 0 ? z.align : 'left';
      setStyle(node, 'text-align', align);
      node.setAttribute('data-align', align);
      toggle(node, 'is-hidden', !z.visible || !global.visible);

      var p = z.panel;
      var panel = ref.panel;
      toggle(panel, 'has-bg', p.show);
      toggle(panel, 'has-stripe', p.show && p.stripe);
      toggle(panel, 'has-cut', p.show && p.cut);
      toggle(panel, 'has-blur', p.show && p.blur);
      setStyle(panel, 'background-color', p.show ? rgba(p.color, p.opacity) : 'transparent');
      setStyle(panel, 'border-radius', p.show ? p.radius + 'px' : '0px');
      setStyle(panel, 'padding', p.padding + 'px');
    }

    function ensureElement(id, el) {
      var existing = elements[id];
      if (existing && existing.type === el.type) return existing;
      if (existing && existing.node.parentNode) existing.node.parentNode.removeChild(existing.node);
      var b = builders[el.type];
      if (!b) return null;
      var node = h('div', 'cfo-el');
      node.setAttribute('data-id', id);
      node.setAttribute('data-type', el.type);
      var inner = h('div', 'cfo-el__inner');
      node.appendChild(inner);
      var ref = b.build(inner);
      ref.node = node;
      ref.inner = inner;
      ref.type = el.type;
      elements[id] = ref;
      return ref;
    }

    function update(state) {
      ctx.state = state;
      ctx.program = T.buildProgram(state.timer.config);
      var g = state.global;
      stage.setAttribute('data-anim', ['slide', 'fade', 'zoom', 'none'].indexOf(g.animation) >= 0 ? g.animation : 'slide');
      setStyle(stage, '--accent', g.accent || '#E30613');
      setStyle(stage, '--anim-ms', (Number(g.animMs) || 0) + 'ms');
      toggle(stage, 'has-shadow', g.textShadow);

      // Hintergrundbild (optional, z. B. Kreidetafel wie in der Referenz)
      var bg = g.background || {};
      var bgSrc = bg.show && bg.src ? bg.src : '';
      if (bgLayer.getAttribute('data-src') !== bgSrc) {
        bgLayer.setAttribute('data-src', bgSrc);
        bgLayer.style.backgroundImage = bgSrc ? 'url("' + bgSrc.replace(/["\\\n]/g, '') + '")' : '';
      }
      toggle(bgLayer, 'is-on', !!bgSrc);
      setStyle(bgDim, 'opacity', String((Number(bg.dim) || 0) / 100));

      S.ZONES.forEach(function (zid) {
        var z = state.zones[zid];
        updateZone(zid, z, g);
        var list = S.zoneElements(state, zid);
        var panel = zones[zid].panel;
        var firstVisible = true;
        list.forEach(function (item, index) {
          var ref = ensureElement(item.id, item.el);
          if (!ref) return;
          var hasContent = builders[item.el.type].update(ref, item.el, { align: ALIGNS.indexOf(z.align) >= 0 ? z.align : 'left', state: state, program: ctx.program });
          var visible = item.el.visible && hasContent;
          toggle(ref.node, 'is-hidden', !visible);
          toggle(ref.node, 'is-first', visible && firstVisible);
          if (visible) firstVisible = false;
          if (panel.children[index] !== ref.node) panel.insertBefore(ref.node, panel.children[index] || null);
        });
        var visibleCount = list.filter(function (it) { return it.el.visible; }).length;
        toggle(zones[zid].node, 'is-empty', visibleCount === 0);
      });
      // Gelöschte Elemente entfernen
      Object.keys(elements).forEach(function (id) {
        if (!state.elements[id]) {
          var ref = elements[id];
          if (ref.node.parentNode) ref.node.parentNode.removeChild(ref.node);
          delete elements[id];
        }
      });

      if (stage.classList.contains('cfo-stage--instant')) {
        requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.remove('cfo-stage--instant'); }); });
      }
    }

    function tick(now) {
      if (!ctx.state) return null;
      var snap = null;
      var tref = elements.timer;
      if (tref && tref.type === 'timer') snap = tickTimer(tref, ctx, now);
      else snap = T.snapshot(ctx.program, ctx.state.timer.run, now, ctx.state.timer.config.direction);

      // Großer Vorlauf-Countdown in der Bildmitte
      var st = ctx.state.timer.style;
      var showPrep = st.prepFullscreen && snap.kind === 'prep' && (snap.status === 'running' || snap.status === 'paused') && ctx.state.global.visible;
      if (showPrep) {
        var t = String(snap.displaySec);
        if (t !== lastPrepText) {
          lastPrepText = t;
          prepNum.textContent = t;
          prep.classList.remove('is-pulse');
          void prep.offsetWidth; // Animation neu starten
          prep.classList.add('is-pulse');
        }
      } else {
        lastPrepText = null;
      }
      // "Los!" kurz einblenden, wenn der Vorlauf endet
      if (lastSnap && lastSnap.kind === 'prep' && lastSnap.status === 'running' && snap.kind !== 'prep' && snap.status === 'running' && st.prepFullscreen) {
        prepNum.textContent = ctx.state.timer.labels.go;
        prep.classList.add('is-go');
        clearTimeout(goTimer);
        goTimer = setTimeout(function () { prep.classList.remove('is-go'); }, 900);
      }
      toggle(prep, 'is-on', showPrep || prep.classList.contains('is-go'));
      toggle(stage, 'is-prep', showPrep);
      setStyle(prep, '--tc', st.colorPrep);
      lastSnap = snap;

      var cref = elements.clock;
      if (cref && cref.type === 'clock') tickClock(cref, new Date());
      return snap;
    }

    return {
      update: update,
      tick: tick,
      zoneNode: function (id) { return zones[id] && zones[id].node; },
      program: function () { return ctx.program; }
    };
  }

  /** Skaliert eine 1920×1080-Bühne passend in ihren Container. */
  function fit(stage, container, mode) {
    var w = container.clientWidth;
    var hgt = container.clientHeight;
    var scale = mode === 'width' ? w / STAGE_W : Math.min(w / STAGE_W, hgt / STAGE_H);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    var x = (w - STAGE_W * scale) / 2;
    var y = mode === 'width' ? 0 : (hgt - STAGE_H * scale) / 2;
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    return scale;
  }

  /** Textbeschreibung des Timers für Regie und Fernbedienung. */
  function describe(state, program, now) {
    var snap = T.snapshot(program, state.timer.run, now, state.timer.config.direction);
    var labels = state.timer.labels;
    var phase = phaseText(labels, program, snap);
    var round = roundText(labels, program, snap);
    return {
      snap: snap,
      time: snap.kind === 'prep' && snap.status !== 'idle' ? String(snap.displaySec) : snap.display,
      color: timerColor(state.timer.style, snap),
      title: state.timer.config.title || T.autoTitle(state.timer.config),
      phase: phase,
      round: round,
      line: [phase, round].filter(Boolean).join(' · ')
    };
  }

  root.CFO = root.CFO || {};
  root.CFO.render = { create: create, fit: fit, describe: describe, STAGE_W: STAGE_W, STAGE_H: STAGE_H };
})(self);
