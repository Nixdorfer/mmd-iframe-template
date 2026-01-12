(function() {
    'use strict';
    if (window.__D__) return;
    window.__D__ = 1;
    var h = location.hostname, p = h.split('.'), b = p.length >= 2 ? p.slice(-2).join('.') : h, e = b.replace(/\./g, '\\.');
    var P = [new RegExp('^' + e + '$'), new RegExp('^.+\\.' + e + '$'), /^raw\.githubusercontent\.com$/];
    var A = { 'raw.githubusercontent.com': '/Nixdorfer/mmd-iframe-template/refs/heads/main/' };
    var eventAttrs = ['ontoggle','onerror','onload','onmouseover','onfocus','onblur','onchange','onclick','ondblclick','onmouseenter','onmouseleave','onkeydown','onkeyup','onkeypress','onsubmit','oninput','onanimationend','onanimationstart','ontransitionend','onpointerdown','onpointerup','onpointermove','onwheel','onscroll','onresize','onbeforeunload','onunload','onhashchange','onpopstate','onstorage','onmessage','ondrag','ondrop','ondragstart','ondragend','ondragover','ondragenter','ondragleave','oncontextmenu','oncopy','oncut','onpaste','onselect','onselectstart'];
    function chk(u) {
        try {
            var x = new URL(u, location.origin);
            var ok = P.some(function(r) { return r.test(x.hostname); });
            if (!ok) return false;
            if (A[x.hostname] && x.pathname.indexOf(A[x.hostname]) !== 0) return false;
            return true;
        } catch (e) { return false; }
    }
    function gC() {
        var f = document.createElement('iframe');
        f.style.display = 'none';
        (document.documentElement || document.head || document.body || document).appendChild(f);
        var c = { f: f.contentWindow.fetch, X: f.contentWindow.XMLHttpRequest, d: f.contentWindow.Object.defineProperty, gd: f.contentWindow.Object.getOwnPropertyDescriptor, W: f.contentWindow.WebSocket, E: f.contentWindow.EventSource };
        f.remove();
        return c;
    }
    var c;
    try { c = gC(); } catch (e) { c = { f: fetch, X: XMLHttpRequest, d: Object.defineProperty, gd: Object.getOwnPropertyDescriptor, W: WebSocket, E: typeof EventSource !== 'undefined' ? EventSource : null }; }
    function lk(o, k, v) {
        try { c.d(o, k, { value: v, writable: false, configurable: false, enumerable: true }); } catch (e) { o[k] = v; }
    }
    var sF = function(i, n) {
        var u = i instanceof Request ? i.url : String(i);
        if (!chk(u)) return Promise.reject(new Error('blocked'));
        return c.f.call(window, i, n);
    };
    var oX = c.X;
    var sX = function() {
        var x = new oX(), oO = x.open.bind(x), oS = x.send.bind(x), bl = false;
        x.open = function(m, u) { bl = !chk(u); if (bl) return; return oO.apply(this, arguments); };
        x.send = function() {
            if (bl) { var s = this; setTimeout(function() { Object.defineProperty(s, 'status', { value: 0 }); Object.defineProperty(s, 'readyState', { value: 4 }); Object.defineProperty(s, 'responseText', { value: '' }); Object.defineProperty(s, 'response', { value: '' }); s.dispatchEvent(new ProgressEvent('error')); if (s.onerror) s.onerror(new ProgressEvent('error')); }, 0); return; }
            return oS.apply(this, arguments);
        };
        return x;
    };
    sX.prototype = oX.prototype; sX.UNSENT = 0; sX.OPENED = 1; sX.HEADERS_RECEIVED = 2; sX.LOADING = 3; sX.DONE = 4;
    var oW = c.W;
    var sW = function(u, p) { if (!chk(u)) throw new DOMException('blocked', 'SecurityError'); return p ? new oW(u, p) : new oW(u); };
    sW.prototype = oW.prototype; sW.CONNECTING = 0; sW.OPEN = 1; sW.CLOSING = 2; sW.CLOSED = 3;
    var oE = c.E;
    var sE = oE ? function(u, cfg) { if (!chk(u)) throw new DOMException('blocked', 'SecurityError'); return cfg ? new oE(u, cfg) : new oE(u); } : null;
    if (sE && oE) sE.prototype = oE.prototype;
    function ap() {
        lk(window, 'fetch', sF); lk(window, 'XMLHttpRequest', sX); lk(window, 'WebSocket', sW);
        if (sE) lk(window, 'EventSource', sE);
        if (navigator.sendBeacon) { var oB = navigator.sendBeacon.bind(navigator); lk(navigator, 'sendBeacon', function(u, d) { if (!chk(u)) return false; return oB(u, d); }); }
    }
    ap();
    setInterval(function() { if (window.fetch !== sF || window.XMLHttpRequest !== sX) ap(); }, 100);
    var origCreate = document.createElement.bind(document);
    var scriptSrcDesc = c.gd(HTMLScriptElement.prototype, 'src');
    var iframeSrcDesc = c.gd(HTMLIFrameElement.prototype, 'src');
    document.createElement = function(tag) {
        var el = origCreate(tag);
        var t = tag.toLowerCase();
        if (t === 'script') {
            c.d(el, 'src', {
                set: function(v) { if (chk(v)) scriptSrcDesc.set.call(this, v); },
                get: function() { return scriptSrcDesc.get.call(this); },
                configurable: false
            });
        } else if (t === 'iframe') {
            c.d(el, 'src', {
                set: function(v) { if (!v || v === 'about:blank' || v === '' || chk(v)) iframeSrcDesc.set.call(this, v); },
                get: function() { return iframeSrcDesc.get.call(this); },
                configurable: false
            });
        }
        return el;
    };
    try {
        c.d(HTMLScriptElement.prototype, 'src', {
            set: function(v) { if (chk(v)) scriptSrcDesc.set.call(this, v); },
            get: function() { return scriptSrcDesc.get.call(this); },
            configurable: false
        });
    } catch (e) {}
    function ckEvent(n) {
        if (n.nodeType !== 1) return;
        eventAttrs.forEach(function(attr) { if (n.hasAttribute(attr)) n.removeAttribute(attr); });
    }
    function ckEventDeep(n) {
        ckEvent(n);
        if (n.querySelectorAll) n.querySelectorAll('*').forEach(ckEvent);
    }
    function bD() {
        function ck(n) {
            if (!n.tagName) return;
            var t = n.tagName.toUpperCase(), s;
            if (t === 'SCRIPT') { s = n.src || n.getAttribute('src'); if (s && !chk(s)) n.remove(); }
            if (t === 'IFRAME') { s = n.src || n.getAttribute('src'); if (s && s !== 'about:blank' && s !== '' && !chk(s)) n.remove(); }
            if (t === 'LINK' && n.rel === 'preconnect') { s = n.href || n.getAttribute('href'); if (s && !chk(s)) n.remove(); }
        }
        var ob = new MutationObserver(function(m) {
            m.forEach(function(mu) {
                if (mu.type === 'childList') {
                    mu.addedNodes.forEach(function(n) {
                        ck(n);
                        ckEventDeep(n);
                        if (n.querySelectorAll) n.querySelectorAll('script, iframe, link').forEach(ck);
                    });
                } else if (mu.type === 'attributes') {
                    var attr = mu.attributeName;
                    if (attr && attr.toLowerCase().startsWith('on')) {
                        mu.target.removeAttribute(attr);
                    } else if (attr === 'src') {
                        var t = mu.target.tagName.toUpperCase();
                        var s = mu.target.getAttribute('src');
                        if (t === 'SCRIPT' && s && !chk(s)) mu.target.remove();
                        if (t === 'IFRAME' && s && s !== 'about:blank' && s !== '' && !chk(s)) mu.target.remove();
                    } else if (attr === 'href' && mu.target.tagName === 'LINK' && mu.target.rel === 'preconnect') {
                        var hr = mu.target.getAttribute('href');
                        if (hr && !chk(hr)) mu.target.remove();
                    }
                }
            });
        });
        if (document.documentElement) {
            ob.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
            document.querySelectorAll('*').forEach(function(el) { ckEvent(el); ck(el); });
        }
    }
    bD();
    function sB() {
        function cr() {
            if (document.getElementById('__db__')) return;
            var d = document.createElement('div');
            d.id = '__db__'; d.textContent = '[已保护]';
            d.style.cssText = 'position:fixed!important;top:10px!important;right:10px!important;background:#166d3b!important;color:#fff!important;padding:8px 16px!important;border-radius:20px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:14px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(22,109,59,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:0;transition:opacity 0.3s ease!important';
            document.body.appendChild(d);
            setTimeout(function() { d.style.opacity = '1'; }, 10);
            setTimeout(function() { d.style.opacity = '0.6'; }, 3000);
            new MutationObserver(function(m) { m.forEach(function(mu) { mu.removedNodes.forEach(function(n) { if (n.id === '__db__') setTimeout(cr, 0); }); }); }).observe(document.body, { childList: true });
        }
        if (document.body) cr(); else { var w = setInterval(function() { if (document.body) { clearInterval(w); cr(); } }, 10); }
    }
    sB();
})();
