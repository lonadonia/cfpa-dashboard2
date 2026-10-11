/*
 * Tastaturkürzel – gemeinsam für Bedienoberfläche und Overlay
 * (im Overlay z. B. im Kamera-Modus oder über "Interagieren" in OBS).
 */
(function (root) {
  'use strict';

  var LIST = [
    [['Leertaste'], 'Start / Pause / Fortsetzen'],
    [['R', 'R'], 'Timer zurücksetzen (zweimal drücken)'],
    [['←', '→'], 'Intervall zurück / vor'],
    [['1', '…', '9'], 'Gespeicherte Szene 1–9 laden'],
    [['Umschalt', '1', '2', '3'], 'Zone links / Mitte / rechts ein- oder ausblenden'],
    [['H'], 'Gesamtes Overlay ein- oder ausblenden'],
    [['?'], 'Diese Hilfe anzeigen']
  ];

  function isTyping(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  /**
   * bind({ getState, dispatch, notify(msg), onHelp() })
   */
  function bind(opts) {
    var resetArmedUntil = 0;
    var ZONE_KEYS = { Digit1: 'left', Digit2: 'center', Digit3: 'right' };

    function onKey(ev) {
      if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey || isTyping(ev.target)) return;
      var state = opts.getState();
      if (!state) return;
      var code = ev.code;

      if (code === 'Space') {
        ev.preventDefault();
        opts.dispatch({ type: 'timer', cmd: 'toggle' });
      } else if (code === 'KeyR') {
        var now = Date.now();
        if (now < resetArmedUntil) {
          resetArmedUntil = 0;
          opts.dispatch({ type: 'timer', cmd: 'reset' });
          opts.notify && opts.notify('Timer zurückgesetzt');
        } else {
          resetArmedUntil = now + 1500;
          opts.notify && opts.notify('Nochmal R drücken, um den Timer zurückzusetzen');
        }
      } else if (code === 'ArrowRight' || code === 'ArrowLeft') {
        ev.preventDefault();
        opts.dispatch({ type: 'timer', cmd: code === 'ArrowRight' ? 'next' : 'prev' });
      } else if (ev.shiftKey && ZONE_KEYS[code]) {
        var zone = ZONE_KEYS[code];
        opts.dispatch({ type: 'set', path: 'zones.' + zone + '.visible', value: !state.zones[zone].visible });
      } else if (!ev.shiftKey && /^Digit[1-9]$/.test(code)) {
        var scene = state.scenes[Number(code.slice(5)) - 1];
        if (scene) {
          opts.dispatch({ type: 'sceneLoad', id: scene.id });
          opts.notify && opts.notify('Szene „' + scene.name + '“ geladen');
        } else if (opts.notify) {
          opts.notify('Keine Szene auf Taste ' + code.slice(5));
        }
      } else if (code === 'KeyH') {
        opts.dispatch({ type: 'set', path: 'global.visible', value: !state.global.visible });
      } else if (ev.key === '?' && opts.onHelp) {
        opts.onHelp();
      }
    }

    document.addEventListener('keydown', onKey);
    return function unbind() { document.removeEventListener('keydown', onKey); };
  }

  root.CFO = root.CFO || {};
  root.CFO.shortcuts = { bind: bind, LIST: LIST };
})(self);
