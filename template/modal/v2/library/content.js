window.Content = {
  render: function(cfg) {
    var cls = U.cls('text', cfg.align || 'center', cfg.style);
    var st = U.style({ color: cfg.color ? '#' + cfg.color : null });
    var attr = ' data-mod="text" data-cfg="' + U.esc(JSON.stringify(cfg)) + '"';
    if (st) attr += ' style="' + st + '"';
    if (cfg.url) attr += ' data-url="' + U.esc(cfg.url) + '"';
    return '<span class="' + cls + '"' + attr + '>' + U.esc(cfg.value) + '</span>';
  },
  css: [
    '.text { display: block; color: #888; font-size: 14px; margin-bottom: 16px; white-space: pre-wrap; }',
    '.text.left { text-align: left; }',
    '.text.right { text-align: right; }',
    '.text.center { text-align: center; }',
    '.text.title { font-size: 18px; font-weight: bold; color: #fff; }',
    '.text.bold { font-weight: bold; }',
    '.text.italic { font-style: italic; }',
    '.text.quote { border-left: 3px solid #444; padding-left: 12px; color: #aaa; font-style: italic; }',
    '.text.link { color: #4a9eff; text-decoration: underline; cursor: pointer; }'
  ].join('\n')
};
