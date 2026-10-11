'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../public/js/core/state.js');

test('Standardzustand hat drei Zonen und alle Pflicht-Elemente', () => {
  const s = S.defaults();
  assert.deepEqual(Object.keys(s.zones), ['left', 'center', 'right']);
  for (const id of ['logo', 'brand', 'title', 'subtitle', 'freeText', 'timer', 'wod', 'coach', 'notes', 'clock']) {
    assert.ok(s.elements[id], id);
  }
});

test('set: gültige Änderungen werden übernommen, ungültige verworfen', () => {
  let s = S.defaults();
  s = S.reduce(s, { type: 'set', path: 'elements.brand.text', value: 'CrossFit Passau' });
  assert.equal(s.elements.brand.text, 'CrossFit Passau');
  const before = s;
  assert.equal(S.reduce(s, { type: 'set', path: 'elements.brand.text', value: 42 }), before);
  assert.equal(S.reduce(s, { type: 'set', path: '__proto__.x', value: 1 }), before);
  assert.equal(S.reduce(s, { type: 'set', path: 'timer.run.status', value: 'running' }), before);
  assert.equal(S.reduce(s, { type: 'set', path: 'elements.logo.src', value: 'javascript:alert(1)' }), before);
  assert.equal(S.reduce(s, { type: 'set', path: 'elements.brand.style.font', value: 'comic' }), before);
  s = S.reduce(s, { type: 'set', path: 'zones.left.panel.opacity', value: 500 });
  assert.equal(s.zones.left.panel.opacity, 100); // auf Grenzwert begrenzt
});

test('set ist unveränderlich (alter Zustand bleibt erhalten)', () => {
  const a = S.defaults();
  const b = S.reduce(a, { type: 'set', path: 'zones.right.visible', value: false });
  assert.equal(a.zones.right.visible, true);
  assert.equal(b.zones.right.visible, false);
  assert.equal(a.elements, b.elements); // unveränderte Teile werden geteilt
});

test('Timer-Befehle und Konfigurationswechsel setzen den Lauf zurück', () => {
  let s = S.defaults();
  s = S.reduce(s, { type: 'timer', cmd: 'start' }, 1000);
  assert.equal(s.timer.run.status, 'running');
  const titled = S.reduce(s, { type: 'timerConfig', config: { title: 'AMRAP 20' } }, 2000);
  assert.equal(titled.timer.run.status, 'running', 'Titeländerung stoppt den Timer nicht');
  const changed = S.reduce(s, { type: 'timerConfig', config: { mode: 'emom' } }, 2000);
  assert.equal(changed.timer.run.status, 'idle');
  assert.equal(changed.timer.config.mode, 'emom');
  const invalid = S.reduce(s, { type: 'timerConfig', config: { mode: 'hack', durationSec: 'x' } }, 2000);
  assert.equal(invalid.timer.config.mode, 'countdown');
  assert.equal(invalid.timer.config.durationSec, 720);
});

test('Szenen speichern, laden, umbenennen, löschen', () => {
  let s = S.defaults();
  s = S.reduce(s, { type: 'set', path: 'elements.wod.text', value: 'Fran' });
  s = S.reduce(s, { type: 'sceneSave', name: 'Fran' }, 1000);
  assert.equal(s.scenes.length, 1);
  const id = s.scenes[0].id;
  s = S.reduce(s, { type: 'set', path: 'elements.wod.text', value: 'Murph' });
  s = S.reduce(s, { type: 'sceneLoad', id }, 2000);
  assert.equal(s.elements.wod.text, 'Fran');
  assert.equal(s.activeSceneId, id);
  s = S.reduce(s, { type: 'sceneRename', id, name: 'Fran (Benchmark)' });
  assert.equal(s.scenes[0].name, 'Fran (Benchmark)');
  s = S.reduce(s, { type: 'sceneDelete', id });
  assert.equal(s.scenes.length, 0);
  assert.equal(s.activeSceneId, null);
});

test('Szene laden lässt laufenden Timer weiterlaufen, wenn das Programm gleich ist', () => {
  let s = S.defaults();
  s = S.reduce(s, { type: 'sceneSave', name: 'A' }, 0);
  s = S.reduce(s, { type: 'timer', cmd: 'start' }, 1000);
  s = S.reduce(s, { type: 'sceneLoad', id: s.scenes[0].id }, 5000);
  assert.equal(s.timer.run.status, 'running');
});

test('Standardlayout wiederherstellen behält Texte und Logo', () => {
  let s = S.defaults();
  s = S.reduce(s, { type: 'set', path: 'elements.brand.text', value: 'Meine Box' });
  s = S.reduce(s, { type: 'set', path: 'zones.left.width', value: 900 });
  s = S.reduce(s, { type: 'preset', id: 'classic' });
  assert.equal(s.elements.wod.zone, 'left');
  s = S.reduce(s, { type: 'resetLayout' });
  assert.equal(s.zones.left.width, S.defaults().zones.left.width);
  assert.equal(s.elements.wod.zone, 'right');
  assert.equal(s.elements.brand.text, 'Meine Box');
});

test('normalize repariert unvollständige oder fremde Daten', () => {
  const s = S.normalize({ zones: { left: { width: 'breit' } }, elements: { brand: { text: 'X' }, sponsor: { type: 'logo', zone: 'nirgends', src: '' } }, timer: { run: { status: 'running' } } });
  assert.equal(s.zones.left.width, S.defaults().zones.left.width);
  assert.equal(s.elements.brand.text, 'X');
  assert.equal(s.elements.sponsor.zone, 'left'); // Erweiterungs-Element bleibt erhalten
  assert.equal(s.timer.run.status, 'idle');
});

test('Szenen-Import erzeugt neue IDs', () => {
  let s = S.defaults();
  s = S.reduce(s, { type: 'sceneImport', scenes: [{ name: 'Import', data: S.sceneData(S.defaults()) }, { bad: true }] }, 10);
  assert.equal(s.scenes.length, 1);
  assert.equal(s.scenes[0].name, 'Import');
});
