/* ===== 数据引擎 ===== */
var DATA = JSON.parse(document.getElementById('app-data').textContent);
var META = DATA.meta;
var SCENES = DATA.scenes;
var ALLDOCS = [];
SCENES.forEach(function(sc){sc.docs.forEach(function(d){ALLDOCS.push({scene:sc,doc:d});});});
var FLAT=[];
SCENES.forEach(function(sc){
  FLAT.push({id:'sc'+sc.no, ch:sc.no, sec:sc.no, title:'场景'+sc.no+' '+sc.title, path:'场景'+sc.no+' '+sc.title, text:(sc.desc||'')+' '+(sc.flow||[]).join(' ')});
  sc.docs.forEach(function(d){
    var text=[d.title, d.desc||'', (d.rules||[]).join(' '), (d.risks||[]).join(' ')].join(' ');
    (d.steps||[]).forEach(function(s){text+=' '+s.title+' '+(s.desc||'');});
    FLAT.push({id:'doc-'+d.id, ch:sc.no, sec:d.no, title:d.no+' '+d.title, path:'场景'+sc.no+' '+sc.title+' › '+d.no+' '+d.title, text:text});
  });
});

/* ===== 工具 ===== */
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function renderTable(tbl){if(!tbl||!tbl.length)return'';var h='<table><thead><tr>'+tbl[0].map(function(c){return'<th>'+esc(c)+'</th>'}).join('')+'</tr></thead><tbody>';
  for(var i=1;i<tbl.length;i++)h+='<tr>'+tbl[i].map(function(c){return'<td>'+esc(c)+'</td>'}).join('')+'</tr>';return h+'</tbody></table>';}
function bullets(arr){if(!arr||!arr.length)return'';return'<ul style="margin:4px 0 6px 18px;font-size:12.5px">'+arr.map(function(b){return'<li>'+esc(b)+'</li>'}).join('')+'</ul>';}
function renderFlow(steps){if(!steps||!steps.length)return'';return'<div class="flow">'+steps.map(function(s,i){return'<span class="fl">'+esc(s)+'</span>'+(i<steps.length-1?'<span class="fa">→</span>':'')}).join('')+'</div>';}

/* ===== 截图上传（保留） ===== */
function renderShot(shot){
  if(!shot||!shot.no)return'';
  var key='glwd_img_'+shot.no,saved=null;
  try{saved=localStorage.getItem(key)}catch(e){}
  if(saved)return'<div class="shot has-img" data-shot="'+esc(shot.no)+'">'
    +'<div class="shot-img"><img src="'+esc(saved)+'" alt="'+esc(shot.title)+'" onclick="this.classList.toggle(\'full\')"></div>'
    +'<div class="shot-info">📷 FIG.'+esc(shot.no)+' '+esc(shot.title)+'</div>'
    +'<div class="shot-actions"><button class="shot-btn" onclick="replaceShot(\''+esc(shot.no)+'\')">🔄 替换</button><button class="shot-btn" onclick="removeShot(\''+esc(shot.no)+'\')">🗑 删除</button></div></div>';
  return'<div class="shot" data-shot="'+esc(shot.no)+'">'
    +'<div class="shot-placeholder"><span>📷</span><div><b>FIG.'+esc(shot.no)+' '+esc(shot.title)+'</b>'
    +(shot.ui?'<br>界面：'+esc(shot.ui):'')
    +(shot.fields?'<br>字段：'+esc(shot.fields):'')
    +(shot.note?'<br><span class="snote">说明：'+esc(shot.note)+'</span>':'')
    +'</div></div>'
    +'<div style="padding:0 10px 6px"><button class="shot-btn" onclick="uploadShot(\''+esc(shot.no)+'\')">📁 上传截图</button>'
    +'<span class="shot-hint"> 或命名为 <code>FIG.'+esc(shot.no)+'.png</code> 放入 images 文件夹</span></div></div>';
}

/* ===== 场景页（一张大流程图 + 单据列表） ===== */
function renderScene(sc){
  var h='<div class="c-section" id="sec-sc'+sc.no+'">'
    +'<div class="back-link" onclick="go(\'home\')">← 返回首页</div>'
    +'<h2>'+sc.icon+' 场景'+sc.no+'：'+esc(sc.title)+'</h2>';
  h+='<p style="font-size:12.5px;color:var(--m-text-light)">'+esc(sc.desc)+'</p>';
  h+='<h3>🔄 业务流程图</h3>'+renderFlow(sc.flow);
  h+='<h3>📋 涉及单据（'+sc.docs.length+'张）</h3>';
  h+='<table><thead><tr><th style="width:60px">单据</th><th>单据名称</th><th>说明</th><th style="width:80px">操作</th></tr></thead><tbody>';
  sc.docs.forEach(function(d){
    h+='<tr><td><b>'+esc(d.no)+'</b></td><td><b>'+esc(d.title)+'</b></td><td style="font-size:11.5px;color:var(--m-text-light)">'+esc((d.desc||'').slice(0,44))+'…</td>'
      +'<td><button class="qbtn" onclick="go(\'doc-'+esc(d.id)+'\')">进入 →</button></td></tr>';
  });
  h+='</tbody></table></div>';
  return h;
}

/* ===== 单据详情页 ===== */
function renderDoc(sc, d){
  var h='<div class="c-section" id="sec-doc-'+esc(d.id)+'">'
    +'<div class="back-link" onclick="go(\'sc'+sc.no+'\')">← 返回 '+esc(sc.title)+' 场景</div>'
    +'<h2>'+esc(d.no)+' '+esc(d.title)+'</h2>';
  h+='<div class="crumb-inline" style="font-size:11.5px;color:var(--m-text-light);margin-bottom:6px">'+esc(sc.icon)+' '+esc(sc.title)+' › '+esc(d.title)+'</div>';
  if(d.desc)h+='<p style="font-size:12.5px">'+esc(d.desc)+'</p>';
  if(d.rules&&d.rules.length)h+='<h3>📏 业务规则</h3>'+bullets(d.rules);
  if(d.steps&&d.steps.length){
    h+='<h3>👣 操作步骤</h3>';
    d.steps.forEach(function(st,i){
      h+='<div class="step" data-n="'+(i+1)+'"><div class="st">'+esc(st.title)+'</div>'+(st.desc?'<div class="sd">'+esc(st.desc)+'</div>':'')+'</div>';
    });
  }
  if(d.shots&&d.shots.length){
    h+='<h3>📷 截图占位</h3>';
    d.shots.forEach(function(s){h+=renderShot(s);});
  }
  if(d.risks&&d.risks.length)h+='<h3>⚠️ 常见风险</h3>'+d.risks.map(function(r){return'<div class="tip tip-r">'+esc(r)+'</div>'}).join('');
  return h+'</div>';
}

/* ===== 角色 ===== */
var CURRENT_ROLE='all';
var ROLE_DEF={all:{name:'全部',icon:'📋'},ops:{name:'操作人员',icon:'👤'},fin:{name:'财务人员',icon:'💰'},lead:{name:'领导层',icon:'📊'}};

/* ===== 首页（大场景总览） ===== */
function renderHome(){
  var h='<div class="c-section"><h2>📋 慧镕科技 · 金蝶云星空ERP 操作手册</h2>';
  h+='<p style="font-size:12.5px;color:var(--m-text-light)">'+esc(META.notice)+'</p>';
  h+='<h3>🗺️ 业务全景 · 五大场景</h3>';
  h+='<table><thead><tr><th style="width:52px">场景</th><th style="width:22%">业务域</th><th>核心业务流</th><th style="width:80px">操作</th></tr></thead><tbody>';
  SCENES.forEach(function(sc){
    h+='<tr><td><b>'+sc.no+'</b></td><td><b>'+esc(sc.icon)+' '+esc(sc.title)+'</b> <span style="font-size:10.5px;color:var(--m-text-light)">'+sc.docs.length+'单据</span></td>'
      +'<td style="font-size:11.5px">'+renderFlow(sc.flow)+'</td>'
      +'<td><button class="qbtn" onclick="go(\'sc'+sc.no+'\')">进入 →</button></td></tr>';
  });
  h+='</tbody></table></div>';
  h+='<div class="c-section"><h2>📚 单据总目录（'+ALLDOCS.length+'张单据）</h2>';
  h+='<table><thead><tr><th style="width:52px">单据</th><th style="width:24%">单据名称</th><th>所属场景</th><th style="width:80px">操作</th></tr></thead><tbody>';
  ALLDOCS.forEach(function(o){
    h+='<tr><td><b>'+esc(o.doc.no)+'</b></td><td><b>'+esc(o.doc.title)+'</b></td><td style="font-size:11.5px;color:var(--m-text-light)">'+esc(o.scene.icon)+' '+esc(o.scene.title)+'</td>'
      +'<td><button class="qbtn" onclick="go(\'doc-'+esc(o.doc.id)+'\')">进入 →</button></td></tr>';
  });
  h+='</tbody></table></div>';
  return h;
}

/* ===== 渲染入口 ===== */
function renderContent(pageId){
  var main=document.getElementById('mainContent');
  if(!main)return;
  if(pageId==='home')main.innerHTML=renderHome();
  else if(pageId==='flows'){
    var h='<div class="c-section"><h2>🔄 五大场景业务流程图</h2>';
    SCENES.forEach(function(sc){h+='<h3>'+sc.icon+' '+esc(sc.title)+'</h3>'+renderFlow(sc.flow);});
    main.innerHTML=h+'</div>';
  }else if(pageId==='shots'){
    var items=[];
    ALLDOCS.forEach(function(o){(o.doc.shots||[]).forEach(function(s){items.push({no:s.no,scene:o.scene.title,doc:o.doc.title,title:s.title,ui:s.ui||'',did:o.doc.id});});});
    var h='<div class="c-section"><h2>📷 待补截图清单</h2><p style="font-size:12px;color:var(--m-text-light)">共 '+items.length+' 处。已上传的显示 📷 已上传。</p>';
    h+='<table><thead><tr><th>编号</th><th>界面</th><th>所属单据</th><th>状态</th></tr></thead><tbody>';
    items.forEach(function(it){
      var imgSaved=null;try{imgSaved=localStorage.getItem('glwd_img_'+it.no)}catch(e){}
      h+='<tr><td><b>FIG.'+esc(it.no)+'</b></td><td>'+esc(it.title)+'</td><td style="font-size:11.5px">'+esc(it.doc)+'</td><td>'
        +(imgSaved?'<span style="color:var(--m-success);font-weight:600">📷 已上传</span> <a href="javascript:removeShot(\''+esc(it.no)+'\')" style="color:var(--m-danger);font-size:11px">[删]</a>':'<span style="color:var(--m-text-light)">待补</span>')
        +' <a href="#/doc-'+esc(it.did)+'" style="font-size:11px">[查看]</a></td></tr>';
    });
    main.innerHTML=h+'</tbody></table></div>';
  }else if(pageId==='about')main.innerHTML='<div class="c-section"><h2>关于本手册</h2><table><tbody><tr><th style="width:120px">项目</th><td>'+esc(META.project)+'</td></tr><tr><th>适用系统</th><td>'+esc(META.product)+'</td></tr><tr><th>编制单位</th><td>'+esc(META.author)+'</td></tr><tr><th>版本</th><td>'+esc(META.version)+' · '+esc(META.date)+'</td></tr><tr><th>结构</th><td>5大场景 · 26张单据 · 46处待补截图</td></tr></tbody></table></div>';
  else{
    var m=pageId.match(/^sc(\d+)$/);
    if(m){
      var sc=SCENES.filter(function(x){return x.no===parseInt(m[1])})[0];
      main.innerHTML=sc?renderScene(sc):'<div class="c-section"><h2>未找到场景</h2></div>';
    }else{
      var dm=pageId.match(/^doc-(.+)$/);
      if(dm){
        var found=null;
        SCENES.forEach(function(sc2){sc2.docs.forEach(function(d){if(d.id===dm[1])found={scene:sc2,doc:d};});});
        main.innerHTML=found?renderDoc(found.scene,found.doc):'<div class="c-section"><h2>未找到单据</h2></div>';
      }else main.innerHTML='<div class="c-section"><h2>未找到内容</h2></div>';
    }
  }
  window.scrollTo(0,0);
}
/* 搜索索引 */
function searchScope(role){
  if(role==='ops')return FLAT.filter(function(f){return f.ch>=1&&f.ch<=3;});
  if(role==='fin')return FLAT.filter(function(f){return f.ch>=3&&f.ch<=5;});
  if(role==='lead')return FLAT.filter(function(f){return f.ch===1||f.ch===5;});
  return FLAT;
}
