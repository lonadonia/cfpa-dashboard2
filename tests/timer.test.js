'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../public/js/core/timer.js');

const secs = (src) => T.parseSequence(src).map((s) => s.sec);
const kinds = (src) => T.parseSequence(src).map((s) => s.kind);

test('Zeitfolge: Beispiel aus der Ausschreibung "2m + 30 + 1:00"', () => {
  assert.deepEqual(secs('2m + 30 + 1:00'), [120, 30, 60]);
});

test('Zeitfolge: Wiederholungen, Klammern und Leerzeichen (Referenz-Syntax)', () => {
  assert.deepEqual(secs('4*1m'), [60, 60, 60, 60]);
  assert.deepEqual(secs('4 * (1m + 30)'), [60, 30, 60, 30, 60, 30, 60, 30]);
  assert.deepEqual(secs('8*(5m + 1m)').length, 16);
  assert.deepEqual(secs('3x45'), [45, 45, 45]);
  assert.deepEqual(secs('2*(2*(10+5))'), [10, 5, 10, 5, 10, 5, 10, 5]);
});

test('Zeitfolge: Einheiten und kombinierte Angaben', () => {
  assert.deepEqual(secs('1m30'), [90]);
  assert.deepEqual(secs('1m30s'), [90]);
  assert.deepEqual(secs('1.5m'), [90]);
  assert.deepEqual(secs('1h30'), [5400]);
  assert.deepEqual(secs('1:02:03'), [3723]);
  assert.deepEqual(secs('2 min, 30 sek'), [120, 30]);
});

test('Zeitfolge: Pausen-Markierung p / pause / r', () => {
  assert.deepEqual(kinds('8*(20 + 10p)').slice(0, 4), ['work', 'rest', 'work', 'rest']);
  assert.deepEqual(kinds('1mp + 30 pause + 1:00r + 45'), ['rest', 'rest', 'rest', 'work']);
  assert.deepEqual(kinds('(1m + 30)p'), ['rest', 'rest']);
});

test('Zeitfolge: verständliche Fehler', () => {
  assert.throws(() => T.parseSequence(''), /Zeitfolge/);
  assert.throws(() => T.parseSequence('4*(1m + 30'), /Klammer/);
  assert.throws(() => T.parseSequence('2m + abc'), /Unbekanntes Wort/);
  assert.throws(() => T.parseSequence('0'), /länger als 0/);
  assert.throws(() => T.parseSequence('1000*(1+1)'), /Zu viele/);
  assert.throws(() => T.parseSequence('1:2:3:4'), /Ungültige/);
});

test('parseDuration für Eingabefelder', () => {
  assert.equal(T.parseDuration('12:00'), 720);
  assert.equal(T.parseDuration('90'), 90);
  assert.equal(T.parseDuration('0'), 0);
  assert.equal(T.parseDuration('0:00'), 0);
  assert.ok(Number.isNaN(T.parseDuration('1m + 1m')));
  assert.ok(Number.isNaN(T.parseDuration('abc')));
});

test('formatClock', () => {
  assert.equal(T.formatClock(0), '0:00');
  assert.equal(T.formatClock(65), '1:05');
  assert.equal(T.formatClock(3725), '1:02:05');
});

test('Programm: Arbeit/Pause mit und ohne letzte Pause', () => {
  const base = { mode: 'interval', rounds: 8, workSec: 20, restSec: 10 };
  const a = T.buildProgram({ ...base, skipLastRest: true });
  assert.equal(a.segments.length, 15);
  assert.equal(a.totalSec, 8 * 20 + 7 * 10);
  const b = T.buildProgram({ ...base, skipLastRest: false });
  assert.equal(b.segments.length, 16);
  assert.equal(b.segments[15].kind, 'rest');
});

test('Programm: Sätze (wiederholte Intervalle) mit Satzpause', () => {
  const p = T.buildProgram({ mode: 'interval', rounds: 3, workSec: 40, restSec: 20, sets: 2, setRestSec: 90, skipLastRest: true });
  // Satz 1: W R W R W | Satzpause | Satz 2: W R W R W
  assert.deepEqual(p.segments.map((s) => s.kind), ['work', 'rest', 'work', 'rest', 'work', 'rest', 'work', 'rest', 'work', 'rest', 'work']);
  assert.equal(p.segments[5].sec, 90);
  assert.equal(p.segments[6].set, 2);
  assert.equal(p.segments[6].roundInSet, 1);
  assert.equal(p.segments[10].round, 6);
});

test('Programm: Vorlaufzeit wird vorangestellt, EMOM zählt Runden', () => {
  const p = T.buildProgram({ mode: 'emom', emomIntervalSec: 60, emomRounds: 10, prepSec: 10 });
  assert.equal(p.segments[0].kind, 'prep');
  assert.equal(p.segments.length, 11);
  assert.equal(p.segments[10].round, 10);
  assert.equal(p.totalSec, 610);
});

test('Programm: Stoppuhr ohne Time Cap ist offen', () => {
  const p = T.buildProgram({ mode: 'stopwatch', capSec: 0 });
  assert.equal(p.openEnded, true);
  const run = { status: 'running', startedAt: 0, pausedAt: null, pausedMs: 0 };
  const s = T.snapshot(p, run, 3_725_000, 'auto');
  assert.equal(s.display, '1:02:05');
  assert.equal(s.status, 'running');
});

test('Programm: fehlerhafte Zeitfolge liefert Fehlermeldung statt Absturz', () => {
  const p = T.buildProgram({ mode: 'sequence', sequence: '2m + (30' });
  assert.ok(p.error);
  assert.equal(p.segments.length, 1);
});

test('Countdown: Start, Pause, Fortsetzen, Ende', () => {
  const p = T.buildProgram({ mode: 'countdown', durationSec: 60 });
  let run = T.idleRun();
  assert.equal(T.snapshot(p, run, 0).display, '1:00');
  run = T.command(p, run, 'start', 1000);
  assert.equal(T.snapshot(p, run, 1000).display, '1:00');
  assert.equal(T.snapshot(p, run, 1001).display, '1:00'); // aufrunden beim Herunterzählen
  assert.equal(T.snapshot(p, run, 2000).display, '0:59');
  run = T.command(p, run, 'pause', 11_000);
  assert.equal(T.snapshot(p, run, 50_000).display, '0:50');
  run = T.command(p, run, 'toggle', 60_000); // fortsetzen nach 49 s Pause
  assert.equal(run.status, 'running');
  assert.equal(T.snapshot(p, run, 61_000).display, '0:49');
  const end = T.snapshot(p, run, 200_000);
  assert.equal(end.status, 'done');
  assert.equal(end.display, '0:00');
});

test('Vorlauf: Anzeige im Ruhezustand zeigt erste Arbeitsphase, dann Vorlauf', () => {
  const p = T.buildProgram({ mode: 'countdown', durationSec: 720, prepSec: 10 });
  assert.equal(T.snapshot(p, T.idleRun(), 0).display, '12:00');
  const run = T.command(p, T.idleRun(), 'start', 0);
  const s = T.snapshot(p, run, 3000);
  assert.equal(s.kind, 'prep');
  assert.equal(s.displaySec, 7);
  assert.equal(T.snapshot(p, run, 10_000).display, '12:00');
});

test('Automatischer Wechsel Arbeit/Pause und Rundenanzeige', () => {
  const p = T.buildProgram({ mode: 'interval', rounds: 8, workSec: 20, restSec: 10, skipLastRest: true });
  const run = T.command(p, T.idleRun(), 'start', 0);
  let s = T.snapshot(p, run, 5000);
  assert.equal(s.kind, 'work');
  assert.equal(s.segment.round, 1);
  assert.equal(s.display, '0:15');
  s = T.snapshot(p, run, 25_000);
  assert.equal(s.kind, 'rest');
  assert.equal(s.display, '0:05');
  s = T.snapshot(p, run, 31_000);
  assert.equal(s.kind, 'work');
  assert.equal(s.segment.round, 2);
  s = T.snapshot(p, run, 230_000);
  assert.equal(s.status, 'done');
});

test('Intervall vor/zurück springen', () => {
  const p = T.buildProgram({ mode: 'emom', emomIntervalSec: 60, emomRounds: 5 });
  let run = T.command(p, T.idleRun(), 'start', 0);
  run = T.command(p, run, 'next', 10_000);
  let s = T.snapshot(p, run, 10_000);
  assert.equal(s.segment.round, 2);
  assert.equal(s.display, '1:00');
  run = T.command(p, run, 'prev', 11_000); // innerhalb 2 s -> vorheriges Intervall
  s = T.snapshot(p, run, 11_000);
  assert.equal(s.segment.round, 1);
  run = T.command(p, run, 'prev', 20_000); // > 2 s im Intervall -> Anfang des Intervalls
  assert.equal(T.snapshot(p, run, 20_000).display, '1:00');
});

test('Richtung: aufwärts zählen wird erzwungen', () => {
  const p = T.buildProgram({ mode: 'countdown', durationSec: 60 });
  const run = T.command(p, T.idleRun(), 'start', 0);
  assert.equal(T.snapshot(p, run, 15_500, 'up').display, '0:15');
});

test('Automatische Titel', () => {
  assert.equal(T.autoTitle({ mode: 'interval', rounds: 8, workSec: 20, restSec: 10 }), 'TABATA 8 × 0:20 / 0:10');
  assert.equal(T.autoTitle({ mode: 'emom', emomRounds: 12, emomIntervalSec: 60 }), 'EMOM 12 × 1:00');
  assert.equal(T.autoTitle({ mode: 'stopwatch' }), 'FOR TIME');
});
