window.L={
loaded:{},
base:'https://raw.githubusercontent.com/Nixdorfer/mmd-iframe-template/refs/heads/main/',
edit:false,project:'',char:'',user:'',b64:'',
res:window.R||window.innerWidth+'x'+window.innerHeight,
platform:(function(){var w=window.innerWidth,h=window.innerHeight,r=w/h;return Math.abs(r-16/9)<Math.abs(r-9/19)?'pc':'mobile'})(),
load:function(libs,cb){
var self=this,pending=libs.filter(function(n){return!self.loaded[n]});
if(!pending.length)return cb&&cb();
var c=pending.length;
pending.forEach(function(n){
self.loaded[n]=1;
var s=document.createElement('scr'+'ipt');
s.src=self.base+(n==='store'?'library/':'template/modal/v2/library/')+n+'.js?t='+Date.now();
s.onload=function(){if(--c===0&&cb)cb()};
document.head.appendChild(s);
});
}
};
(function(){
console.log('[loader] window.P:',window.P);
var p=window.P;if(!p){console.log('[loader] P is empty, exit');return}
if(p.charAt(0)==='['&&p.charAt(p.length-1)===']')p=p.slice(1,-1);
var m=p.match(/^([^:]+):(.+)$/);
if(!m){document.body.innerHTML='<div style="padding:16px;background:#8b0000;border-radius:8px;color:#fff">格式错误</div>';return}
if(m[1]==='EDIT'){
L.edit=true;var m2=m[2].match(/^([^:]+):(.+)$/);
if(!m2){document.body.innerHTML='<div style="padding:16px;background:#8b0000;border-radius:8px;color:#fff">格式错误</div>';return}
L.project=m2[1];var params=m2[2].split(';;');L.char=params[0]||'';L.user=params[1]||'';L.b64=params[2]||'';
}else{L.edit=false;L.project=m[1];var params=m[2].split(';;');L.char=params[0]||'';L.user=params[1]||'';L.b64=params[2]||''}
document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff">加载中...</div>';
fetch(L.base+'navigator.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(nav){
var idx=nav.projects[L.project]?.index;
if(!idx){document.body.innerHTML='<div style="padding:16px;background:#8b0000;border-radius:8px;color:#fff">未找到: '+L.project+'</div>';return}
fetch(L.base+idx+'?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(h){
console.log('[loader] project:',h);
var cfg='<scr'+'ipt>window.L='+JSON.stringify({loaded:{},base:L.base,edit:L.edit,project:L.project,char:L.char,user:L.user,b64:L.b64,res:L.res,platform:L.platform})+';L.load=function(libs,cb){var self=this,pending=libs.filter(function(n){return!self.loaded[n]});if(!pending.length)return cb&&cb();var c=pending.length;pending.forEach(function(n){self.loaded[n]=1;var s=document.createElement("scr"+"ipt");s.src=self.base+(n==="store"?"library/":"template/modal/v2/library/")+n+".js?t="+Date.now();s.onload=function(){if(--c===0&&cb)cb()};document.head.appendChild(s)})};'+'</scr'+'ipt>';
console.log('[loader] cfg:',cfg);
if(L.edit){
fetch(L.base+'template/modal/v2/library/editor.html?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(ed){
console.log('[loader] editor:',ed);
document.open();document.write(cfg+h+ed);document.close();
}).catch(function(e){console.log('[loader] editor error:',e);document.open();document.write(cfg+h);document.close()});
}else{document.open();document.write(cfg+h);document.close()}
}).catch(function(){document.body.innerHTML='<div style="padding:16px;background:#8b0000;border-radius:8px;color:#fff">加载失败</div>'});
}).catch(function(){document.body.innerHTML='<div style="padding:16px;background:#8b0000;border-radius:8px;color:#fff">导航失败</div>'});
})();
