window.Input = {
  render: function(cfg) {
    var dc = ' data-mod="input" data-cfg="' + U.esc(JSON.stringify(cfg)) + '"';
    var h = '<div class="form-group"' + dc + '>';
    if (cfg.title) h += '<label>' + U.esc(cfg.title) + '</label>';
    h += '<input type="text" data-key="' + U.esc(cfg.key) + '" data-required="' + (cfg.required !== false) + '" placeholder="' + U.esc(cfg.placeholder || '') + '">';
    h += '</div>';
    return h;
  },
  css: [
    'input { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #1a1a1a; color: #fff; font-size: 16px; }',
    'input:focus { outline: 2px solid var(--btn); }',
    'input.error { outline: 2px solid #ff4444; animation: shake 0.5s; }',
    '@keyframes shake {',
    '  0%, 100% { transform: translateX(0); }',
    '  25%, 75% { transform: translateX(-8px); }',
    '  50% { transform: translateX(8px); }',
    '}'
  ].join('\n')
};
