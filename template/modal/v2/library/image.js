window.Image = {
  render: function(cfg) {
    var w = cfg.size || 100;
    var dc = ' data-mod="image" data-cfg="' + U.esc(JSON.stringify(cfg)) + '"';
    var h = '<div class="img-wrap ' + (cfg.align || 'center') + '"' + dc + ' style="width:' + w + '%">';
    h += '<img src="' + U.esc(cfg.url) + '" data-detail="' + (cfg.detail !== false) + '">';
    h += '</div>';
    return h;
  },
  showDetail: function(src) {
    var d = document.createElement('div');
    d.className = 'detail';
    d.innerHTML = '<img src="' + src + '">';
    d.onclick = function() { d.remove(); };
    document.body.appendChild(d);
  },
  css: [
    '.img-wrap { display: block; margin: 8px 0; overflow: hidden; }',
    '.img-wrap.left { margin-right: auto; }',
    '.img-wrap.right { margin-left: auto; }',
    '.img-wrap.center { margin: 8px auto; }',
    '.img-wrap img { width: 100%; border-radius: 8px; display: block; cursor: pointer; }',
    '.detail { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10001; cursor: pointer; }',
    '.detail img { max-width: 95%; max-height: 95%; object-fit: contain; }'
  ].join('\n')
};
