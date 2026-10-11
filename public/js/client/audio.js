/*
 * Signaltöne – per Web Audio API erzeugt, daher keine Audiodateien und
 * keine Lizenzfragen. Der CueTracker erkennt aus den Timer-Momentaufnahmen,
 * wann ein Ton fällig ist (3-2-1, Start Arbeit, Start Pause, Ende).
 */
(function (root) {
  'use strict';

  var ctx = null;
  var volume = 0.8;

  function context() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function unlock() {
    var c = context();
    if (c && c.state === 'suspended') c.resume();
    return c;
  }

  function isLocked() {
    var c = context();
    return !c || c.state !== 'running';
  }

  function tone(freq, start, dur, type, gainValue) {
    var c = context();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var peak = Math.max(0.0001, (gainValue || 0.6) * volume);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.setValueAtTime(peak, start + Math.max(0.02, dur - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  var SOUNDS = {
    tick: function (t) { tone(880, t, 0.14, 'square', 0.35); },
    go: function (t) { tone(1320, t, 0.55, 'square', 0.4); tone(660, t, 0.55, 'sine', 0.3); },
    rest: function (t) { tone(520, t, 0.22, 'triangle', 0.6); tone(390, t + 0.24, 0.32, 'triangle', 0.6); },
    done: function (t) {
      // Hupe wie bei Wettkampf-Timern
      tone(220, t, 1.1, 'sawtooth', 0.32);
      tone(330, t, 1.1, 'square', 0.18);
      tone(440, t, 1.1, 'sine', 0.3);
    }
  };

  function play(name, vol) {
    if (typeof vol === 'number') volume = Math.max(0, Math.min(1, vol));
    var c = unlock();
    if (!c || !SOUNDS[name]) return;
    SOUNDS[name](c.currentTime + 0.01);
  }

  /**
   * Erzeugt einen Tracker, der für jede Momentaufnahme entscheidet,
   * ob ein Ton fällig ist. Beim ersten Aufruf wird nur der Ausgangszustand
   * gemerkt (kein Ton nach Neuladen der Seite mitten im Workout).
   */
  function createCueTracker() {
    var last = null;
    return function (snap) {
      var cue = null;
      var key = {
        status: snap.status,
        seg: snap.segIndex,
        kind: snap.kind,
        remaining: snap.remainingSec
      };
      if (last && snap.status !== 'idle') {
        if (snap.status === 'done' && last.status !== 'done') {
          cue = 'done';
        } else if (snap.status === 'running' && last.status === 'idle') {
          cue = snap.kind === 'prep' ? null : 'go'; // Start (ohne Vorlauf sofort Startsignal)
        } else if (snap.status === 'running' && key.seg !== last.seg) {
          cue = key.kind === 'rest' ? 'rest' : 'go';
        } else if (snap.status === 'running' && last.status === 'running' && key.remaining !== last.remaining && key.remaining >= 1 && key.remaining <= 3) {
          cue = 'tick';
        }
      }
      last = key;
      return cue;
    };
  }

  root.CFO = root.CFO || {};
  root.CFO.audio = { play: play, unlock: unlock, isLocked: isLocked, createCueTracker: createCueTracker };
})(self);
