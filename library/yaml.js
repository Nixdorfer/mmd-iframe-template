window.YAML = {
  parse: function(s) {
    var result = {}, stack = [{ obj: result, indent: -1 }], lines = s.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], m = line.match(/^(\s*)/), indent = m[1].length, content = line.slice(indent);
      if (!content || content[0] === '#') continue;
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      var parent = stack[stack.length - 1].obj;
      var km = content.match(/^([^:]+):\s*(.*)$/);
      if (km) {
        var key = km[1].trim(), val = km[2].trim();
        if (val === '') {
          parent[key] = {};
          stack.push({ obj: parent[key], indent: indent });
        } else if (val === '|' || val === '>') {
          var txt = '', j = i + 1;
          while (j < lines.length) {
            var nl = lines[j], ni = nl.match(/^(\s*)/)[1].length;
            if (ni <= indent && nl.trim()) break;
            txt += (txt ? '\n' : '') + nl.slice(indent + 2);
            j++;
          }
          parent[key] = txt;
          i = j - 1;
        } else if (val[0] === '[') {
          var arr = [];
          val.slice(1, -1).split(',').forEach(function(v) {
            arr.push(v.trim().replace(/^["']|["']$/g, ''));
          });
          parent[key] = arr;
        } else {
          parent[key] = val.replace(/^["']|["']$/g, '');
        }
      } else if (content[0] === '-') {
        if (!Array.isArray(parent)) {
          var k = Object.keys(stack[stack.length - 1].obj).pop();
          stack[stack.length - 1].obj[k] = parent = [];
        }
        var v = content.slice(1).trim();
        if (v) {
          parent.push(v.replace(/^["']|["']$/g, ''));
        } else {
          var o = {};
          parent.push(o);
          stack.push({ obj: o, indent: indent });
        }
      }
    }
    return result;
  }
};
