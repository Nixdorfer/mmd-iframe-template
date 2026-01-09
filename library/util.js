window.U = {
  esc: function(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  style: function(o) {
    return Object.keys(o).filter(function(k) { return o[k]; }).map(function(k) { return k + ':' + o[k]; }).join(';');
  },
  cls: function() {
    return Array.prototype.slice.call(arguments).filter(Boolean).join(' ');
  }
};
