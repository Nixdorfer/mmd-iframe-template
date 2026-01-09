window.Select = {
  render: function(cfg) {
    var dc = ' data-mod="select" data-cfg="' + U.esc(JSON.stringify(cfg)) + '"';
    var h = '<div class="form-group"' + dc + '>';
    if (cfg.title) h += '<label>' + U.esc(cfg.title) + '</label>';
    h += '<select data-key="' + U.esc(cfg.key) + '">';
    (cfg.options || []).forEach(function(o, i) {
      h += '<option value="' + U.esc(o) + '"' + (i === (cfg.default || 0) ? ' selected' : '') + '>' + U.esc(o) + '</option>';
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
