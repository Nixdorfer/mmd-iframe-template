window.Btn = {
  render: function(cfg) {
    var st = U.style({ background: cfg.color ? '#' + cfg.color : null });
    var dc = ' data-mod="btn" data-cfg="' + U.esc(JSON.stringify(cfg)) + '"';
    var h = '<button class="custom-btn"' + dc + ' data-page="' + (cfg.page || 0) + '" data-msg="' + U.esc(cfg.message || '') + '" data-killer="' + (cfg.killer || false) + '"' + (st ? ' style="' + st + '"' : '') + '>' + U.esc(cfg.value) + '</button>';
    if (cfg.align) return '<div class="btn-wrap ' + cfg.align + '">' + h + '</div>';
    return h;
  },
  bind: function(el, done) {
    el.onclick = function() {
      var pg = parseInt(el.dataset.page), msg = el.dataset.msg, killer = el.dataset.killer === 'true';
      if (msg) { done({ msg: msg }); return; }
      if (killer) { done({ killer: true }); return; }
      if (pg > 0) done({ page: pg });
    };
  },
  css: [
    '.custom-btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 8px; color: #fff; font-size: 14px; cursor: pointer; margin: 8px 4px; background: var(--btn); transition: filter 0.2s; }',
    '.custom-btn:hover { filter: brightness(1.2); }',
    '.custom-btn.disabled { opacity: 0.5; cursor: not-allowed; }',
    '.btn-wrap { display: block; margin: 8px 0; }',
    '.btn-wrap.left .custom-btn { text-align: left; }',
    '.btn-wrap.center .custom-btn { text-align: center; }',
    '.btn-wrap.right .custom-btn { text-align: right; }'
  ].join('\n')
};
