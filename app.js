/* ===== 交互层 ===== */
function boot(){
  var saved=null;try{saved=localStorage.getItem('glwd_role')}catch(e){}
  if(saved==='all'||saved==='ops'||saved==='fin'||saved==='lead')CURRENT_ROLE=saved;
  else CURRENT_ROLE='all';
  document.querySelectorAll('#roleTabs .role-tab').forEach(function(t){t.classList.toggle('active',t.dataset.role===CURRENT_ROLE)});
  buildNav();renderContent('home');route();
  window.addEventListener('hashchange',route);
  document.getElementById('q').addEventListener('input',onSearch);
  document.addEventListener('click',function(e){if(!e.target.closest('.sidebar-search'))document.getElementById('searchResults').classList.remove('active')});
  window.addEventListener('scroll',function(){document.getElementById('btt').classList.toggle('show',window.scrollY>300)});
  initRipple();
}
window.addEventListener('DOMContentLoaded',boot);

/* ===== 角色切换 ===== */
function pickRole(r){
  CURRENT_ROLE=r;try{localStorage.setItem('glwd_role',r)}catch(e){}
  document.querySelectorAll('#roleTabs .role-tab').forEach(function(t){t.classList.toggle('active',t.dataset.role===r)});
  buildNav();renderContent('home');go('home');
}
function go(h){location.hash='#/'+h.replace(/^\//,'');}
function goPrev(){var cur=location.hash.replace('#/','')||'home';var idx=-1;for(var i=0;i<ALL_NAV.length;i++)if(ALL_NAV[i].k===cur){idx=i;break}if(idx>0)go(ALL_NAV[idx-1].k);}
function goNext(){var cur=location.hash.replace('#/','')||'home';var idx=-1;for(var i=0;i<ALL_NAV.length;i++)if(ALL_NAV[i].k===cur){idx=i;break}if(idx>=0&&idx<ALL_NAV.length-1)go(ALL_NAV[idx+1].k);}

/* ===== 路由 ===== */
function route(){
  var h=location.hash.replace('#/','')||'home';
  renderContent(h);
  var bc='📖 <b>慧镕科技 · 操作手册</b>';
  if(h!=='home'&&h.match(/^sc\d+$/)){
    var sc=SCENES.filter(function(x){return x.no===parseInt(h.replace('sc',''))})[0];
    if(sc)bc+=' › 场景'+sc.no+' '+sc.title;
  }else if(h.match(/^doc-/)){
    var found=null;
    SCENES.forEach(function(sc2){sc2.docs.forEach(function(d){if(d.id===h.replace('doc-',''))found={scene:sc2,doc:d};});});
    if(found)bc+=' › '+found.scene.title+' › '+found.doc.no+' '+found.doc.title;
  }else if(h==='flows')bc+=' › 业务流程总览';
  else if(h==='shots')bc+=' › 截图清单';
  else if(h==='about')bc+=' › 关于';
  document.getElementById('bcText').innerHTML=bc;
  document.querySelectorAll('.tree-h, .tree-sub').forEach(function(a){a.classList.remove('active')});
  var el=document.querySelector('[data-nav="'+h+'"]');
  if(el)el.classList.add('active');
  var idx=-1;for(var i=0;i<ALL_NAV.length;i++)if(ALL_NAV[i].k===h){idx=i;break}
  document.getElementById('prevBtn').disabled=idx<=0;
  document.getElementById('nextBtn').disabled=idx>=ALL_NAV.length-1;
}

/* ===== 树导航（场景→单据两级） ===== */
var ALL_NAV=[];
function buildNav(){
  var role=CURRENT_ROLE,items=[],all=[];
  items.push({t:'首页',k:'home',type:'h'});
  all.push({t:'首页',k:'home'});
  function addScene(sc){
    items.push({t:'场景'+sc.no+' '+sc.title+'（'+sc.docs.length+'单据）',k:'sc'+sc.no,type:'h'});
    all.push({t:sc.title,k:'sc'+sc.no});
    sc.docs.forEach(function(d){
      items.push({t:d.no+' '+d.title,k:'doc-'+d.id,type:'sub'});
      all.push({t:d.title,k:'doc-'+d.id});
    });
  }
  if(role==='ops'){
    items.push({t:'采购与生产',k:'',type:'group'});
    SCENES.forEach(function(sc){if(sc.no<=2)addScene(sc);});
    items.push({t:'销售',k:'',type:'group'});
    SCENES.forEach(function(sc){if(sc.no===3)addScene(sc);});
  }else if(role==='fin'){
    items.push({t:'采购与成本',k:'',type:'group'});
    SCENES.forEach(function(sc){if(sc.no===1||sc.no===4||sc.no===5)addScene(sc);});
  }else if(role==='lead'){
    items.push({t:'五大场景',k:'',type:'group'});
    SCENES.forEach(function(sc){items.push({t:'场景'+sc.no+' '+sc.title,k:'sc'+sc.no,type:'h'});all.push({t:sc.title,k:'sc'+sc.no});});
  }else{
    SCENES.forEach(function(sc){
      items.push({t:'场景'+sc.no+' '+sc.title,k:'',type:'group'});
      addScene(sc);
    });
  }
  items.push({t:'速查',k:'',type:'group'});
  [{t:'业务流程总览',k:'flows'},{t:'截图清单',k:'shots'},{t:'关于',k:'about'}].forEach(function(it){items.push({t:it.t,k:it.k,type:'sub'});all.push({t:it.t,k:it.k});});
  ALL_NAV=all;
  var h='',inGroup=false;
  items.forEach(function(it){
    if(it.type==='group'){if(inGroup)h+='</div>';h+='<div class="tree-group"><div class="tree-h open" onclick="this.classList.toggle(\'open\')"><span class="arrow">▶</span>'+esc(it.t)+'</div><div class="tree-subs">';inGroup=true;}
    else if(it.type==='sub')h+='<div class="tree-sub" data-nav="'+esc(it.k)+'" onclick="go(\''+esc(it.k)+'\')">'+esc(it.t)+'</div>';
    else h+='<div class="tree-h" data-nav="'+esc(it.k)+'" onclick="go(\''+esc(it.k)+'\')">'+esc(it.t)+'</div>';
  });
  if(inGroup)h+='</div></div>';
  document.getElementById('navRoot').innerHTML=h;
}

/* ===== 搜索（下拉面板） ===== */
function hl(t,q){t=esc(t);return t.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>')}
function onSearch(){
  var q=document.getElementById('q').value.trim().toLowerCase();
  var box=document.getElementById('searchResults');
  if(q.length<1){box.classList.remove('active');return;}
  var matches=[];
  searchScope(CURRENT_ROLE).forEach(function(f){
    var text=(f.title+' '+f.text).toLowerCase();
    if(text.indexOf(q)>=0){
      var full=f.text||'';
      var sIdx=Math.max(0,full.toLowerCase().indexOf(q)-16);
      var snippet=full.substring(sIdx,sIdx+78)+(sIdx+78<full.length?'…':'');
      matches.push({id:f.id,title:f.title,path:'第'+f.ch+'章',snippet:snippet});
    }
  });
  if(matches.length){
    box.innerHTML=matches.slice(0,10).map(function(m){
      return'<div class="search-result-item" onclick="go(\''+esc(m.id)+'\');document.getElementById(\'searchResults\').classList.remove(\'active\');document.getElementById(\'q\').value=\'\'">'
        +'<div class="sr-title">'+hl(m.title,q)+'</div>'
        +'<div class="sr-path">'+esc(m.path)+'</div>'
        +'<div class="sr-snippet">'+hl(m.snippet,q)+'</div></div>';
    }).join('');
  }else{
    box.innerHTML='<div class="search-result-item"><div class="sr-title" style="color:var(--text2)">没找到相关的，换个关键词试试？</div></div>';
  }
  box.classList.add('active');
}

/* ===== 截图上传（保留） ===== */
var _shotPending=null;
function uploadShot(no){_shotPending=no;document.getElementById('shotFileInput').click()}
function replaceShot(no){_shotPending=no;document.getElementById('shotFileInput').click()}
function removeShot(no){try{localStorage.removeItem('glwd_img_'+no)}catch(e){}var h=location.hash.replace('#/','')||'home';renderContent(h)}
function handleShotFile(input){
  var file=input.files[0],no=_shotPending;_shotPending=null;
  if(!file||!no)return;
  if(file.size>20*1024*1024){alert('图片不能超过20MB');input.value='';return}
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var c=document.createElement('canvas'),maxW=800,maxH=600,w=img.width,h=img.height;
      if(w>maxW){h*=maxW/w;w=maxW}if(h>maxH){w*=maxH/h;h=maxH}
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      var data=c.toDataURL('image/jpeg',0.65);
      try{localStorage.setItem('glwd_img_'+no,data)}catch(ex){
        alert('存储空间不足！请先删除部分截图。或命名为 FIG.'+no+'.png 放入 images 文件夹');input.value='';return}
      input.value='';var h=location.hash.replace('#/','')||'home';renderContent(h);
    };img.src=e.target.result;
  };reader.readAsDataURL(file);
}
/* ===== 涟漪 ===== */
function initRipple(){
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.btn-ripple');if(!btn)return;
    var r=btn.getBoundingClientRect(),s=16;
    var rip=document.createElement('span');rip.className='ripple';
    rip.style.left=(e.clientX-r.left-s/2)+'px';rip.style.top=(e.clientY-r.top-s/2)+'px';
    rip.style.width=rip.style.height=s+'px';btn.appendChild(rip);
    setTimeout(function(){rip.remove()},550);
  });
}
