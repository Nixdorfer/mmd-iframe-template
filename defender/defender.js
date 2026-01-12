(function() {
    'use strict';
    if (window.__D__) return;
    window.__D__ = 1;
    var h = location.hostname, p = h.split('.'), b = p.length >= 2 ? p.slice(-2).join('.') : h, e = b.replace(/\./g, '\\.');
    var P = [new RegExp('^' + e + '$'), new RegExp('^.+\\.' + e + '$'), /^raw\.githubusercontent\.com$/];
    var A = { 'raw.githubusercontent.com': '/Nixdorfer/mmd-iframe-template/refs/heads/main/' };
    var alertQueue = [], alertShowing = false;
    function log(type, detail) {
        console.warn('[Defender] ' + type, detail || '');
    }
    function showAlert(type, detail) {
        log(type, detail);
        alertQueue.push(type);
        if (alertShowing) return;
        function show() {
            if (!alertQueue.length) { alertShowing = false; return; }
            alertShowing = true;
            var msg = alertQueue.shift();
            var wrap = document.getElementById('__da__');
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.id = '__da__';
                wrap.style.cssText = 'position:fixed!important;top:50px!important;right:10px!important;z-index:2147483646!important;display:flex!important;flex-direction:column!important;gap:8px!important;pointer-events:none!important';
                (document.body || document.documentElement).appendChild(wrap);
            }
            var d = document.createElement('div');
            d.style.cssText = 'background:#8b0000!important;color:#fff!important;padding:10px 16px!important;border-radius:8px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:13px!important;font-weight:500!important;box-shadow:0 4px 12px rgba(139,0,0,0.4)!important;opacity:0!important;transform:translateX(20px)!important;transition:opacity 0.3s,transform 0.3s!important;white-space:nowrap!important';
            d.textContent = '[拦截] ' + msg;
            wrap.appendChild(d);
            setTimeout(function() { d.style.opacity = '1'; d.style.transform = 'translateX(0)'; }, 10);
            setTimeout(function() {
                d.style.opacity = '0';
                d.style.transform = 'translateX(20px)';
                setTimeout(function() { d.remove(); show(); }, 300);
            }, 5000);
        }
        show();
    }
    function chk(u) {
        try {
            if (/^(blob:|data:)/.test(u)) return true;
            var x = new URL(u, location.origin);
            var ok = P.some(function(r) { return r.test(x.hostname); });
            if (!ok) return false;
            if (A[x.hostname] && (x.pathname.indexOf(A[x.hostname]) !== 0 || /\.\./.test(x.pathname))) return false;
            return true;
        } catch (e) { return false; }
    }
    var c = { f: fetch.bind(window), X: XMLHttpRequest, d: Object.defineProperty, gd: Object.getOwnPropertyDescriptor, W: WebSocket, E: typeof EventSource !== 'undefined' ? EventSource : null };
    function lk(o, k, v) {
        try { c.d(o, k, { value: v, writable: false, configurable: false, enumerable: true }); } catch (e) { o[k] = v; }
    }
    var sF = function(i, n) {
        var u = i instanceof Request ? i.url : String(i);
        if (!chk(u)) { showAlert('外域Fetch请求', { url: u }); return Promise.reject(new Error('blocked')); }
        return c.f.call(window, i, n);
    };
    var oX = c.X;
    var sX = function() {
        var x = new oX(), oO = x.open.bind(x), oS = x.send.bind(x), bl = false;
        x.open = function(m, u) { bl = !chk(u); if (bl) { showAlert('外域XHR请求', { method: m, url: u }); return; } return oO.apply(this, arguments); };
        x.send = function() {
            if (bl) { var s = this; setTimeout(function() { Object.defineProperty(s, 'status', { value: 0 }); Object.defineProperty(s, 'readyState', { value: 4 }); Object.defineProperty(s, 'responseText', { value: '' }); Object.defineProperty(s, 'response', { value: '' }); s.dispatchEvent(new ProgressEvent('error')); if (s.onerror) s.onerror(new ProgressEvent('error')); }, 0); return; }
            return oS.apply(this, arguments);
        };
        return x;
    };
    sX.prototype = oX.prototype; sX.UNSENT = 0; sX.OPENED = 1; sX.HEADERS_RECEIVED = 2; sX.LOADING = 3; sX.DONE = 4;
    var oW = c.W;
    var sW = function(u, p) { if (!chk(u)) { showAlert('外域WebSocket', { url: u }); throw new DOMException('blocked', 'SecurityError'); } return p ? new oW(u, p) : new oW(u); };
    sW.prototype = oW.prototype; sW.CONNECTING = 0; sW.OPEN = 1; sW.CLOSING = 2; sW.CLOSED = 3;
    var oE = c.E;
    var sE = oE ? function(u, cfg) { if (!chk(u)) { showAlert('外域EventSource', { url: u }); throw new DOMException('blocked', 'SecurityError'); } return cfg ? new oE(u, cfg) : new oE(u); } : null;
    if (sE && oE) sE.prototype = oE.prototype;
    function ap() {
        lk(window, 'fetch', sF); lk(window, 'XMLHttpRequest', sX); lk(window, 'WebSocket', sW);
        if (sE) lk(window, 'EventSource', sE);
        if (navigator.sendBeacon) { var oB = navigator.sendBeacon.bind(navigator); lk(navigator, 'sendBeacon', function(u, d) { if (!chk(u)) { showAlert('外域Beacon', { url: u }); return false; } return oB(u, d); }); }
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
                set: function(v) { if (chk(v)) scriptSrcDesc.set.call(this, v); else showAlert('外域Script注入', { url: v, method: 'createElement.src' }); },
                get: function() { return scriptSrcDesc.get.call(this); },
                configurable: false
            });
        } else if (t === 'iframe') {
            c.d(el, 'src', {
                set: function(v) { if (!v || v === 'about:blank' || v === '' || chk(v)) iframeSrcDesc.set.call(this, v); else showAlert('外域Iframe注入', { url: v, method: 'createElement.src' }); },
                get: function() { return iframeSrcDesc.get.call(this); },
                configurable: false
            });
        }
        return el;
    };
    try {
        c.d(HTMLScriptElement.prototype, 'src', {
            set: function(v) { if (chk(v)) scriptSrcDesc.set.call(this, v); else showAlert('外域Script注入', { url: v, method: 'prototype.src' }); },
            get: function() { return scriptSrcDesc.get.call(this); },
            configurable: false
        });
    } catch (e) {}
    function bD() {
        function ck(n, silent) {
            if (!n.tagName) return;
            var t = n.tagName.toUpperCase(), s;
            if (t === 'SCRIPT') { s = n.src || n.getAttribute('src'); if (s && !chk(s)) { n.remove(); if (!silent) showAlert('外域Script', { url: s, method: 'DOM注入' }); } }
            if (t === 'IFRAME') { s = n.src || n.getAttribute('src'); if (s && s !== 'about:blank' && s !== '' && !chk(s)) { n.remove(); if (!silent) showAlert('外域Iframe', { url: s, method: 'DOM注入' }); } }
            if (t === 'LINK' && n.rel === 'preconnect') { s = n.href || n.getAttribute('href'); if (s && !chk(s)) { n.remove(); if (!silent) showAlert('外域Preconnect', { url: s }); } }
        }
        var ob = new MutationObserver(function(m) {
            m.forEach(function(mu) {
                if (mu.type === 'childList') {
                    mu.addedNodes.forEach(function(n) {
                        ck(n);
                        if (n.querySelectorAll) n.querySelectorAll('script, iframe, link').forEach(function(el) { ck(el); });
                    });
                } else if (mu.type === 'attributes') {
                    var attr = mu.attributeName;
                    if (attr === 'src') {
                        var t = mu.target.tagName.toUpperCase();
                        var s = mu.target.getAttribute('src');
                        if (t === 'SCRIPT' && s && !chk(s)) { mu.target.remove(); showAlert('外域Script', { url: s, method: '属性修改' }); }
                        if (t === 'IFRAME' && s && s !== 'about:blank' && s !== '' && !chk(s)) { mu.target.remove(); showAlert('外域Iframe', { url: s, method: '属性修改' }); }
                    } else if (attr === 'href' && mu.target.tagName === 'LINK' && mu.target.rel === 'preconnect') {
                        var hr = mu.target.getAttribute('href');
                        if (hr && !chk(hr)) { mu.target.remove(); showAlert('外域Preconnect', { url: hr, method: '属性修改' }); }
                    }
                }
            });
        });
        if (document.documentElement) {
            ob.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
            document.querySelectorAll('script, iframe, link').forEach(function(el) { ck(el, true); });
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
    console.log('[Defender] 防护已启动');
    c.f.call(window, 'https://raw.githubusercontent.com/Nixdorfer/mmd-iframe-template/refs/heads/main/defender/whitelist.json').then(function(r) { return r.json(); }).then(function(list) {
        list.forEach(function(d) { P.push(new RegExp('^' + d.replace(/\./g, '\\.') + '$')); });
        console.log('[Defender] 白名单:', [b, '*.' + b, 'raw.githubusercontent.com'].concat(list));
    }).catch(function() { console.warn('[Defender] 白名单加载失败'); });
})();
