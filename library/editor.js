window.Editor={
cfg:null,sel:null,panel:null,pages:1,
init:function(url,pages){
var self=this;
self.pages=pages||1;
fetch(url).then(function(r){return r.json()}).then(function(j){self.cfg=j;self.bind()});
},
bind:function(){
var self=this;
document.addEventListener('click',function(e){
var t=e.target,el=t.closest('[data-mod]');
if(el&&!self.panel?.contains(t)){self.sel=el;self.show(el.dataset.mod,el)}
else if(self.panel&&!self.panel.contains(t))self.hide()
});
},
show:function(type,el){
var self=this,m=this.cfg[type];
if(!m)return;
this.hide();
var cfg=el.dataset.cfg?JSON.parse(el.dataset.cfg):{};
var p=document.createElement('div');
p.className='ed-panel';
p.innerHTML='<div class="ed-hd"><span>'+m.name+'</span><div><button class="ed-sv">&#10003;</button><button class="ed-cl">&#10005;</button></div></div><div class="ed-bd"></div>';
var b=p.querySelector('.ed-bd');
Object.keys(m.props).forEach(function(k){
var prop=m.props[k],v=cfg[k]!==undefined?cfg[k]:'';
b.innerHTML+=self.ctrl(k,prop,v)
});
p.querySelector('.ed-cl').onclick=function(){self.hide()};
p.querySelector('.ed-sv').onclick=function(){self.save()};
this.pos(p,el);
document.body.appendChild(p);
this.panel=p;
this.bindc(el,cfg)
},
hide:function(){
if(this.panel){this.panel.remove();this.panel=null}
},
ctrl:function(k,prop,v){
var h='<div class="ed-r"><label>'+prop.desc+(prop.nullable?'':'*')+'</label>';
if(prop.display==='input')h+='<input data-p="'+k+'" value="'+U.esc(String(v||prop.default||''))+'">';
else if(prop.display==='select'){
h+='<select data-p="'+k+'">';
(prop.range||[]).forEach(function(o){h+='<option'+(String(o)===String(v||prop.default)?' selected':'')+'>'+o+'</option>'});
h+='</select>'
}
else if(prop.display==='page'){
h+='<select data-p="'+k+'"><option value="0"'+(v===0?' selected':'')+'>无</option>';
for(var i=1;i<=this.pages;i++)h+='<option value="'+i+'"'+(v===i?' selected':'')+'>第'+i+'页</option>';
h+='</select>'
}
else if(prop.display==='slider'){
var rg=(prop.range||'0-100').split('-'),dv=v!==undefined&&v!==''?v:(prop.default||rg[0]);
h+='<input type="range" data-p="'+k+'" min="'+rg[0]+'" max="'+rg[1]+'" value="'+dv+'"><span class="ed-v">'+dv+'</span>'
}
else if(prop.display==='toggle')h+='<input type="checkbox" data-p="'+k+'"'+((v!==undefined?v:prop.default)?' checked':'')+'>';
else if(prop.display==='upload')h+='<div class="ed-up"><input type="file" data-p="'+k+'" accept="image/*"><span class="ed-uv">'+(v||'未选择')+'</span></div>';
h+='</div>';
return h
},
bindc:function(el,cfg){
var self=this;
this.panel.querySelectorAll('[data-p]').forEach(function(c){
if(c.type==='file'){
c.onchange=function(){
var f=c.files[0];if(!f)return;
var sp=c.nextElementSibling;sp.textContent='上传中...';
var fd=new FormData();
fd.append('suffix',f.name.split('.').pop());
fd.append('file',f,'file-'+Date.now());
fetch('https://sexyai.top/api/file/upload',{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(d){
if(d.url){cfg[c.dataset.p]=d.url;el.dataset.cfg=JSON.stringify(cfg);sp.textContent=d.url.split('/').pop();self.apply(el,c.dataset.p,d.url)}
else sp.textContent='失败'
}).catch(function(){sp.textContent='失败'})
}
}else{
c.oninput=c.onchange=function(){
var v=c.type==='checkbox'?c.checked:c.type==='range'?parseInt(c.value):c.value;
if(c.tagName==='SELECT'&&c.dataset.p==='page')v=parseInt(v);
if(c.type==='range')c.nextElementSibling.textContent=v;
cfg[c.dataset.p]=v;
el.dataset.cfg=JSON.stringify(cfg);
self.apply(el,c.dataset.p,v)
}
}
})
},
apply:function(el,k,v){
if(k==='color'&&v)el.style.color='#'+v;
if(k==='value')el.textContent=v;
if(k==='size'){var img=el.querySelector('img');if(img)img.style.width=v+'%'}
if(k==='url'){var img=el.querySelector('img');if(img)img.src=v}
if(k==='align'){el.classList.remove('left','center','right');el.classList.add(v)}
},
pos:function(p,el){
var r=el.getBoundingClientRect();
p.style.left=Math.min(r.right+10,window.innerWidth-260)+'px';
p.style.top=Math.max(r.top,10)+'px'
},
collect:function(){
var els=[];
document.querySelectorAll('[data-mod]').forEach(function(el){
if(el.dataset.mod==='global')return;
var c=el.dataset.cfg?JSON.parse(el.dataset.cfg):{};
c.type=el.dataset.mod;
els.push(c)
});
var g=document.querySelector('[data-mod="global"]');
return{global:g&&g.dataset.cfg?JSON.parse(g.dataset.cfg):{},elements:els}
},
save:function(){
var d=this.collect();
var b64=btoa(unescape(encodeURIComponent(JSON.stringify(d))));
navigator.clipboard.writeText(b64).then(function(){
var t=document.createElement('div');
t.className='ed-toast';
t.textContent='已复制';
document.body.appendChild(t);
setTimeout(function(){t.remove()},2000)
});
return b64
},
css:[
'.ed-panel{position:fixed;width:240px;background:#1a1a1a;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.5);z-index:10000;font-size:13px;color:#fff}',
'.ed-hd{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #333}',
'.ed-hd button{background:none;border:none;color:#888;cursor:pointer;font-size:14px;padding:2px 6px}',
'.ed-hd button:hover{color:#fff}',
'.ed-bd{padding:12px;max-height:60vh;overflow-y:auto}',
'.ed-r{margin-bottom:10px}',
'.ed-r label{display:block;color:#888;margin-bottom:4px;font-size:12px}',
'.ed-r input,.ed-r select{width:100%;padding:6px 8px;background:#0d0d0d;border:1px solid #333;border-radius:4px;color:#fff;font-size:13px;box-sizing:border-box}',
'.ed-r input[type=range]{padding:0;height:20px}',
'.ed-r input[type=checkbox]{width:auto}',
'.ed-v{color:#888;font-size:12px;margin-left:8px}',
'.ed-up{display:flex;align-items:center;gap:8px}',
'.ed-up input[type=file]{width:auto;padding:4px}',
'.ed-uv{color:#888;font-size:11px;word-break:break-all}',
'.ed-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#166d3b;color:#fff;padding:8px 20px;border-radius:4px;z-index:10001}'
].join('')
};
