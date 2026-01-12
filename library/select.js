window.Select = {
  render: function(cfg) {
    var dc = ' data-mod="select" data-cfg="' + U.esc(JSON.stringify(cfg)) + '"';
    var h = '<div class="form-group"' + dc + '>';
    if (cfg.title) h += '<label>' + U.esc(cfg.title) + '</label>';
    h += '<select data-key="' + U.esc(cfg.key) + '">';
    var defIdx = cfg.default !== undefined && cfg.default !== '' ? parseInt(cfg.default) : -1;
    (cfg.options || []).forEach(function(o, i) {
      var val = typeof o === 'object' ? (o.value || '') : o;
      h += '<option value="' + U.esc(val) + '"' + (i === defIdx ? ' selected' : '') + '>' + U.esc(val) + '</option>';
    });
    h += '</select></div>';
    return h;
  },
  css: [
    '.form-group { margin-bottom: 16px; }',
    'label { display: block; margin-bottom: 8px; color: #fff; }',
    'select { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #1a1a1a; color: #fff; font-size: 16px; }',
    'select:focus { outline: 2px solid var(--btn); }'
  ].join('\n')
};
