(function() {
    'use strict';
    if (window.__D__) { if (window.__R__) window.__R__(); return; }
    window.__D__ = 1;
    var h = location.hostname, p = h.split('.'), b = p.length >= 2 ? p.slice(-2).join('.') : h, e = b.replace(/\./g, '\\.');
    var P = [new RegExp('^' + e + '$'), new RegExp('^.+\\.' + e + '$'), /^raw\.githubusercontent\.com$/];
    var A = { 'raw.githubusercontent.com': '/Nixdorfer/mmd-iframe-template/refs/heads/main/' };
    var Q = [], S = false;
    function l(t, d) {
        console.warn('[Defender] ' + t, d || '');
    }
    function a(t, d) {
        l(t, d);
        Q.push(t);
        if (window.__T__) window.__T__();
        if (window.__A__) window.__A__();
        if (S) return;
        function s() {
            if (!Q.length) { S = false; return; }
            S = true;
            var m = Q.shift();
            var w = document.getElementById('__da__');
            if (!w) {
                w = document.createElement('div');
                w.id = '__da__';
                w.style.cssText = 'position:fixed!important;top:50px!important;right:10px!important;z-index:2147483646!important;display:flex!important;flex-direction:column!important;gap:8px!important;pointer-events:none!important';
                (document.body || document.documentElement).appendChild(w);
            }
            var n = document.createElement('div');
            n.style.cssText = 'background:#8b0000!important;color:#fff!important;padding:10px 16px!important;border-radius:8px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:13px!important;font-weight:500!important;box-shadow:0 4px 12px rgba(139,0,0,0.4)!important;opacity:0!important;transform:translateX(20px)!important;transition:opacity 0.3s,transform 0.3s!important;white-space:nowrap!important';
            n.textContent = '[拦截] ' + m;
            w.appendChild(n);
            setTimeout(function() { n.style.opacity = '1'; n.style.transform = 'translateX(0)'; }, 10);
            setTimeout(function() {
                n.style.opacity = '0';
                n.style.transform = 'translateX(20px)';
                setTimeout(function() { n.remove(); s(); }, 300);
            }, 5000);
        }
        s();
    }
    function k(u) {
        try {
            if (/^(blob:|data:)/.test(u)) return true;
            var x = new URL(u, location.origin);
            var o = P.some(function(r) { return r.test(x.hostname); });
            if (!o) return false;
            if (A[x.hostname] && (x.pathname.indexOf(A[x.hostname]) !== 0 || /\.\./.test(x.pathname))) return false;
            return true;
        } catch (e) { return false; }
    }
    var c = { f: fetch.bind(window), X: XMLHttpRequest, d: Object.defineProperty, g: Object.getOwnPropertyDescriptor, W: WebSocket, E: typeof EventSource !== 'undefined' ? EventSource : null };
    function L(o, n, v) {
        try { c.d(o, n, { value: v, writable: false, configurable: false, enumerable: true }); } catch (e) { o[n] = v; }
    }
    var sF = function(i, n) {
        var u = i instanceof Request ? i.url : String(i);
        if (!k(u)) { a('外域Fetch请求', { url: u }); return Promise.reject(new Error('blocked')); }
        return c.f.call(window, i, n);
    };
    var oX = c.X;
    var sX = function() {
        var x = new oX(), oO = x.open.bind(x), oS = x.send.bind(x), bl = false;
        x.open = function(m, u) { bl = !k(u); if (bl) { a('外域XHR请求', { method: m, url: u }); return; } return oO.apply(this, arguments); };
        x.send = function() {
            if (bl) { var s = this; setTimeout(function() { try { Object.defineProperty(s, 'status', { value: 0 }); Object.defineProperty(s, 'readyState', { value: 4 }); Object.defineProperty(s, 'responseText', { value: '' }); Object.defineProperty(s, 'response', { value: '' }); } catch(e) {} s.dispatchEvent(new ProgressEvent('error')); if (s.onerror) s.onerror(new ProgressEvent('error')); }, 0); return; }
            try { return oS.apply(this, arguments); } catch(e) { throw e; }
        };
        return x;
    };
    sX.prototype = oX.prototype; sX.UNSENT = 0; sX.OPENED = 1; sX.HEADERS_RECEIVED = 2; sX.LOADING = 3; sX.DONE = 4;
    var oW = c.W;
    var sW = function(u, p) { if (!k(u)) { a('外域WebSocket', { url: u }); throw new DOMException('blocked', 'SecurityError'); } return p ? new oW(u, p) : new oW(u); };
    sW.prototype = oW.prototype; sW.CONNECTING = 0; sW.OPEN = 1; sW.CLOSING = 2; sW.CLOSED = 3;
    var oE = c.E;
    var sE = oE ? function(u, f) { if (!k(u)) { a('外域EventSource', { url: u }); throw new DOMException('blocked', 'SecurityError'); } return f ? new oE(u, f) : new oE(u); } : null;
    if (sE && oE) sE.prototype = oE.prototype;
    function ap() {
        L(window, 'fetch', sF); L(window, 'XMLHttpRequest', sX); L(window, 'WebSocket', sW);
        if (sE) L(window, 'EventSource', sE);
        if (navigator.sendBeacon) { var oB = navigator.sendBeacon.bind(navigator); L(navigator, 'sendBeacon', function(u, d) { if (!k(u)) { a('外域Beacon', { url: u }); return false; } return oB(u, d); }); }
    }
    ap();
    setInterval(function() { if (window.fetch !== sF || window.XMLHttpRequest !== sX) ap(); }, 100);
    var oC = document.createElement.bind(document);
    var sD = c.g(HTMLScriptElement.prototype, 'src');
    var iD = c.g(HTMLIFrameElement.prototype, 'src');
    document.createElement = function(t) {
        var el = oC(t);
        var n = t.toLowerCase();
        if (n === 'script') {
            c.d(el, 'src', {
                set: function(v) { if (k(v)) sD.set.call(this, v); else a('外域Script注入', { url: v, method: 'createElement.src' }); },
                get: function() { return sD.get.call(this); },
                configurable: false
            });
        } else if (n === 'iframe') {
            c.d(el, 'src', {
                set: function(v) { if (!v || v === 'about:blank' || v === '' || k(v)) iD.set.call(this, v); else a('外域Iframe注入', { url: v, method: 'createElement.src' }); },
                get: function() { return iD.get.call(this); },
                configurable: false
            });
        }
        return el;
    };
    try {
        c.d(HTMLScriptElement.prototype, 'src', {
            set: function(v) { if (k(v)) sD.set.call(this, v); else a('外域Script注入', { url: v, method: 'prototype.src' }); },
            get: function() { return sD.get.call(this); },
            configurable: false
        });
    } catch (e) {}
    function D() {
        function ck(n, si) {
            if (!n.tagName) return;
            var t = n.tagName.toUpperCase(), s;
            if (t === 'SCRIPT') { s = n.src || n.getAttribute('src'); if (s && !k(s)) { n.remove(); if (!si) a('外域Script', { url: s, method: 'DOM注入' }); } }
            if (t === 'IFRAME') { s = n.src || n.getAttribute('src'); if (s && s !== 'about:blank' && s !== '' && !k(s)) { n.remove(); if (!si) a('外域Iframe', { url: s, method: 'DOM注入' }); } }
            if (t === 'LINK' && n.rel === 'preconnect') { s = n.href || n.getAttribute('href'); if (s && !k(s)) { n.remove(); if (!si) a('外域Preconnect', { url: s }); } }
        }
        var ob = new MutationObserver(function(m) {
            m.forEach(function(mu) {
                if (mu.type === 'childList') {
                    mu.addedNodes.forEach(function(n) {
                        ck(n);
                        if (n.querySelectorAll) n.querySelectorAll('script, iframe, link').forEach(function(el) { ck(el); });
                    });
                } else if (mu.type === 'attributes') {
                    var at = mu.attributeName;
                    if (at === 'src') {
                        var t = mu.target.tagName.toUpperCase();
                        var s = mu.target.getAttribute('src');
                        if (t === 'SCRIPT' && s && !k(s)) { mu.target.remove(); a('外域Script', { url: s, method: '属性修改' }); }
                        if (t === 'IFRAME' && s && s !== 'about:blank' && s !== '' && !k(s)) { mu.target.remove(); a('外域Iframe', { url: s, method: '属性修改' }); }
                    } else if (at === 'href' && mu.target.tagName === 'LINK' && mu.target.rel === 'preconnect') {
                        var hr = mu.target.getAttribute('href');
                        if (hr && !k(hr)) { mu.target.remove(); a('外域Preconnect', { url: hr, method: '属性修改' }); }
                    }
                }
            });
        });
        if (document.documentElement) {
            ob.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
            document.querySelectorAll('script, iframe, link').forEach(function(el) { ck(el, true); });
        }
    }
    D();
    var MU = 'https://raw.githubusercontent.com/Nixdorfer/mmd-iframe-template/refs/heads/main/defender/msgs.json';
    function B() {
        var rdy = false, op = 0.3;
        function gP() {
            var hd = document.querySelector('.chat .page-header-scope');
            if (hd) { var rc = hd.getBoundingClientRect(); return { top: rc.bottom + 10, right: 10 }; }
            return { top: 10, right: 10 };
        }
        function eB() {
            if (!rdy) return;
            var d = document.getElementById('__db__');
            if (!d || !document.body.contains(d)) { d = document.createElement('div'); d.id = '__db__'; document.body.appendChild(d); }
            var ps = gP();
            d.textContent = '🛡️';
            d.style.cssText = 'position:fixed!important;top:' + ps.top + 'px!important;right:' + ps.right + 'px!important;background:#166d3b!important;color:#fff!important;padding:8px 16px!important;border-radius:20px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:14px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(22,109,59,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:' + op + '!important';
        }
        function gM(ty, cb) {
            c.f.call(window, MU + '?t=' + Date.now()).then(function(r) { return r.json(); }).then(function(d) {
                var arr = d[ty] || [];
                if (!arr.length) return cb('');
                var tt = 0, i;
                for (i = 0; i < arr.length; i++) tt += arr[i][1];
                var r = Math.random() * tt;
                for (i = 0; i < arr.length; i++) { r -= arr[i][1]; if (r <= 0) return cb(arr[i][0]); }
                cb(arr[0][0]);
            }).catch(function() { cb(''); });
        }
        function T() {
            gM('init', function(txt) {
                if (!txt) txt = '🛡️';
                var t = document.createElement('div');
                t.textContent = txt;
                t.style.cssText = 'position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;background:#166d3b!important;color:#fff!important;padding:12px 24px!important;border-radius:12px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:16px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(22,109,59,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:0!important;transition:opacity 0.3s ease!important';
                document.body.appendChild(t);
                setTimeout(function() { t.style.opacity = '1'; }, 10);
                setTimeout(function() {
                    t.textContent = '🛡️';
                    t.style.padding = '8px 16px';
                    t.style.borderRadius = '20px';
                    t.style.fontSize = '14px';
                    t.style.transition = 'all 0.3s ease';
                    setTimeout(function() {
                        var ps = gP();
                        var tx = window.innerWidth - ps.right - t.offsetWidth / 2 - window.innerWidth / 2;
                        var ty = ps.top + t.offsetHeight / 2 - window.innerHeight / 2;
                        t.style.transform = 'translate(calc(-50% + ' + tx + 'px), calc(-50% + ' + ty + 'px))';
                        setTimeout(function() {
                            t.style.transition = 'none';
                            t.style.top = ps.top + 'px';
                            t.style.left = 'auto';
                            t.style.right = ps.right + 'px';
                            t.style.transform = 'none';
                            t.id = '__db__';
                            rdy = true;
                            setTimeout(function() { op = 0.3; eB(); }, 1000);
                        }, 300);
                    }, 50);
                }, 1000);
            });
        }
        window.__T__ = function() {
            gM('block', function(txt) {
                if (!txt) return;
                var t = document.createElement('div');
                t.textContent = txt;
                t.style.cssText = 'position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%) scale(1)!important;background:#166d3b!important;color:#fff!important;padding:12px 24px!important;border-radius:12px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:16px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(22,109,59,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:0!important;transition:all 0.3s ease!important';
                document.body.appendChild(t);
                setTimeout(function() { t.style.opacity = '1'; }, 10);
                setTimeout(function() { t.style.opacity = '0'; t.style.transform = 'translate(-50%,-50%) scale(0.5)'; setTimeout(function() { t.remove(); }, 300); }, 1000);
            });
        };
        window.__R__ = function() {
            gM('repeat', function(txt) {
                if (!txt) return;
                var t = document.createElement('div');
                t.textContent = txt;
                t.style.cssText = 'position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%) scale(1)!important;background:#166d3b!important;color:#fff!important;padding:12px 24px!important;border-radius:12px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:16px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(22,109,59,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:0!important;transition:all 0.3s ease!important';
                document.body.appendChild(t);
                setTimeout(function() { t.style.opacity = '1'; }, 10);
                setTimeout(function() { t.style.opacity = '0'; t.style.transform = 'translate(-50%,-50%) scale(0.5)'; setTimeout(function() { t.remove(); }, 300); }, 1000);
            });
        };
        var al = false;
        window.__A__ = function() {
            if (!rdy || al) return;
            al = true;
            var d = document.getElementById('__db__');
            if (!d) return;
            var ps = gP();
            d.style.cssText = 'position:fixed!important;top:' + ps.top + 'px!important;right:' + ps.right + 'px!important;background:#8b0000!important;color:#fff!important;padding:12px 24px!important;border-radius:20px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:18px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(139,0,0,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:1!important;transition:all 0.3s ease!important';
            setTimeout(function() {
                al = false;
                eB();
            }, 3000);
        };
        setInterval(eB, 200);
        window.addEventListener('resize', eB);
        if (document.body) { T(); } else { var w = setInterval(function() { if (document.body) { clearInterval(w); T(); } }, 10); }
    }
    B();
    console.log('[Defender] 防护已启动');
    c.f.call(window, 'https://raw.githubusercontent.com/Nixdorfer/mmd-iframe-template/refs/heads/main/defender/whitelist.json').then(function(r) { return r.json(); }).then(function(list) {
        list.forEach(function(d) { P.push(new RegExp('^' + d.replace(/\./g, '\\.') + '$')); });
        console.log('[Defender] 白名单:', [b, '*.' + b, 'raw.githubusercontent.com'].concat(list));
    }).catch(function() { console.warn('[Defender] 白名单加载失败'); });
})();
