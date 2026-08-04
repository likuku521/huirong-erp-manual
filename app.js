/* ===== 数据 ===== */
function findDoc(id){
  var found=null;
  SCENES.forEach(function(sc){sc.docs.forEach(function(d){if(d.id===id)found={scene:sc,doc:d};});});
  return found;
}

/* ===== LANDING 入口选择 ===== */
var LANDING_CARDS=[
  {role:'ops',icon:'👤',t:'操作人员',d:'生产计划、采购、仓库、销售、质检业务操作',count:'21张单据 · 生产/采购/销售'},
  {role:'fin',icon:'💰',t:'财务人员',d:'成本核算、资产验收、关衡对接',count:'9张单据 · 成本/关衡'},
  {role:'lead',icon:'📊',t:'领导层',d:'五大场景总览、业务规则、风险控制',count:'5大场景全景'},
  {role:'all',icon:'📋',t:'全部内容',d:'浏览全部26张单据与完整手册',count:'全部26张单据'}
];
function renderLanding(){
  var h='';
  LANDING_CARDS.forEach(function(c){
    h+='<div class="role-card" onclick="enterApp(\''+c.role+'\')">'
      +'<div class="role-icon">'+c.icon+'</div><h3>'+c.t+'</h3><p>'+c.d+'</p>'
      +'<div class="module-count">'+c.count+'</div></div>';
  });
  document.getElementById('landingCards').innerHTML=h;
}
function enterApp(role){
  CURRENT_ROLE=role;
  try{localStorage.setItem('glwd_role',role)}catch(e){}
  document.getElementById('landing').style.display='none';
  document.getElementById('app').style.display='block';
  boot();
  go('home');
}

/* ===== 启动 ===== */
function boot(){
  updateRoleBadge();
  buildNav();renderContent('home');route();
  window.addEventListener('hashchange',route);
  document.getElementById('q').addEventListener('input',onSearch);
  document.getElementById('backBtn').addEventListener('click',goBack);
  document.addEventListener('click',function(e){
    if(!e.target.closest('.search-box'))document.getElementById('searchResults').classList.remove('active');
    if(!e.target.closest('.role-switch'))document.getElementById('roleMenu').classList.remove('open');
  });
  window.addEventListener('scroll',function(){var b=document.getElementById('btt');if(b)b.classList.toggle('show',window.scrollY>300)});
  initRipple();
}
function updateRoleBadge(){
  var names={all:'📋 全部',ops:'👤 操作人员',fin:'💰 财务人员',lead:'📊 领导层'};
  var b=document.getElementById('roleBadge');
  b.className='role-badge rb-'+CURRENT_ROLE;
  b.textContent=names[CURRENT_ROLE]+' ▾';
  document.querySelectorAll('.role-menu-item[data-role]').forEach(function(m){
    m.style.background=m.dataset.role===CURRENT_ROLE?'var(--m-hover)':'';
    m.style.fontWeight=m.dataset.role===CURRENT_ROLE?'600':'';
  });
}
function toggleRoleMenu(){document.getElementById('roleMenu').classList.toggle('open');}
function switchRole(r){
  CURRENT_ROLE=r;
  try{localStorage.setItem('glwd_role',r)}catch(e){}
  document.getElementById('roleMenu').classList.remove('open');
  updateRoleBadge();
  buildNav();
  go('home');
}
function goHome(){go('home');}
function go(h){location.hash='#/'+h.replace(/^\//,'');}
function goBack(){
  var h=location.hash.replace('#/','')||'home';
  if(h.match(/^doc-/)){var f=findDoc(h.replace('doc-',''));if(f)go('sc'+f.scene.no);}
  else if(h.match(/^sc\d+$/))go('home');
  else history.back();
}
function goPrev(){var cur=location.hash.replace('#/','')||'home';var idx=-1;for(var i=0;i<ALL_NAV.length;i++)if(ALL_NAV[i].k===cur){idx=i;break}if(idx>0)go(ALL_NAV[idx-1].k);}
function goNext(){var cur=location.hash.replace('#/','')||'home';var idx=-1;for(var i=0;i<ALL_NAV.length;i++)if(ALL_NAV[i].k===cur){idx=i;break}if(idx>=0&&idx<ALL_NAV.length-1)go(ALL_NAV[idx+1].k);}

/* ===== 路由 ===== */
function route(){
  var h=location.hash.replace('#/','')||'home';
  renderContent(h);
  /* 顶栏标题 + 返回按钮 */
  var backBtn=document.getElementById('backBtn');
  var title='慧镕科技 · 操作手册';
  if(h.match(/^sc\d+$/)){
    var sc=SCENES.filter(function(x){return x.no===parseInt(h.replace('sc',''))})[0];
    if(sc){title=sc.icon+' 场景'+sc.no+'：'+sc.title;backBtn.style.display='flex';}
  }else if(h.match(/^doc-/)){
    var f=findDoc(h.replace('doc-',''));
    if(f){title=f.doc.no+' '+f.doc.title;backBtn.style.display='flex';}
  }else if(h==='flows'){title='🔄 业务流程总览';backBtn.style.display='flex';}
  else if(h==='shots'){title='📷 截图清单';backBtn.style.display='flex';}
  else if(h==='about'){title='ℹ️ 关于';backBtn.style.display='flex';}
  else{title='慧镕科技 · 操作手册';backBtn.style.display='none';}
  document.getElementById('topTitle').textContent=title;
  document.querySelectorAll('.nav-item').forEach(function(a){a.classList.remove('active')});
  var el=document.querySelector('[data-nav="'+h+'"]');
  if(el)el.classList.add('active');
  var idx=-1;for(var i=0;i<ALL_NAV.length;i++)if(ALL_NAV[i].k===h){idx=i;break}
  document.getElementById('prevBtn').disabled=idx<=0;
  document.getElementById('nextBtn').disabled=idx>=ALL_NAV.length-1;
}

/* ===== 导航（分组平铺） ===== */
var ALL_NAV=[];
function buildNav(){
  var role=CURRENT_ROLE,items=[],all=[];
  items.push({t:'首页',ic:'🏠',k:'home',badge:''});
  all.push({t:'首页',k:'home'});
  function addScene(sc){
    items.push({t:sc.title,ic:sc.icon,k:'sc'+sc.no,badge:sc.docs.length+'单据'});
    all.push({t:sc.title,k:'sc'+sc.no});
    sc.docs.forEach(function(d){
      items.push({t:d.no+' '+d.title,ic:'▫',k:'doc-'+d.id,badge:(d.shots||[]).length?'📷'+d.shots.length:''});
      all.push({t:d.title,k:'doc-'+d.id});
    });
  }
  if(role==='ops'){
    items.push({t:'生产与采购',ic:'',k:'',badge:'',grp:1});
    SCENES.forEach(function(sc){if(sc.no<=2)addScene(sc);});
    items.push({t:'销售',ic:'',k:'',badge:'',grp:1});
    SCENES.forEach(function(sc){if(sc.no===3)addScene(sc);});
  }else if(role==='fin'){
    items.push({t:'采购与成本',ic:'',k:'',badge:'',grp:1});
    SCENES.forEach(function(sc){if(sc.no===1||sc.no===4||sc.no===5)addScene(sc);});
  }else if(role==='lead'){
    items.push({t:'五大场景',ic:'',k:'',badge:'',grp:1});
    SCENES.forEach(function(sc){
      items.push({t:'场景'+sc.no+' '+sc.title,ic:sc.icon,k:'sc'+sc.no,badge:''});
      all.push({t:sc.title,k:'sc'+sc.no});
    });
  }else{
    SCENES.forEach(function(sc){
      items.push({t:'场景'+sc.no+' '+sc.title,ic:'',k:'',badge:'',grp:1});
      addScene(sc);
    });
  }
  items.push({t:'速查',ic:'',k:'',badge:'',grp:1});
  [{t:'业务流程总览',ic:'🔄',k:'flows',badge:''},{t:'截图清单',ic:'📷',k:'shots',badge:'45处'},{t:'关于',ic:'ℹ️',k:'about',badge:''}].forEach(function(it){items.push({t:it.t,ic:it.ic,k:it.k,badge:it.badge});all.push({t:it.t,k:it.k});});
  ALL_NAV=all;
  var h='',inGroup=false;
  items.forEach(function(it){
    if(it.grp){if(inGroup)h+='</div>';h+='<div class="nav-group"><div class="nav-group-title">'+esc(it.t)+'</div>';inGroup=true;}
    else{
      h+='<div class="nav-item" data-nav="'+esc(it.k)+'" onclick="go(\''+esc(it.k)+'\')">'
        +(it.ic?'<span class="nav-icon">'+it.ic+'</span>':'')
        +esc(it.t)
        +(it.badge?'<span class="nav-badge'+(it.badge.indexOf('📷')>=0?' b-hot':'')+'">'+esc(it.badge)+'</span>':'')
        +'</div>';
    }
  });
  if(inGroup)h+='</div>';
  document.getElementById('navRoot').innerHTML=h;
}

/* ===== 搜索 ===== */
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
      matches.push({id:f.id,title:f.title,path:f.path,snippet:snippet});
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
    box.innerHTML='<div class="search-result-item"><div class="sr-title" style="color:var(--m-text-light)">没找到相关的，换个关键词试试？</div></div>';
  }
  box.classList.add('active');
}

/* ===== 截图上传 ===== */
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

/* ===== 启动入口：始终先显示 landing 选择页 ===== */
window.addEventListener('DOMContentLoaded',function(){
  renderLanding();
  /* 高亮上次选择的角色卡（提示记忆，但不自动进入） */
  var saved=null;try{saved=localStorage.getItem('glwd_role')}catch(e){}
  if(saved==='ops'||saved==='fin'||saved==='lead'||saved==='all'){
    document.querySelectorAll('.role-card').forEach(function(c){
      var r=c.getAttribute('onclick').match(/'(\w+)'/)[1];
      if(r===saved){c.style.outline='2px solid var(--m-primary)';c.style.outlineOffset='2px';}
    });
  }
});
