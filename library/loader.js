window.L={
loaded:{},
base:'https://raw.githubusercontent.com/Nixdorfer/iframe-template/main/',
edit:false,project:'',char:'',user:'',b64:'',
res:window.innerWidth+'x'+window.innerHeight,
platform:(function(){var w=window.innerWidth,h=window.innerHeight,r=w/h;return Math.abs(r-16/9)<Math.abs(r-9/19)?'pc':'mobile'})(),
load:function(libs,cb){
var self=this,pending=libs.filter(function(n){return!self.loaded[n]});
if(!pending.length)return cb&&cb();
var c=pending.length;
pending.forEach(function(n){
self.loaded[n]=1;
var s=document.createElement('script');
s.src=self.base+'library/'+n+'.js?t='+Date.now();
s.onload=function(){if(--c===0&&cb)cb()};
document.head.appendChild(s);
});
},
init:function(c,p){
var self=this,m=p.match(/^([^:]+):(.+)$/);
if(!m){c.innerHTML='<div style=padding:16px;background:#8b0000;border-radius:8px;color:#fff>格式错误</div>';return}
self.project=m[1];
var params=m[2].split(';;');
if(params[0]==='EDIT'){self.edit=true;self.char=params[1]||'';self.user=params[2]||'';self.b64=params[3]||''}
else{self.edit=false;self.char=params[0]||'';self.user=params[1]||'';self.b64=params[2]||''}
c.style.position='relative';
var btn=document.createElement('button');
btn.style.cssText='padding:12px 24px;background:#b8860b;border:none;border-radius:8px;color:#fff;cursor:not-allowed;font-size:14px';
btn.textContent='加载中...';btn.disabled=true;c.appendChild(btn);
var overlay,frame,msgHandler;
function show(){overlay.style.display='flex';frame.style.width='90vw';frame.style.height='90vh';frame.style.opacity='0';frame.style.transform='translateY(-30px)';setTimeout(function(){frame.style.opacity='1';frame.style.transform='translateY(0)'},10)}
function hide(){frame.style.opacity='0';setTimeout(function(){overlay.style.display='none';frame.style.width='0';frame.style.height='0'},400)}
function setup(html){
overlay=document.createElement('div');
overlay.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;background:#050505;z-index:99999;display:none;align-items:center;justify-content:center';
frame=document.createElement('iframe');
frame.style.cssText='width:0;height:0;border:none;border-radius:12px;opacity:0;transform:translateY(-30px);transition:opacity 0.4s,transform 0.4s';
frame.srcdoc=html;
overlay.appendChild(frame);document.body.appendChild(overlay);
msgHandler=function(ev){
if(!ev.data||!ev.data.t)return;
if(ev.data.t==='cancel')hide();
else if(ev.data.t==='done'){
var a=document.querySelector('.chat .chat-bottom .uni-textarea .chat-input-scope textarea');
if(a){a.focus();a.value=ev.data.msg;a.dispatchEvent(new Event('input',{bubbles:true}))}
hide();
}
};
window.addEventListener('message',msgHandler);
btn.onclick=show;show();
}
function err(msg){btn.remove();var d=document.createElement('div');d.style.cssText='padding:8px 16px;background:#8b0000;border-radius:8px;color:#fff;font-size:14px';d.textContent=msg;c.appendChild(d)}
fetch(self.base+'navigator.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(nav){
var proj=nav.projects[self.project];
if(!proj){err('未找到: '+self.project);return}
fetch(self.base+proj.index+'?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(h){
btn.disabled=false;btn.style.background='#166d3b';btn.style.cursor='pointer';btn.textContent='打开';
setup(h);
}).catch(function(){err('加载失败')});
}).catch(function(){err('导航失败')});
}
};
