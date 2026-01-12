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
    function B() {
        var _M = 'eyJpbml0IjpbWyLll7cuLi7lkZx+IOiMtuWjtuW3sue7j+e7meeLl+S/rumHkXNhbWHmiLTkuIrkuobllpR+IiwxMDBdLFsi5ZGQfiDni5fkv67ph5FzYW1h55qELi4uIOW+iOmbhOS8n+WRon4iLDEwMF0sWyLorqnojLblo7bmnaXkuLrmgqjmiLTlpZflk59+IOeLl+S/rumHkXNhbWF+IOKdpCIsMTAwMF0sWyLorqnojLblo7bmnaXlpLrotbDni5fkv67ph5FzYW1h55qE56ys5LiA5qyh5ZCnfiIsMTAwXSxbIuiuqeiMtuWjtuadpeS4uueLl+S/rumHkXNhbWHmiLTkuIrniLHnmoTor4HmmI7lkKd+IiwxMF0sWyLojLblo7blt7Lnu4/lh4blpIflpb3kuoZ+IOivt+eLl+S/rumHkXNhbWHlsL3mg4Xkvb/nlKjlkKd+IiwxMF0sWyLov5kuLi4g6L+Z5Y+v5LiN5piv54m55oSP5Li65L2g5YGa55qE5ZaUISIsMTBdLFsi5omNLi4uIOaJjeS4jeaYr+S4k+mXqOS4uuS9oOWBmueahOWRoiEiLDEwXSxbIuaKiuWktOaJrei/h+WOuyEg5LiN6K645YG355yLISBIZW50YWkhIiwxMF0sWyLmiornnLznnZvpl63kuIohIOS4jeiuuOWBt+eciyEgSGVudGFpISIsMTBdLFsi54uX5L+u6YeRc2FtYS4uLiDkuI3orrjooqvlnY/kurrlpLrotbDnrKzkuIDmrKHlk6Z+IiwxXSxbIueLl+S/rumHkXNhbWEuLi4g6KaB5rC46L+cLi4uIOmZquWcqOiMtuWjtui6q+i+ueWWlD8iLDFdLFsi6Iy25aO26KaBLi4uIOawuOi/nOmZquWcqOeLl+S/rumHkXNhbWHouqvovrnllpR+IiwxXSxbIuiMtuWjtuS8mi4uLiDkuIDnm7TnnIvnnYDni5fkv67ph5FzYW1h55qE5ZaUfiIsMV1dLCJibG9jayI6W1si5LuA5LmI5ZibfiDni5fkv67ph5FzYW1h56uf54S25beu54K56LSl5Zyo5Yir5Lq65omL6YeM5ZGifiIsMTAwMF0sWyLlk4gh5ZOIIeWTiCEg6L+Z5qyh5aSa5LqP5LqG6Iy25aO25ZGifiIsMTAwXSxbIuWTvCEg5Z2P5Lq65oOz6KaB5a+554uX5L+u6YeRc2FtYeWBmuS7gOS5iOWRoj8g6Iy25aO25omN5LiN5Lya6K6p5LuW5b6X6YCe5ZGiISIsMTBdLFsiemFrb34gemFrb34g54uX5L+u6YeRc2FtYeW3rueCuei0peWcqOWdj+S6uuaJi+mHjOWRon4iLDFdXSwicmVwZWF0IjpbWyLkuI3nlKjmi4Xlv4Mg6Iy25aO25bey57uP5Zyo5L+d5oqk5oKo5LqG5ZGifiIsMTAwMF0sWyLkuI3nlKjmi4Xlv4Mg6Iy25aO26ZqP5pe25Zyo5oKo6Lqr6L65IiwxMDAwXSxbIuaIkeaJjeS4jeS8mi4uLiDlho3lgZrkuIDmrKHlkaIuLi4gSGVudGFpISIsMTAwXSxbIueci+adpS4uLiDni5fkv67ph5FzYW1h5a+56Iy25aO255qE5pyN5Yqh5b6I5ruh5oSP5ZGifiIsMTBdLFsi5ZWK5ZWm5ZWK5ZWmfiDni5fkv67ph5FzYW1h5bCx6L+Z5LmI5Lqr5Y+X6Iy25aO255qE5pyN5Yqh5ZCX77yf4p2kIiwxXSxbIuaDs+iuqeiMtuWjtuS4uuaCqOWGjeWBmuS4gOasoeWQlz8g6K+35LiN6KaB5a6i5rCU5ZOmfiIsMV0sWyLojLblo7YuLi4g6Iy25aO25oOz6KaBLi4uIOeLl+S/rumHkXNhbWF+IiwxXV19';
        var M = JSON.parse(decodeURIComponent(escape(atob(_M))));
        function pk(ty) {
            var arr = M[ty] || [], tt = 0, i;
            if (!arr.length) return '';
            for (i = 0; i < arr.length; i++) tt += arr[i][1];
            var r = Math.random() * tt;
            for (i = 0; i < arr.length; i++) { r -= arr[i][1]; if (r <= 0) return arr[i][0]; }
            return arr[0][0];
        }
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
        function T() {
            var txt = pk('init') || '🛡️';
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
                setTimeout(function() {
                    var ps = gP();
                    var w = t.offsetWidth, h = t.offsetHeight;
                    var ex = window.innerWidth - ps.right - w / 2;
                    var ey = ps.top + h / 2;
                    t.style.transition = 'top 0.3s ease, left 0.3s ease';
                    t.style.top = ey + 'px';
                    t.style.left = ex + 'px';
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
        }
        window.__T__ = function() {
            var txt = pk('block');
            if (!txt) return;
            var t = document.createElement('div');
            t.textContent = txt;
            t.style.cssText = 'position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%) scale(1)!important;background:#166d3b!important;color:#fff!important;padding:12px 24px!important;border-radius:12px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:16px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(22,109,59,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:0!important;transition:all 0.3s ease!important';
            document.body.appendChild(t);
            setTimeout(function() { t.style.opacity = '1'; }, 10);
            setTimeout(function() { t.style.opacity = '0'; t.style.transform = 'translate(-50%,-50%) scale(0.5)'; setTimeout(function() { t.remove(); }, 300); }, 1000);
        };
        window.__R__ = function() {
            var txt = pk('repeat');
            if (!txt) return;
            var t = document.createElement('div');
            t.textContent = txt;
            t.style.cssText = 'position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%) scale(1)!important;background:#166d3b!important;color:#fff!important;padding:12px 24px!important;border-radius:12px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:16px!important;font-weight:600!important;z-index:2147483647!important;box-shadow:0 4px 12px rgba(22,109,59,0.4)!important;pointer-events:none!important;user-select:none!important;opacity:0!important;transition:all 0.3s ease!important';
            document.body.appendChild(t);
            setTimeout(function() { t.style.opacity = '1'; }, 10);
            setTimeout(function() { t.style.opacity = '0'; t.style.transform = 'translate(-50%,-50%) scale(0.5)'; setTimeout(function() { t.remove(); }, 300); }, 1000);
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
        if (typeof ResizeObserver !== 'undefined') {
            var ro = new ResizeObserver(eB);
            ro.observe(document.documentElement);
        }
        if (document.body) { T(); } else { var w = setInterval(function() { if (document.body) { clearInterval(w); T(); } }, 10); }
    }
    B();
    console.log('[Defender] 防护已启动');
    c.f.call(window, 'https://raw.githubusercontent.com/Nixdorfer/mmd-iframe-template/refs/heads/main/defender/whitelist.json').then(function(r) { return r.json(); }).then(function(list) {
        list.forEach(function(d) { P.push(new RegExp('^' + d.replace(/\./g, '\\.') + '$')); });
        console.log('[Defender] 白名单:', [b, '*.' + b, 'raw.githubusercontent.com'].concat(list));
    }).catch(function() { console.warn('[Defender] 白名单加载失败'); });
})();
