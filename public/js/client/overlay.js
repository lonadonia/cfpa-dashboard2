/*
 * Overlay-Ansicht (overlay.html) – das ist die Seite für OBS / Streamlabs.
 *
 * URL-Parameter:
 *   ?bg=transparent|checker|demo|green|black   Hintergrund (Standard: transparent)
 *   ?camera=1                                 Webcam als Hintergrund (Alternative ohne OBS)
 *   ?mirror=1                                 Kamerabild spiegeln
 *   ?mute=1                                   Signaltöne in dieser Ansicht stumm
 */
(function () {
  'use strict';
  var CFO = window.CFO;
  var params = new URLSearchParams(location.search);
  var isObs = !!window.obsstudio;
  var bg = params.get('bg') || (params.get('camera') === '1' ? 'black' : 'transparent');
  document.documentElement.setAttribute('data-bg', bg);

  var viewport = document.getElementById('viewport');
  var stage = document.getElementById('stage');
  var renderer = CFO.render.create(stage, { mode: 'overlay' });
  var state = null;
  var sync = null;
  var cue = CFO.audio.createCueTracker();
  var toastEl = document.getElementById('toast');
  var hintEl = document.getElementById('sound-hint');
  var toastTimer = null;

  function fit() { CFO.render.fit(stage, viewport); }
  window.addEventListener('resize', fit);
  fit();

  function toast(msg) {
    if (isObs) return; // im Stream nie Bedienhinweise zeigen
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1800);
  }

  function soundWanted() {
    if (!state || params.get('mute') === '1') return false;
    var s = state.timer.sound;
    return s.enabled && (s.output === 'overlay' || s.output === 'both');
  }

  function updateSoundHint() {
    var show = !isObs && soundWanted() && CFO.audio.isLocked() && params.get('hint') !== '0';
    hintEl.hidden = !show;
  }

  function loop() {
    if (sync && state) {
      var snap = renderer.tick(sync.now());
      var c = snap ? cue(snap) : null;
      if (c && soundWanted()) CFO.audio.play(c, state.timer.sound.volume / 100);
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('pointerdown', function () {
    CFO.audio.unlock();
    setTimeout(updateSoundHint, 100);
  });

  CFO.sync.connect({
    onState: function (s) {
      state = s;
      renderer.update(s);
      updateSoundHint();
    },
    onStatus: function (st) {
      document.documentElement.setAttribute('data-connected', st.connected ? '1' : '0');
    }
  }).then(function (api) {
    sync = api;
    document.documentElement.setAttribute('data-mode', api.mode);
    CFO.shortcuts.bind({
      getState: function () { return state; },
      dispatch: api.dispatch,
      notify: toast
    });
    requestAnimationFrame(loop);
  });

  // -------------------------------------------------------------------------
  // Kamera-Modus (wie index_cam.html der Referenz): Webcam hinter dem Overlay
  // -------------------------------------------------------------------------
  if (params.get('camera') === '1') initCamera();

  function initCamera() {
    var video = document.createElement('video');
    video.className = 'ov-camera';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    if (params.get('mirror') === '1') video.classList.add('is-mirrored');
    stage.insertBefore(video, stage.firstChild);

    var STORE = 'cfo:cameraId';
    var devices = [];
    var current = null;
    try { current = localStorage.getItem(STORE); } catch (e) { /* ignorieren */ }

    function start(deviceId) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast('Kamera wird von diesem Browser nicht unterstützt (HTTPS oder localhost nötig)');
        return;
      }
      if (video.srcObject) video.srcObject.getTracks().forEach(function (t) { t.stop(); });
      var constraints = { audio: false, video: { width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: 16 / 9 } };
      if (deviceId) constraints.video.deviceId = { exact: deviceId };
      navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        var track = stream.getVideoTracks()[0];
        current = track && track.getSettings ? track.getSettings().deviceId : deviceId;
        try { localStorage.setItem(STORE, current || ''); } catch (e) { /* ignorieren */ }
        return navigator.mediaDevices.enumerateDevices();
      }).then(function (list) {
        devices = (list || []).filter(function (d) { return d.kind === 'videoinput'; });
        if (devices.length > 1) toast('Kamera: ' + labelFor(current) + ' – Taste C wechselt die Kamera');
      }).catch(function (err) {
        if (deviceId) return start(null); // gespeicherte Kamera nicht mehr vorhanden
        toast('Kein Kamerazugriff: ' + (err && err.name === 'NotAllowedError' ? 'Zugriff wurde verweigert' : (err && err.message) || 'unbekannter Fehler'));
      });
    }

    function labelFor(id) {
      for (var i = 0; i < devices.length; i++) if (devices[i].deviceId === id) return devices[i].label || 'Kamera ' + (i + 1);
      return 'Standardkamera';
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.code === 'KeyC' && devices.length > 1 && !ev.ctrlKey && !ev.metaKey) {
        var idx = 0;
        devices.forEach(function (d, i) { if (d.deviceId === current) idx = i; });
        start(devices[(idx + 1) % devices.length].deviceId);
      } else if (ev.code === 'KeyF' && !ev.ctrlKey && !ev.metaKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(function () {});
      }
    });

    start(current);
  }
})();
