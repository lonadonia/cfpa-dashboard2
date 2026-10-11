/*
 * Synchronisation zwischen Bedienoberfläche, Overlay und Fernsteuerung.
 *
 * Zwei Betriebsarten, automatisch erkannt:
 *  1. "server": Seite wurde vom lokalen Node-Server (server.js) geladen.
 *     Änderungen gehen per POST an den Server, alle Ansichten erhalten den
 *     neuen Zustand per Server-Sent Events. Funktioniert über Programme und
 *     Geräte hinweg (OBS-Browserquelle, Chrome, Handy im WLAN).
 *  2. "local": statisches Hosting oder Datei ohne Server.
 *     Zustand liegt im localStorage, Änderungen werden per BroadcastChannel
 *     an andere Tabs DESSELBEN Browsers verteilt (ideal zum Testen).
 */
(function (root) {
  'use strict';
  var S = root.CFO.state;
  var STORAGE_KEY = 'cfo:state:v1';
  var CHANNEL = 'cfo-overlay';

  function getKey() {
    var params = new URLSearchParams(location.search);
    var k = params.get('key');
    try {
      if (k) sessionStorage.setItem('cfo:key', k);
      else k = sessionStorage.getItem('cfo:key');
    } catch (e) { /* privater Modus */ }
    return k || '';
  }

  function detectServer() {
    if (location.protocol === 'file:') return Promise.resolve(null);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeout = setTimeout(function () { if (ctrl) ctrl.abort(); }, 2500);
    return fetch('api/info', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) { return info && info.app === 'crossfit-overlay' && info.mode === 'server' ? info : null; })
      .catch(function () { return null; })
      .then(function (info) { clearTimeout(timeout); return info; });
  }

  /**
   * connect({ onState(state, info), onStatus(status) }) -> Promise<api>
   * api.dispatch(action | action[]), api.now(), api.mode, api.info, api.state()
   */
  function connect(opts) {
    opts = opts || {};
    var onState = opts.onState || function () {};
    var onStatus = opts.onStatus || function () {};

    return detectServer().then(function (info) {
      return info ? serverTransport(info, onState, onStatus) : localTransport(onState, onStatus);
    });
  }

  // ---------------------------------------------------------------------------
  // Server-Modus
  // ---------------------------------------------------------------------------

  function serverTransport(info, onState, onStatus) {
    var key = getKey();
    var state = null;
    var rev = 0;
    var offset = 0; // Serverzeit - lokale Zeit
    var pending = Promise.resolve();
    var es = null;

    function applyRemote(msg) {
      if (typeof msg.serverNow === 'number') offset = msg.serverNow - Date.now();
      if (msg.state && msg.rev >= rev) {
        rev = msg.rev;
        state = S.normalize(msg.state);
        onState(state, { source: 'remote' });
      }
    }

    function open() {
      es = new EventSource('api/events');
      es.addEventListener('state', function (ev) {
        try { applyRemote(JSON.parse(ev.data)); } catch (e) { console.error(e); }
        onStatus({ connected: true, mode: 'server' });
      });
      es.addEventListener('time', function (ev) {
        try { var m = JSON.parse(ev.data); offset = m.serverNow - Date.now(); } catch (e) { /* ignorieren */ }
      });
      es.onopen = function () { onStatus({ connected: true, mode: 'server' }); };
      es.onerror = function () { onStatus({ connected: false, mode: 'server' }); };
    }

    function dispatch(actions) {
      actions = Array.isArray(actions) ? actions : [actions];
      // Sofort lokal anzeigen (optimistisch); der Server bestätigt per SSE.
      if (state) {
        var now = Date.now() + offset;
        var next = state;
        actions.forEach(function (a) { next = S.reduce(next, a, now); });
        if (next !== state) { state = next; onState(state, { source: 'local' }); }
      }
      pending = pending.then(function () {
        return fetch('api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Overlay-Key': key },
          body: JSON.stringify({ actions: actions })
        }).then(function (r) {
          if (r.status === 401) onStatus({ connected: true, mode: 'server', error: 'Zugriffsschlüssel fehlt oder ist falsch (URL mit ?key=… öffnen)' });
          else if (!r.ok) onStatus({ connected: true, mode: 'server', error: 'Server-Fehler ' + r.status });
        }).catch(function () {
          onStatus({ connected: false, mode: 'server', error: 'Server nicht erreichbar' });
        });
      });
      return pending;
    }

    open();
    onStatus({ connected: false, mode: 'server' });

    return {
      mode: 'server',
      info: info,
      key: key,
      dispatch: dispatch,
      now: function () { return Date.now() + offset; },
      state: function () { return state; }
    };
  }

  // ---------------------------------------------------------------------------
  // Lokaler Modus (ohne Server)
  // ---------------------------------------------------------------------------

  function localTransport(onState, onStatus) {
    var state = load();
    var channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

    function load() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return S.normalize(JSON.parse(raw));
      } catch (e) { /* defekte Daten -> Standard */ }
      return S.defaults();
    }

    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch (e) {
        onStatus({ connected: true, mode: 'local', error: 'Speicher voll – Logo verkleinern oder Szenen löschen' });
        return false;
      }
    }

    if (channel) {
      channel.onmessage = function (ev) {
        if (ev.data && ev.data.type === 'state') {
          state = S.normalize(ev.data.state);
          onState(state, { source: 'remote' });
        }
      };
    }
    // Fallback und Synchronisation über Browserfenster ohne BroadcastChannel
    window.addEventListener('storage', function (ev) {
      if (ev.key !== STORAGE_KEY || !ev.newValue) return;
      try {
        state = S.normalize(JSON.parse(ev.newValue));
        onState(state, { source: 'remote' });
      } catch (e) { /* ignorieren */ }
    });

    function dispatch(actions) {
      actions = Array.isArray(actions) ? actions : [actions];
      var now = Date.now();
      var next = state;
      actions.forEach(function (a) { next = S.reduce(next, a, now); });
      if (next === state) return Promise.resolve();
      state = next;
      save();
      if (channel) channel.postMessage({ type: 'state', state: state });
      onState(state, { source: 'local' });
      return Promise.resolve();
    }

    setTimeout(function () {
      onStatus({ connected: true, mode: 'local' });
      onState(state, { source: 'init' });
    }, 0);

    return {
      mode: 'local',
      info: { mode: 'local', lanUrls: [] },
      key: '',
      dispatch: dispatch,
      now: function () { return Date.now(); },
      state: function () { return state; }
    };
  }

  root.CFO = root.CFO || {};
  root.CFO.sync = { connect: connect };
})(self);
