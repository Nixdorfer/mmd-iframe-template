window.Row = {
  render: function(cfg, renderCol) {
    var ratio = cfg.ratio || [1];
    var total = ratio.reduce(function(a, b) { return a + b; }, 0);
    var dc = ' data-mod="row" data-cfg="' + U.esc(JSON.stringify(cfg)) + '"';
    var h = '<div class="row"' + dc + '>';
    (cfg.cols || []).forEach(function(col, i) {
      var pct = (ratio[i] || 1) / total * 100;
      h += '<div class="row-col" style="flex:0 0 ' + pct.toFixed(2) + '%">';
      if (renderCol) h += renderCol(col);
      else switch (col.type) {
        case 'text': if (window.Content) h += Content.render(col); break;
        case 'btn': if (window.Btn) h += Btn.render(col); break;
        case 'image': if (window.Image) h += Image.render(col); break;
      }
      h += '</div>';
    });
    h += '</div>';
    return h;
  },
  css: [
    '.row { display: flex; gap: 8px; margin: 8px 0; }',
    '.row-col { display: flex; flex-direction: column; justify-content: center; align-items: center; }',
    '.row-col .text { margin-bottom: 0; }'
  ].join('\n')
};
