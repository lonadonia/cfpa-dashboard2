/*
 * Smartphone-/Tablet-Fernbedienung (remote.html)
 * Große Touch-Flächen, Reset nur durch Gedrückthalten, Bildschirm bleibt an.
 */
(function () {
  'use strict';
  var CFO = window.CFO;
  var S = CFO.state;
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var state = null;
  var api = null;
  var program = null;
  CFO.icons.hydrate();

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }

  function buzz() { if (navigator.vibrate) navigator.vibrate(12); }

  function dispatch(a) { if (api) api.dispatch(a); }

  function confirmDialog(text) {
    var dlg = $('#dlg-confirm');
    $('#dlg-confirm-text').textContent = text;
    return new Promise(function (resolve) {
      if (typeof dlg.showModal !== 'function') { resolve(window.confirm(text)); return; }
      dlg.returnValue = '';
      dlg.addEventListener('close', function onClose() { dlg.removeEventListener('close', onClose); resolve(dlg.returnValue === 'ok'); });
      dlg.showModal();
    });
  }

  // Bildschirm nicht abdunkeln (nur in sicheren Kontexten verfügbar)
  var wakeLock = null;
  function keepAwake() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l;
      l.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') keepAwake(); });
  document.addEventListener('pointerdown', keepAwake, { once: true });

  // ---------------------------------------------------------------- Transport
  var toggleBtn = $('#r-toggle');
  toggleBtn.addEventListener('click', function () { buzz(); dispatch({ type: 'timer', cmd: 'toggle' }); });
  $$('[data-cmd]').forEach(function (b) {
    b.addEventListener('click', function () { buzz(); dispatch({ type: 'timer', cmd: b.getAttribute('data-cmd') }); });
  });

  var resetBtn = $('#r-reset');
  var holdTimer = null;
  function holdStart(ev) {
    ev.preventDefault();
    resetBtn.classList.add('is-holding');
    holdTimer = setTimeout(function () {
      resetBtn.classList.remove('is-holding');
      if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      dispatch({ type: 'timer', cmd: 'reset' });
      toast('Timer zurückgesetzt');
    }, 900);
  }
  function holdEnd() {
    clearTimeout(holdTimer);
    resetBtn.classList.remove('is-holding');
  }
  resetBtn.addEventListener('pointerdown', holdStart);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (e) { resetBtn.addEventListener(e, holdEnd); });
  resetBtn.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      confirmDialog('Timer zurücksetzen?').then(function (ok) { if (ok) dispatch({ type: 'timer', cmd: 'reset' }); });
    }
  });
  resetBtn.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

  // ---------------------------------------------------------------- Sichtbarkeit
  document.addEventListener('click', function (ev) {
    var chip = ev.target.closest('.chip[data-path]');
    if (chip && state) {
      buzz();
      var p = chip.getAttribute('data-path');
      dispatch({ type: 'set', path: p, value: !S.getIn(state, p.split('.')) });
    }
  });

  // ---------------------------------------------------------------- Schnellstart
  S.TIMER_PRESETS.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = p[0];
    b.addEventListener('click', function () {
      var go = function () { dispatch({ type: 'timerConfig', config: p[1] }); toast('Timer: ' + p[0]); };
      if (state && state.timer.run.status !== 'idle') confirmDialog('Timer läuft. „' + p[0] + '“ laden und zurücksetzen?').then(function (ok) { if (ok) go(); });
      else go();
    });
    $('#r-presets').appendChild(b);
    return i;
  });

  // ---------------------------------------------------------------- Texte
  var timers = {};
  $$('#r-edit [data-path]').forEach(function (el) {
    el.addEventListener('input', function () {
      var path = el.getAttribute('data-path');
      clearTimeout(timers[path]);
      timers[path] = setTimeout(function () { dispatch({ type: 'set', path: path, value: el.value }); }, 300);
    });
  });

  // ---------------------------------------------------------------- Darstellung
  var lastScenesKey = null;
  function renderScenes() {
    var key = JSON.stringify(state.scenes.map(function (s) { return [s.id, s.name]; })) + state.activeSceneId;
    if (key === lastScenesKey) return;
    lastScenesKey = key;
    var box = $('#r-scenes');
    while (box.firstChild) box.removeChild(box.firstChild);
    if (!state.scenes.length) {
      var p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Noch keine Szenen. Szenen werden in der Regie gespeichert.';
      box.appendChild(p);
      return;
    }
    state.scenes.forEach(function (sc, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'r-scene' + (sc.id === state.activeSceneId ? ' is-active' : '');
      var k = document.createElement('kbd');
      k.textContent = String(i + 1);
      b.appendChild(k);
      b.appendChild(document.createTextNode(sc.name));
      b.addEventListener('click', function () { buzz(); dispatch({ type: 'sceneLoad', id: sc.id }); toast('Szene „' + sc.name + '“'); });
      box.appendChild(b);
    });
  }

  function sync() {
    var active = document.activeElement;
    $$('[data-path]').forEach(function (el) {
      var val = S.getIn(state, el.getAttribute('data-path').split('.'));
      if (el.classList.contains('chip')) el.setAttribute('aria-pressed', val ? 'true' : 'false');
      else if (el !== active && el.value !== String(val == null ? '' : val)) el.value = val == null ? '' : val;
    });
  }

  var lastStatus = null;
  function loop() {
    if (state && api) {
      var d = CFO.render.describe(state, program, api.now());
      var time = $('#r-time');
      if (time.textContent !== d.time) time.textContent = d.time;
      time.style.setProperty('--tc', d.color);
      $('#r-title').textContent = d.title;
      $('#r-line').textContent = d.line || (d.snap.status === 'idle' ? 'Bereit' : '');
      if (d.snap.status !== lastStatus) {
        lastStatus = d.snap.status;
        var label = lastStatus === 'running' ? 'Pause' : lastStatus === 'paused' ? 'Weiter' : lastStatus === 'done' ? 'Neu starten' : 'Start';
        toggleBtn.setAttribute('data-state', lastStatus);
        while (toggleBtn.firstChild) toggleBtn.removeChild(toggleBtn.firstChild);
        toggleBtn.appendChild(CFO.icons.icon(lastStatus === 'running' ? 'pause' : 'play'));
        var s = document.createElement('span');
        s.textContent = label;
        toggleBtn.appendChild(s);
      }
    }
    requestAnimationFrame(loop);
  }

  function setStatus(st) {
    var el = $('#conn');
    if (st.mode === 'local') { el.setAttribute('data-state', 'local'); el.textContent = 'Testmodus'; }
    else if (st.connected) { el.setAttribute('data-state', 'ok'); el.textContent = 'Verbunden'; }
    else { el.setAttribute('data-state', 'error'); el.textContent = 'Getrennt …'; }
    if (st.error) toast(st.error);
  }

  CFO.sync.connect({
    onState: function (s) {
      state = s;
      program = CFO.timer.buildProgram(s.timer.config);
      sync();
      renderScenes();
    },
    onStatus: setStatus
  }).then(function (a) {
    api = a;
    requestAnimationFrame(loop);
  });
})();
