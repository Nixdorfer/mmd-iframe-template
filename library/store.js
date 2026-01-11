window.initStore = function(f) {
	var K = "editorGallery";
	var g = function() { var s = localStorage.getItem(K); return s ? JSON.parse(s) : []; };
	return function(ev) {
		var t = ev.data.t, i, x;
		if (t === "store:load") {
			f.contentWindow.postMessage({t: "store:data", items: g()}, "*");
		} else if (t === "store:add") {
			i = g(); x = i.reduce(function(m, v) { return Math.max(m, v.id || 0); }, 0) + 1;
			ev.data.item.id = x; i.push(ev.data.item);
			localStorage.setItem(K, JSON.stringify(i));
			f.contentWindow.postMessage({t: "store:added", id: x}, "*");
		} else if (t === "store:put") {
			i = g(); x = i.findIndex(function(v) { return v.id === ev.data.item.id; });
			if (x >= 0) i[x] = ev.data.item;
			localStorage.setItem(K, JSON.stringify(i));
			f.contentWindow.postMessage({t: "store:updated"}, "*");
		} else if (t === "store:delete") {
			i = g().filter(function(v) { return v.id !== ev.data.id; });
			localStorage.setItem(K, JSON.stringify(i));
			f.contentWindow.postMessage({t: "store:deleted"}, "*");
		}
	};
};
