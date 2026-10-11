/*
 * Bedienoberfläche: Tabs "Links", "Mitte", "Rechts".
 * Baut für jede Zone die Zoneneinstellungen und die Element-Karten.
 *
 * Die Eingabefelder tragen nur ein data-path-Attribut (z. B.
 * "elements.brand.style.size"). Lesen und Schreiben übernimmt control.js
 * zentral – dadurch funktionieren auch Elemente, die später ergänzt werden,
 * ohne zusätzlichen Code.
 */
(function (root) {
  'use strict';
  var S = root.CFO.state;
  var icon = root.CFO.icons.icon;

  var ZONE_NAMES = { left: 'Linke Zone', center: 'Mittlere Zone', right: 'Rechte Zone' };
  var TYPE_NAMES = { logo: 'Logo', text: 'Text', rich: 'Mehrzeilig', labeled: 'Beschriftet', clock: 'Uhr', timer: 'Timer' };
  var uid = 0;

  // ---------------------------------------------------------------------------
  // Kleine DOM-Bausteine
  // ---------------------------------------------------------------------------

  function h(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] == null || attrs[k] === false) continue;
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'class') n.className = attrs[k];
        else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      }
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function nextId(prefix) { uid += 1; return prefix + '-' + uid; }

  function field(label, control, hint) {
    var id = control.id || (control.id = nextId('f'));
    var lab = h('label', { for: id, text: label });
    return h('div', { class: 'field' }, [lab, control, hint ? h('span', { class: 'hint', text: hint }) : null]);
  }

  function text(path, opts) {
    opts = opts || {};
    if (opts.multiline) {
      return h('textarea', { 'data-path': path, rows: opts.rows || 2, spellcheck: 'false', maxlength: opts.max || 20000 });
    }
    return h('input', { type: 'text', 'data-path': path, maxlength: opts.max || 500, autocomplete: 'off' });
  }

  function num(path, min, max, step) {
    return h('input', { type: 'number', 'data-path': path, min: min, max: max, step: step || 1, inputmode: 'numeric' });
  }

  function range(path, min, max, step, label) {
    var id = nextId('r');
    return h('div', { class: 'row' }, [
      h('label', { class: 'field-label', for: id, text: label }),
      h('input', { type: 'range', id: id, 'data-path': path, min: min, max: max, step: step || 1, style: 'flex:1' }),
      h('input', { type: 'number', 'data-path': path, min: min, max: max, step: step || 1, style: 'width:76px', 'aria-label': label })
    ]);
  }

  function color(path, label) {
    var id = nextId('c');
    return h('div', { class: 'field' }, [
      h('label', { for: id, text: label }),
      h('div', { class: 'color-field' }, [
        h('input', { type: 'color', id: id, 'data-path': path }),
        h('input', { type: 'text', 'data-path': path, 'data-kind': 'color', maxlength: 7, 'aria-label': label + ' (Hex)' })
      ])
    ]);
  }

  function seg(path, label, options, kind) {
    var id = nextId('s');
    var wrap = h('div', { class: 'seg seg--block', 'data-path': path, 'data-kind': kind || null, role: 'group', 'aria-labelledby': id });
    options.forEach(function (o) { wrap.appendChild(h('button', { type: 'button', 'data-value': o[0], text: o[1] })); });
    return h('div', { class: 'field' }, [h('span', { class: 'field-label', id: id, text: label }), wrap]);
  }

  function sw(path, label) {
    return h('label', { class: 'switch' }, [h('input', { type: 'checkbox', 'data-path': path }), h('span', { text: label })]);
  }

  function select(path, options, kind) {
    var s = h('select', { 'data-path': path, 'data-kind': kind || null });
    options.forEach(function (o) { s.appendChild(h('option', { value: o[0], text: o[1] })); });
    return s;
  }

  function fontOptions() {
    return Object.keys(S.FONTS).map(function (k) { return [k, S.FONTS[k].label]; });
  }

  var WEIGHTS = [['400', 'Normal'], ['500', 'Mittel'], ['600', 'Halbfett'], ['700', 'Fett'], ['800', 'Extra fett']];
  var ALIGN_OPTS = [['zone', 'Wie Zone'], ['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts']];

  function styleRow(base) {
    return h('div', { class: 'style-row' }, [
      field('Schrift', select(base + '.font', fontOptions())),
      field('Größe (px)', num(base + '.size', 8, 400)),
      field('Stärke', select(base + '.weight', WEIGHTS, 'int')),
      h('div', { class: 'full' }, [color(base + '.color', 'Farbe')]),
      h('div', { class: 'full' }, [seg(base + '.align', 'Ausrichtung', ALIGN_OPTS)]),
      h('div', { class: 'full' }, [sw(base + '.upper', 'Großbuchstaben')])
    ]);
  }

  function zoneSelect(id) {
    return field('Zone', select('elements.' + id + '.zone', [['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts']]));
  }

  // ---------------------------------------------------------------------------
  // Element-Karten
  // ---------------------------------------------------------------------------

  var bodies = {
    logo: function (id) {
      var p = 'elements.' + id;
      var thumb = h('div', { class: 'logo-thumb', 'data-logo-thumb': id }, [h('img', { alt: 'Aktuelles Logo' })]);
      var upload = h('label', { class: 'btn btn--sm' }, [icon('upload'), 'Hochladen / wechseln', h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif', hidden: true, 'data-action': 'logo-upload', 'data-id': id })]);
      return [
        h('div', { class: 'logo-box' }, [
          thumb,
          h('div', { class: 'grid' }, [
            upload,
            h('div', { class: 'row' }, [
              h('button', { type: 'button', class: 'btn btn--sm btn--danger', 'data-action': 'logo-remove', 'data-id': id }, [icon('trash'), 'Entfernen']),
              h('button', { type: 'button', class: 'btn btn--sm btn--ghost', 'data-action': 'logo-default', 'data-id': id, text: 'Standard' })
            ]),
            h('span', { class: 'hint', text: 'PNG/SVG mit transparentem Hintergrund empfohlen. Datei hierher ziehen geht auch.' })
          ])
        ]),
        range(p + '.size', 40, 900, 2, 'Breite'),
        seg(p + '.shape', 'Form', [['none', 'Original'], ['rounded', 'Abgerundet'], ['circle', 'Kreis']]),
        seg(p + '.align', 'Ausrichtung', ALIGN_OPTS),
        zoneSelect(id)
      ];
    },
    text: function (id) {
      var p = 'elements.' + id;
      return [field('Text', text(p + '.text', { multiline: true, rows: 2 })), styleRow(p + '.style'), zoneSelect(id)];
    },
    rich: function (id) {
      var p = 'elements.' + id;
      return [
        field('Inhalt', text(p + '.text', { multiline: true, rows: 7 }), 'Zeilen: „# Überschrift“, „- Aufzählung“, **fett**, Leerzeile = Abstand'),
        styleRow(p + '.style'),
        zoneSelect(id)
      ];
    },
    labeled: function (id) {
      var p = 'elements.' + id;
      return [
        h('div', { class: 'grid-2' }, [field('Beschriftung', text(p + '.label', { max: 40 })), field('Name / Wert', text(p + '.text', { max: 200 }))]),
        styleRow(p + '.style'),
        zoneSelect(id)
      ];
    },
    clock: function (id) {
      var p = 'elements.' + id;
      return [
        field('Beschriftung', text(p + '.label', { max: 40 }), 'z. B. „Live“ oder leer lassen'),
        h('div', { class: 'row' }, [sw(p + '.seconds', 'Sekunden'), sw(p + '.date', 'Datum')]),
        styleRow(p + '.style'),
        zoneSelect(id)
      ];
    },
    timer: function (id) {
      var t = 'timer.style';
      var l = 'timer.labels';
      return [
        h('p', { class: 'hint', text: 'Programm (Dauer, Runden, Intervalle) im Tab „Timer“. Hier nur die Darstellung.' }),
        h('div', { class: 'grid-2' }, [field('Schrift', select(t + '.font', fontOptions())), field('Stärke', select(t + '.weight', WEIGHTS, 'int'))]),
        range(t + '.size', 60, 420, 2, 'Größe'),
        seg(t + '.progress', 'Fortschritt', [['bar', 'Balken'], ['ring', 'Ring'], ['none', 'Aus']]),
        h('div', { class: 'grid-2' }, [
          sw(t + '.showTitle', 'Titel'),
          sw(t + '.showPhase', 'Arbeit/Pause'),
          sw(t + '.showRounds', 'Runde/Intervall'),
          sw(t + '.showPips', 'Rundenpunkte'),
          sw(t + '.prepFullscreen', 'Vorlauf groß in Bildmitte')
        ]),
        h('h4', { class: 'section-title', text: 'Farben' }),
        h('div', { class: 'grid-2' }, [color(t + '.colorBase', 'Grundfarbe'), color(t + '.titleColor', 'Titel')]),
        sw(t + '.colorShift', 'Farbwechsel Grün – Gelb – Rot'),
        h('div', { class: 'grid-3' }, [color(t + '.colorOk', 'Grün'), color(t + '.colorWarn', 'Gelb'), color(t + '.colorAlert', 'Rot')]),
        h('div', { class: 'grid-2' }, [field('Gelb ab (Sek. Rest)', num(t + '.warnSec', 0, 3600)), field('Rot ab (Sek. Rest)', num(t + '.alertSec', 0, 3600))]),
        h('div', { class: 'grid-2' }, [color(t + '.colorRest', 'Pause'), color(t + '.colorPrep', 'Vorlauf')]),
        h('details', { class: 'help' }, [
          h('summary', { text: 'Beschriftungen (z. B. Englisch)' }),
          h('div', { class: 'grid-2', style: 'padding:0 12px 12px' }, [
            field('Arbeit', text(l + '.work', { max: 30 })), field('Pause', text(l + '.rest', { max: 30 })),
            field('Vorlauf', text(l + '.prep', { max: 30 })), field('Start', text(l + '.go', { max: 30 })),
            field('Ende', text(l + '.done', { max: 30 })), field('Pausiert', text(l + '.paused', { max: 30 })),
            field('Runde', text(l + '.round', { max: 30 })), field('Satz', text(l + '.set', { max: 30 })),
            field('Intervall', text(l + '.interval', { max: 30 })), field('Time Cap', text(l + '.cap', { max: 30 }))
          ])
        ]),
        zoneSelect(id)
      ];
    }
  };

  function elementCard(id, el, expanded) {
    var bodyId = 'body-' + id;
    var toggleBtn = h('button', { type: 'button', class: 'el-card__toggle', 'aria-expanded': expanded ? 'true' : 'false', 'aria-controls': bodyId, 'data-action': 'card-toggle', 'data-id': id }, [
      h('span', { class: 'name', text: el.name || id }),
      h('span', { class: 'badge', text: TYPE_NAMES[el.type] || el.type }),
      icon('down', 'chev')
    ]);
    var head = h('div', { class: 'el-card__head' }, [
      h('label', { class: 'switch', title: 'Ein-/ausblenden' }, [h('input', { type: 'checkbox', 'data-path': 'elements.' + id + '.visible', 'aria-label': (el.name || id) + ' sichtbar' })]),
      toggleBtn,
      h('button', { type: 'button', class: 'btn btn--sm btn--ghost btn--icon', 'data-action': 'order-up', 'data-id': id, 'aria-label': 'Nach oben verschieben', title: 'Nach oben verschieben' }, [icon('arrowUp')]),
      h('button', { type: 'button', class: 'btn btn--sm btn--ghost btn--icon', 'data-action': 'order-down', 'data-id': id, 'aria-label': 'Nach unten verschieben', title: 'Nach unten verschieben' }, [icon('arrowDown')])
    ]);
    var body = h('div', { class: 'el-card__body', id: bodyId, hidden: !expanded }, (bodies[el.type] || function () { return []; })(id));
    return h('div', { class: 'el-card', 'data-el': id }, [head, body]);
  }

  function zoneCard(zone, expanded) {
    var p = 'zones.' + zone;
    var bodyId = 'zone-body-' + zone;
    return h('div', { class: 'el-card zone-box', 'data-zone-card': zone }, [
      h('div', { class: 'el-card__head' }, [
        h('label', { class: 'switch', title: 'Zone ein-/ausblenden' }, [h('input', { type: 'checkbox', 'data-path': p + '.visible', 'aria-label': ZONE_NAMES[zone] + ' sichtbar' })]),
        h('button', { type: 'button', class: 'el-card__toggle', 'aria-expanded': expanded ? 'true' : 'false', 'aria-controls': bodyId, 'data-action': 'card-toggle', 'data-id': 'zone-' + zone }, [
          h('span', { class: 'name', text: ZONE_NAMES[zone] + ' · Position & Fläche' }), icon('down', 'chev')
        ])
      ]),
      h('div', { class: 'el-card__body', id: bodyId, hidden: !expanded }, [
        h('div', { class: 'grid-2' }, [
          seg(p + '.h', 'Verankerung horizontal', [['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts']]),
          seg(p + '.v', 'Verankerung vertikal', [['top', 'Oben'], ['middle', 'Mitte'], ['bottom', 'Unten']])
        ]),
        h('div', { class: 'grid-3' }, [field('Abstand X', num(p + '.mx', -1920, 1920)), field('Abstand Y', num(p + '.my', -1080, 1080)), field('Breite', num(p + '.width', 120, 1920))]),
        h('div', { class: 'grid-2' }, [seg(p + '.align', 'Textausrichtung', [['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts']]), field('Skalierung %', num(p + '.scale', 30, 300, 5))]),
        h('p', { class: 'hint', text: 'Tipp: In der Vorschau „Zonen verschieben“ aktivieren und die Zone mit der Maus ziehen.' }),
        h('h4', { class: 'section-title', text: 'Hintergrundfläche' }),
        sw(p + '.panel.show', 'Fläche anzeigen'),
        h('div', { class: 'grid-2' }, [color(p + '.panel.color', 'Farbe'), field('Deckkraft %', num(p + '.panel.opacity', 0, 100, 5))]),
        h('div', { class: 'grid-2' }, [field('Ecken-Radius', num(p + '.panel.radius', 0, 200)), field('Innenabstand', num(p + '.panel.padding', 0, 200))]),
        h('div', { class: 'grid-2' }, [sw(p + '.panel.stripe', 'Signalkante'), sw(p + '.panel.cut', 'Schräge Ecke'), sw(p + '.panel.blur', 'Weichzeichner')]),
        h('p', { class: 'hint', text: 'Weichzeichner belastet die Grafikkarte – in OBS nur bei Bedarf nutzen.' })
      ])
    ]);
  }

  /** Strukturschlüssel: ändert sich nur, wenn Elemente die Zone wechseln oder umsortiert werden. */
  function structureKey(state, zone) {
    return S.zoneElements(state, zone).map(function (it) { return it.id + ':' + it.el.type; }).join('|');
  }

  /**
   * Baut einen Zonen-Tab neu auf, falls sich seine Struktur geändert hat.
   * expandedSet merkt sich aufgeklappte Karten über Neuaufbauten hinweg.
   */
  function renderZoneTab(container, zone, state, expandedSet) {
    var key = structureKey(state, zone);
    if (container.getAttribute('data-key') === key && container.firstChild) return false;
    container.setAttribute('data-key', key);
    while (container.firstChild) container.removeChild(container.firstChild);

    var list = S.zoneElements(state, zone);
    container.appendChild(zoneCard(zone, expandedSet.has('zone-' + zone)));
    container.appendChild(h('h3', { class: 'section-title', style: 'margin:4px 0 10px', text: 'Elemente in dieser Zone' }));
    var wrap = h('div', { class: 'el-list' });
    if (!list.length) wrap.appendChild(h('p', { class: 'scene-empty', text: 'Keine Elemente. Elemente anderer Zonen lassen sich über „Zone“ hierher verschieben.' }));
    list.forEach(function (it) { wrap.appendChild(elementCard(it.id, it.el, expandedSet.has(it.id))); });
    container.appendChild(wrap);
    return true;
  }

  root.CFO = root.CFO || {};
  root.CFO.controlZones = { renderZoneTab: renderZoneTab, ZONE_NAMES: ZONE_NAMES };
})(self);
