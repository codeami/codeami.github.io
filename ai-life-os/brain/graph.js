/* The second brain: the AIO prototype's ring map, fed only public data (brain-data.json).
   It is the chart of Chart & Cards, the base layer of the whole site. brain/index.html shows it alone; on every other
   page hud.js mounts it behind the page, which then reads as an overlay on top of it.
   var g=AIOBrain({base:"<url of brain/>", framed:bool, onPage:fn(url)->bool});
   g.select(url) highlights a page's node; g.setInsets(bottom) keeps the map clear of a bottom sheet;
   g.overlay(on) hides the right skills deck while a page overlay covers it.
   The map lives in a shadow root, so the site's CSS and its own names never clash. */
window.AIOBrain=function(opts){
"use strict";
opts=opts||{};
var BASE=opts.base||"",FRAMED=!!opts.framed;
var host=document.createElement("div");host.id="brainHost";if(FRAMED)host.className="framed";
var shadow=host.attachShadow({mode:"open"});
var NAV=FRAMED?"":'<nav class="nav" aria-label="Site"><span class="vtag">v1.0</span>'+
  '<a class="btn" href="../../index.html">whoami</a><a class="btn" href="../index.html">AI-Life-OS</a>'+
  '<a class="btn" href="../blog/index.html">Field Notes</a><a class="btn" href="../course/index.html">Course</a><a class="btn" href="index.html" aria-current="page">Second Brain</a>'+
  '<a class="btn" href="https://github.com/codeami/codeami.github.io">GitHub</a></nav>';
shadow.innerHTML='<link rel="stylesheet" href="'+BASE+'graph.css">'+
  '<div id="stage"><canvas id="cv" role="img" aria-label="Second brain map: a centre rules file linked to rooms of public notes, harness parts and posts, with a ring of skills and a ring of pages and projects. The side lists hold the same items as buttons."></canvas></div>'+
  '<div id="side" hidden><aside class="side-col" id="wl" aria-label="Reading order, pages and projects">'+
  '<section class="wd"><h2>Reading order</h2><ul id="sRead"></ul></section><section class="wd"><h2>Pages and projects</h2><ul id="sApps"></ul></section>'+
  '<section class="wd"><h2>FirstMate in detail</h2><ul id="sFm"></ul></section></aside>'+
  '<aside class="side-col" id="wr" aria-label="Skills"><section class="wd"><h2>Skills deck</h2><ul id="sSkills"></ul></section></aside></div>'+
  '<div class="title"'+(FRAMED?' hidden':'')+'><b>A<i>I</i>-LIFE-OS</b><span>SECOND BRAIN</span><small id="src">loading…</small></div>'+
  '<div class="top">'+NAV+'<button class="btn" id="motionBtn" type="button" aria-pressed="true">Motion on</button>'+
  '<button class="btn" id="sideBtn" type="button" aria-expanded="false" aria-controls="side">&#9638; Widgets</button>'+
  '<button class="btn" id="menuBtn" type="button" aria-expanded="true" aria-controls="panel">&#9776; Menu</button></div>'+
  '<aside id="panel" aria-label="Second brain controls"><h3>Search</h3>'+
  '<input type="search" id="q" placeholder="Search notes, skills, pages…  (⌘K or /)" aria-label="Search the map" aria-keyshortcuts="Meta+K Control+K /">'+
  '<div id="hits" aria-live="polite"></div><h3>Layout</h3><div class="seg" id="layouts" role="group" aria-label="Layout">'+
  '<button class="btn" data-l="force">Force</button><button class="btn" data-l="circle">Circle</button><button class="btn" data-l="hex">Hex</button><button class="btn" data-l="rings">Rings</button></div>'+
  '<h3>View</h3><div class="seg two" id="views" role="group" aria-label="View"><button class="btn" data-v="departments">Departments</button><button class="btn" data-v="folders">Folders</button></div>'+
  '<h3>Motion</h3><div class="row"><span>Ring spin</span><output id="spinO">0.05</output></div>'+
  '<input type="range" id="spin" min="0" max="0.2" step="0.01" value="0.05" aria-label="Ring spin">'+
  '<label class="ck"><input type="checkbox" id="motion"> Animate (spin, drift)</label><label class="ck"><input type="checkbox" id="names"> Names on dots</label>'+
  '<div class="row"><span>Link springs</span><output id="springO">0.50</output></div><input type="range" id="spring" min="0" max="1" step="0.01" value="0.5" aria-label="Link springs">'+
  '<div class="row"><span>Circle / Hex size</span><output id="sizeO">0.60</output></div><input type="range" id="size" min="0.2" max="1.2" step="0.01" value="0.6" aria-label="Circle and hex size">'+
  '<div class="pair"><button class="btn" id="expand">Expand all</button><button class="btn" id="collapse">Collapse all</button></div></aside>'+
  '<div id="card" role="status"></div><button class="btn" id="legendBtn" type="button" aria-expanded="false" aria-controls="legend">&#9670; Legend</button>'+
  '<div id="legend" hidden></div><div class="hint">drag to pan &middot; wheel to zoom &middot; click a dot for its card &middot; double-click a room to fold it</div>'+
  '<div class="sr" id="live" aria-live="polite"></div>';
document.body.insertBefore(host,document.body.firstChild);
var $=function(id){return shadow.getElementById(id)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
var TAU=Math.PI*2;
var mq=window.matchMedia?matchMedia("(prefers-reduced-motion: reduce)"):{matches:false};
/* Motion: reduced motion turns it off by default; the Motion button overrides that, and is remembered */
var MKEY="brain-motion";
function savedMotion(){try{var v=localStorage.getItem(MKEY);return v==="on"?true:v==="off"?false:null}catch(e){return null}}
function setMotion(on,remember){S.motion=on;$("motion").checked=on;var b=$("motionBtn");b.textContent=on?"Motion on":"Motion off";b.setAttribute("aria-pressed",String(on));
  if(remember)try{localStorage.setItem(MKEY,on?"on":"off")}catch(e){}dirty=true}
var INS={bottom:0}; // screen space a bottom sheet covers; the map centres above it
/* Course lessons: course/index.html keeps progress under CKEY; a lesson's dot stays grey until it is done */
var CKEY="ai-course:v1",lit={};
function readLit(){lit={};try{var s=JSON.parse(localStorage.getItem(CKEY)||"null");if(s&&s.done)for(var k in s.done)lit[k]=1}catch(e){}dirty=true}
window.addEventListener("storage",function(e){if(e.key===CKEY)readLit()});

/* ---------- data ---------- */
function validData(d){return d&&Array.isArray(d.rooms)&&d.rooms.length&&d.root&&Array.isArray(d.skills)}
// every link in the data is relative to brain/: make it absolute, so the map works mounted on any page
function absolute(d,from){
  function a(u){try{return new URL(u,from).href}catch(e){return u}}
  function ls(list){(list||[]).forEach(function(l){if(Array.isArray(l))l[1]=a(l[1]);else if(l.href)l.href=a(l.href)})}
  ls(d.root.links);
  d.rooms.forEach(function(r){ls(r.links);r.folders.forEach(function(f){(f.files||[]).forEach(function(x){if(x.url)x.url=a(x.url);ls(x.links)})})});
  (d.skills||[]).concat(d.apps||[],d.projects||[],d.pages||[],d.reading||[]).forEach(function(x){if(x.url)x.url=a(x.url)});
  return d;
}
function boot(){
  // public data only: brain-data.json, built by build_data.py from this site's public files
  function fail(){$("src").textContent="the map data could not load: serve the folder (python3 -m http.server) rather than opening the file"}
  if(!window.fetch)return fail();
  var url=new URL(BASE+"brain-data.json",location.href).href;
  fetch(url).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
    if(!validData(d))throw 0;start(absolute(d,url),"public notes, pages, posts and skills")}).catch(fail);
}

/* ---------- state ---------- */
var S={layout:"rings",view:"departments",spin:0.05,motion:savedMotion()!=null?savedMotion():!mq.matches,names:false,spring:0.5,size:0.6,
  q:"",hover:null,sel:null,angle:0,legend:false};
var nodes=[],rooms=[],hubs=[],skills=[],routines=[],apps=[],root=null,data=null;
var cv=$("cv"),ctx=cv.getContext("2d"),W=0,H=0,DPR=1;
var view={k:.6,x:0,y:0,tk:.6,tx:0,ty:0,user:false};
var applied="",dirty=true,flags=null,flagMode=false,focusLinks=[],guideA=0,cache={},sprites={},matchCount=0;
var drag=null,mouse={x:-1,y:-1};

function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function start(d,srcLabel){
  data=d;
  $("src").textContent="public data · "+srcLabel;
  window.AIO_READING=d.reading||[];
  drawer=AIODrawer({reading:window.AIO_READING,onClose:function(){S.sel=null;applyFocus();dirty=true}});
  readLit();build(d);buildLegend();wire();renderSides();
  resize();setLayout(S.layout,true);mountTour();
  requestAnimationFrame(frame);
  if(FRAMED){if(pending)API.select(pending);return}
  // a link such as brain/index.html#first-mate opens that node's card
  function fromHash(){var id=decodeURIComponent(location.hash.slice(1));if(id&&byId[id])openNode(byId[id])}
  window.addEventListener("hashchange",fromHash);setTimeout(fromHash,0);
}
var pending=null;
function bare(u){try{u=new URL(u,location.href);return(u.origin+u.pathname).replace(/index\.html$/,"")}catch(e){return String(u)}}
var API={
  // highlight the node of the page at url (a post's dot, or a page's hexagon) without opening its card
  select:function(url){
    if(!nodes.length){pending=url;return}
    var u=bare(url),hit=null;
    nodes.forEach(function(n){if(n.info&&n.info.url&&bare(n.info.url)===u)hit=n});
    S.sel=hit;applyFocus();dirty=true;return hit;
  },
  setInsets:function(bottom){INS.bottom=bottom||0;if(!view.user)fitView();dirty=true},
  overlay:function(on){host.classList.toggle("ov",!!on);setTimeout(resize,0)},
  lit:readLit, // the course page calls this after a lesson is done

  host:host,root:shadow
};
var byId={}; // node by its data id (notes, parts, posts) or name (skills, pages)

function mk(type,label,extra){
  var n={i:nodes.length,type:type,label:label,x:0,y:0,tx:0,ty:0,vis:1,tv:1,rate:3+Math.random()*3,r:3,room:-1,folder:-1,color:"#ff7a1a",name:"",rand:Math.random()};
  for(var k in extra)n[k]=extra[k];
  nodes.push(n);return n;
}

function build(d){
  var rand=rng(7);
  root=mk("root",d.root.label||"CLAUDE.md",{r:13,color:"#ff7a1a",info:d.root});
  d.rooms.forEach(function(rm,ri){
    var total=0;rm.folders.forEach(function(f){total+=f.count});
    var hub=mk("hub",rm.label,{r:9,color:rm.color,room:ri,count:total,collapsed:false,info:rm});
    rooms.push({id:rm.id,label:rm.label,color:rm.color,hub:hub,dots:[],count:total,folders:rm.folders,collapsed:false,ang0:0,span:0});
    hubs.push(hub);
  });
  (d.skills||[]).forEach(function(s,i){skills.push(mk("skill",s.n,{r:5,color:"#ff9a3c",info:s,idx:i}))});
  var skillByName={};skills.forEach(function(s){skillByName[s.label]=s});
  (d.routines||[]).forEach(function(r,i){
    var run=r.status==="running"||r.status==="scheduled";
    routines.push(mk("routine",r.n,{r:6,color:run?"#ffb347":"#6c6a66",info:r,on:run,skillNode:skillByName[r.skill]||null,idx:i}));
  });
  // projects and pages share the outer ring with the apps; they carry a url to open
  var KIND={cli:"#5cd3ff",project:"#2ee6c5",page:"#ffd93d"};
  (d.apps||[]).concat(d.projects||[],d.pages||[]).forEach(function(a,i){
    var ok=["not connected","needs Chrome","paused"].indexOf(a.state)<0;
    apps.push(mk("app",a.n,{r:9,color:ok?(KIND[a.kind]||"#4f8dff"):"#5a6270",info:a,on:ok,idx:i}));
  });
  d.rooms.forEach(function(rm,ri){
    var R=rooms[ri];
    rm.folders.forEach(function(f,fi){
      for(var j=0;j<f.count;j++){
        // a file is {id, n, line, body, links, rel, url}; every one is public, so it is named and has a card
        var it=f.files&&j<f.files.length?f.files[j]:{},nm=typeof it==="string"?it:(it.n||"");
        var n=mk("dot",nm,{r:2.6+rand()*1.2,color:rm.color,room:ri,folder:fi,name:nm,hub:R.hub,info:typeof it==="string"?{}:it,rand:rand(),rate:2.5+rand()*4,jit:rand()*TAU});
        R.dots.push(n);if(n.info.id)byId[n.info.id]=n;
      }
    });
  });
  skills.concat(apps).forEach(function(n){byId[n.label]=n});
  flags=new Uint8Array(nodes.length);
}

/* ---------- layouts (base positions in world units, root at 0,0) ---------- */
var FACTOR={dot:1,hub:1,skill:-1.5,routine:.6,app:-.4,root:0};
function ringPlace(list,r,off){list.forEach(function(n,i){var a=off+i/list.length*TAU;n.bx=r*Math.cos(a);n.by=r*Math.sin(a)})}
function sectors(){
  var total=0,gap=.07;rooms.forEach(function(r){total+=r.count});
  var avail=TAU-gap*rooms.length,a=-Math.PI/2;
  rooms.forEach(function(r){r.span=avail*r.count/total;r.ang0=a;a+=r.span+gap});
}
function hexCell(q,r,sp){return[sp*(q+r/2),sp*r*.866]}
function hexSpiral(count){
  var out=[[0,0]],ring=1,dirs=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  while(out.length<count){
    var q=-ring,r=ring;
    for(var s=0;s<6;s++)for(var t=0;t<ring;t++){out.push([q,r]);q+=dirs[s][0];r+=dirs[s][1]}
    ring++;
  }
  return out;
}
function hexPerimeter(R,i,m){
  var t=i/m*6,k=Math.floor(t),f=t-k,a0=-Math.PI/2+k*Math.PI/3,a1=a0+Math.PI/3;
  return[R*((1-f)*Math.cos(a0)+f*Math.cos(a1)),R*((1-f)*Math.sin(a0)+f*Math.sin(a1))];
}

function computeLayout(name){
  var key=name+"|"+S.spring.toFixed(2)+"|"+S.size.toFixed(2);
  if(cache[key]){
    if(applied!==key){ // node base positions are shared: restore this layout's
      var P=cache[key].pos;
      for(var i=0;i<nodes.length;i++){nodes[i].bx=P[2*i];nodes[i].by=P[2*i+1]}
      applied=key;
    }
    return cache[key];
  }
  var L={ext:700,guides:[]},sp=14*S.size+2,rand=rng(11);
  sectors();root.bx=0;root.by=0;
  if(name==="rings"){
    var rho0=215,step=sp,rEnd=rho0;
    rooms.forEach(function(R){
      var i=0,row=0,A=R.span;
      while(i<R.dots.length){
        var rho=rho0+row*step,cap=Math.max(1,Math.floor(rho*A/sp));
        for(var j=0;j<cap&&i<R.dots.length;j++,i++){
          var a=R.ang0+(j+.5)/cap*A;
          R.dots[i].bx=rho*Math.cos(a);R.dots[i].by=rho*Math.sin(a);
        }
        rEnd=Math.max(rEnd,rho);row++;
      }
      var am=R.ang0+R.span/2;R.hub.bx=(rho0-26)*Math.cos(am);R.hub.by=(rho0-26)*Math.sin(am);
    });
    ringPlace(skills,130,-Math.PI/2);
    // no routines on the public map: the pages ring moves in where they were
    var rr=rEnd+58,ra=routines.length?rEnd+120:rEnd+70;
    ringPlace(routines,rr,-Math.PI/2+.2);ringPlace(apps,ra,-Math.PI/2);
    L.ext=ra+70;
    L.guides=[{r:130,c:"#ff7a1a",label:"SKILLS",lc:"#ff9a3c",ly:-(130-16)},
      {r:rEnd+22,c:"#7a4fd0",label:"MEMORY",lc:"#b57bff",ly:-(rEnd+8)},
      {r:ra,c:"#2f5fa8",label:"PAGES AND PROJECTS",lc:"#5ea0ff",ly:-(ra-14)}];
    if(routines.length)L.guides.splice(2,0,{r:rr,c:"#c98a2e",label:"ROUTINES",lc:"#ffb347",ly:-(rr-14)});
  }else if(name==="circle"){
    var maxD=0;
    rooms.forEach(function(R){
      var rings=0,cap=0;while(cap<R.dots.length){rings++;cap+=6*rings}
      R.rad=rings*sp;maxD=Math.max(maxD,R.rad);
    });
    var Rc=Math.max(300,(maxD+36)/Math.sin(Math.PI/rooms.length));
    rooms.forEach(function(R,ri){
      var a=-Math.PI/2+ri/rooms.length*TAU,cx=Rc*Math.cos(a),cy=Rc*Math.sin(a);
      R.hub.bx=cx;R.hub.by=cy;
      var i=0,ring=1;
      while(i<R.dots.length){
        var cap=6*ring;
        for(var j=0;j<cap&&i<R.dots.length;j++,i++){
          var b=j/cap*TAU+ring*.35;
          R.dots[i].bx=cx+ring*sp*Math.cos(b);R.dots[i].by=cy+ring*sp*Math.sin(b);
        }
        ring++;
      }
    });
    ringPlace(skills,130,-Math.PI/2);
    var r2=Rc+maxD+70;
    ringPlace(routines,r2,-Math.PI/2+.2);ringPlace(apps,r2+66,-Math.PI/2);
    L.ext=r2+66+70;
    L.guides=[{r:130,c:"#ff7a1a",label:"SKILLS",lc:"#ff9a3c",ly:-114}];
  }else if(name==="hex"){
    var S0=skills.length,M=0;rooms.forEach(function(R){M+=R.count});
    var cells=hexSpiral(1+S0+M+40);
    var skillCells=cells.slice(1,1+S0),memCells=cells.slice(1+S0,1+S0+M);
    skillCells.forEach(function(c,i){var p=hexCell(c[0],c[1],sp);skills[i].bx=p[0];skills[i].by=p[1]});
    var skillR=0;skills.forEach(function(s){skillR=Math.max(skillR,Math.hypot(s.bx,s.by))});
    // memory cells follow the skill cells in spiral order, so they sit outside
    // the skills block; sort by angle from the top so each room gets a wedge
    var maxR=0;
    var mp=memCells.map(function(c){var p=hexCell(c[0],c[1],sp);
      return{x:p[0],y:p[1],a:(Math.atan2(p[1],p[0])+Math.PI/2+TAU)%TAU,r:Math.hypot(p[0],p[1])}});
    mp.forEach(function(p){maxR=Math.max(maxR,p.r)});
    mp.sort(function(a,b){return a.a-b.a||a.r-b.r});
    var k=0;
    rooms.forEach(function(R){
      var sx=0,sy=0;
      R.dots.forEach(function(n){var p=mp[k++];n.bx=p.x;n.by=p.y;sx+=p.x;sy+=p.y});
      var cx=sx/R.dots.length,cy=sy/R.dots.length,cl=Math.hypot(cx,cy)||1;
      R.hub.bx=cx*(skillR+sp*1.6)/cl;R.hub.by=cy*(skillR+sp*1.6)/cl;
    });
    var rh=maxR+sp*3;
    routines.forEach(function(n,i){var p=hexPerimeter(rh,i,routines.length);n.bx=p[0];n.by=p[1]});
    apps.forEach(function(n,i){var p=hexPerimeter(rh+sp*3,i,apps.length);n.bx=p[0];n.by=p[1]});
    L.ext=rh+sp*3+70;
    L.guides=[];
  }else{ // force
    var spread=1.6-1.2*S.spring;
    var cr=rooms.map(function(R){return 6.2*Math.sqrt(R.count)*spread});
    var pos=rooms.map(function(R,i){var a=-Math.PI/2+i/rooms.length*TAU;return[360*Math.cos(a),360*Math.sin(a)]});
    for(var it=0;it<160;it++){
      for(var a=0;a<pos.length;a++){
        var fx=-pos[a][0]*.01,fy=-pos[a][1]*.01;
        for(var b=0;b<pos.length;b++){
          if(a===b)continue;
          var dx=pos[a][0]-pos[b][0],dy=pos[a][1]-pos[b][1],d=Math.hypot(dx,dy)||1,want=cr[a]+cr[b]+30;
          if(d<want){fx+=dx/d*(want-d)*.12;fy+=dy/d*(want-d)*.12}
        }
        pos[a][0]+=fx;pos[a][1]+=fy;
      }
    }
    var maxE=0;
    rooms.forEach(function(R,ri){
      R.hub.bx=pos[ri][0];R.hub.by=pos[ri][1];
      R.dots.forEach(function(n){
        var a=rand()*TAU,r=cr[ri]*Math.pow(rand(),.6);
        n.bx=pos[ri][0]+r*Math.cos(a);n.by=pos[ri][1]+r*Math.sin(a);
      });
      maxE=Math.max(maxE,Math.hypot(pos[ri][0],pos[ri][1])+cr[ri]);
    });
    ringPlace(skills,110,-Math.PI/2);
    function scatter(list,r){list.forEach(function(n,i){var a=i/list.length*TAU+.3,rr=r+(rand()-.5)*50;n.bx=rr*Math.cos(a);n.by=rr*Math.sin(a)})}
    scatter(routines,maxE+70);scatter(apps,maxE+150);
    L.ext=maxE+210;
  }
  L.pos=new Float32Array(nodes.length*2);
  for(var j=0;j<nodes.length;j++){L.pos[2*j]=nodes[j].bx||0;L.pos[2*j+1]=nodes[j].by||0}
  applied=key;cache[key]=L;return L;
}

/* ---------- control wiring ---------- */
function setLayout(name,quiet){
  S.layout=name;
  var L=computeLayout(name);
  view.user=false;fitView(L);
  var btns=shadow.querySelectorAll("#layouts .btn");
  for(var i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.l===name);
  if(!quiet)say("Layout "+name);
  dirty=true;
}
function setView(v){
  S.view=v;var b=shadow.querySelectorAll("#views .btn");
  for(var i=0;i<b.length;i++)b[i].setAttribute("aria-pressed",b[i].dataset.v===v);
  dirty=true;
}
function say(t){$("live").textContent=t}
function panelW(){return $("panel").hidden||W<760?0:280}
function fitView(L){
  if(!root)return; // the frame may resize the map before its data has loaded
  var aw=W-panelW(),ah=Math.max(160,H-INS.bottom),k=Math.min(aw,ah)/(2*(L||computeLayout(S.layout)).ext)*.98;
  view.tk=k;view.tx=aw/2;view.ty=ah/2+8;
  if(!S.motion||!view.init){view.k=k;view.x=view.tx;view.y=view.ty;view.init=true}
}
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=cv.clientWidth||window.innerWidth;H=cv.clientHeight||window.innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  if(!view.user)fitView();dirty=true;
}

function wire(){
  $("layouts").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setLayout(b.dataset.l)});
  $("views").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setView(b.dataset.v)});
  setView(S.view);
  $("q").addEventListener("input",function(){S.q=this.value.trim().toLowerCase();applyFocus();dirty=true});
  function slider(id,key,out,digits){
    var s=$(id);s.addEventListener("input",function(){S[key]=parseFloat(this.value);$(out).textContent=S[key].toFixed(digits);
      if(key!=="spin"){cache={};if(!view.user)fitView()}dirty=true});
  }
  slider("spin","spin","spinO",2);slider("spring","spring","springO",2);slider("size","size","sizeO",2);
  setMotion(S.motion,false);
  $("motion").addEventListener("change",function(){setMotion(this.checked,true)});
  $("motionBtn").addEventListener("click",function(){setMotion(!S.motion,true)});
  $("names").addEventListener("change",function(){S.names=this.checked;dirty=true});
  $("expand").addEventListener("click",function(){setAll(false)});
  $("collapse").addEventListener("click",function(){setAll(true)});
  $("menuBtn").addEventListener("click",function(){
    var p=$("panel");p.hidden=!p.hidden;this.setAttribute("aria-expanded",!p.hidden);if(!view.user)fitView();dirty=true});
  $("legendBtn").addEventListener("click",function(){
    S.legend=!S.legend;$("legend").hidden=!S.legend;this.setAttribute("aria-expanded",S.legend)});
  // the menu starts closed unless the map has room beside it (the Menu button or / or ⌘K opens it)
  if(window.innerWidth<1400){$("panel").hidden=true;$("menuBtn").setAttribute("aria-expanded","false")}
  $("sideBtn").addEventListener("click",function(){setSides($("side").hidden)});
  setSides(window.innerWidth>=900);
  window.addEventListener("resize",resize);
  if(mq.addEventListener)mq.addEventListener("change",function(){if(savedMotion()==null)setMotion(!mq.matches,false)});
  document.addEventListener("keydown",function(e){
    var t=e.composedPath?e.composedPath()[0]:e.target; // the real target, also inside the shadow root
    var typing=/^(input|textarea|select)$/i.test(t.tagName||"")||t.isContentEditable;
    if((e.key==="/"&&!typing)||((e.metaKey||e.ctrlKey)&&(e.key||"").toLowerCase()==="k")){e.preventDefault();setPanel(true);$("q").focus();$("q").select()}
    else if(e.key==="Escape"){$("q").value="";S.q="";S.sel=null;hideCard();applyFocus();dirty=true}
  });
  cv.addEventListener("pointermove",onMove);
  cv.addEventListener("pointerdown",onDown);
  cv.addEventListener("pointerup",onUp);
  cv.addEventListener("pointerleave",function(){if(!drag){mouse.x=-1;setHover(null)}});
  cv.addEventListener("wheel",onWheel,{passive:false});
  cv.addEventListener("dblclick",function(e){
    var n=pick(e.offsetX,e.offsetY);
    if(n&&n.type==="hub")toggleRoom(rooms[n.room]);
    else if(!n){view.user=false;fitView();dirty=true}
  });
  cv.tabIndex=0;
}
function setSides(on){
  $("side").hidden=!on;document.body.classList.toggle("side",on);
  $("sideBtn").setAttribute("aria-expanded",on);resize();
}
/* ---------- side widgets (same real data as the map) ---------- */
function renderSides(){
  function item(n,right,cls){
    var li=el("li"),b=el("button","lk",n.label);b.type="button";
    b.addEventListener("click",function(){
      if(window.innerWidth<900)setSides(false); // show the map behind the card
      openNode(n);
    });
    li.appendChild(b);li.appendChild(el("span",cls||"m",right));return li;
  }
  (window.AIO_READING||[]).forEach(function(r,i){
    var li=el("li"),b=el("button","lk",(i+1)+". "+r.title);b.type="button";
    b.addEventListener("click",function(){if(window.innerWidth<900)setSides(false);
      if(opts.onPage&&opts.onPage(r.url))return; // on a framed page the page overlay shows it
      S.sel=null;applyFocus();drawer.read(i)});
    li.appendChild(b);li.appendChild(el("span","m",r.line.split(" · ")[0]));$("sRead").appendChild(li);
  });
  apps.forEach(function(n){$(n.info.group==="firstmate"?"sFm":"sApps").appendChild(item(n,n.info.state||"",n.on?"ok":"warn"))});
  // the FirstMate parts room sits under its pages, so the left column reaches it too
  rooms.filter(function(R){return R.id==="fm"}).forEach(function(R){R.dots.forEach(function(d){$("sFm").appendChild(item(d,rooms[d.room].folders[d.folder].name))})});
  skills.forEach(function(n){$("sSkills").appendChild(item(n,"details"))});
}
/* ---------- open a node: its card in the right-side drawer; a reading page opens its text there ---------- */
var drawer=null;
function openNode(n){
  S.sel=n;hideCard();applyFocus();dirty=true;say(n.label||"file");
  // a page or post of this site: on a framed page it opens in the page overlay instead of the drawer
  if(n.info&&n.info.url&&opts.onPage&&opts.onPage(n.info.url)){drawer.close();S.sel=n;applyFocus();return}
  var c=nodeCard(n),i=n.info&&n.info.url?drawer.readIndex(n.info.url):-1;
  if(i>=0)drawer.read(i,{status:c.status,statusCls:c.statusCls,related:c.related});else drawer.card(c);
}
function nodeCard(n){
  function go(m){return{label:m.label||"a file",go:function(){openNode(m)}}}
  var c={title:n.label,related:[],links:[]},inf=n.info||{};
  // every link here comes from brain-data.json: public pages of this site or public https links
  function paras(b){if(!Array.isArray(b))return b;var w=el("div");b.forEach(function(p){w.appendChild(el("p",null,p))});return w}
  if(n.type==="root"){
    c.kind="Router file";c.line="router file"+(inf.also?" · also "+inf.also:"");c.body=inf.note;
    c.status="loaded first by every agent";c.statusCls="ok";
    c.links=(inf.links||[]).map(function(l){return{label:l[0],href:l[1]}});c.related=hubs.map(go);
  }else if(n.type==="hub"){
    var R=rooms[n.room],w=el("div"),ul=el("ul");c.kind="Room";c.line="room · "+R.count+" items in "+R.folders.length+" folder"+(R.folders.length===1?"":"s");
    c.status=R.collapsed?"folded on the map":"open on the map";c.statusCls="a";
    if(inf.note)w.appendChild(el("p",null,inf.note));
    R.folders.forEach(function(f){var li=el("li");li.textContent=f.name+" · "+f.count;ul.appendChild(li)});
    w.appendChild(ul);c.body=w;c.related=[go(root)].concat(R.dots.slice(0,12).map(go));c.links=inf.links||[];
  }else if(n.type==="dot"){
    var Rd=rooms[n.room],f=Rd.folders[n.folder];c.kind=Rd.label;
    c.title=n.name;c.line=inf.line||Rd.label+" / "+f.name;c.body=paras(inf.body);
    c.status=Rd.label+" / "+f.name;c.statusCls="a";c.links=inf.links||[];
    if(inf.lesson){c.status=lit[inf.lesson]?"done in this browser":"not done yet";c.statusCls=lit[inf.lesson]?"ok":"warn"}
    c.related=(inf.rel||[]).map(function(id){return byId[id]}).filter(Boolean).map(go).concat([go(n.hub)]);
  }else if(n.type==="skill"){
    c.kind="Skill";c.line="skill"+(inf.when?" · when "+inf.when:"");c.body=inf.desc;
    c.links=inf.url?[{label:"This skill on the skill map",href:inf.url}]:[];
    c.status="on the skill map";c.statusCls="ok";
    c.related=[go(root)];
  }else if(n.type==="routine"){
    c.kind="Routine";c.line="routine · "+(inf.when||"");c.body=inf.skill?"Runs /"+inf.skill+".":null;
    c.status=inf.status||(n.on?"running":"not running");c.statusCls=n.on?"ok":"warn";
    c.related=(n.skillNode?[go(n.skillNode)]:[]).concat([go(root)]);
  }else{
    c.kind=inf.kind==="project"?"Project":inf.kind==="page"?"Page":"Application";
    c.line=inf.kind+(inf.kind==="project"||inf.kind==="page"?"":" · application");
    c.status=inf.state||"";c.statusCls=n.on?"ok":"warn";
    c.links=inf.url?[{label:"Open "+n.label,href:inf.url}]:[];
    c.related=apps.filter(function(a){return a!==n&&a.info.kind===inf.kind&&(a.info.group||"")===(inf.group||"")}).slice(0,8).map(go).concat([go(root)]);
  }
  return c;
}
/* ---------- chat bar: a scripted guided tour (tour.js), no model calls ---------- */
function setPanel(on){$("panel").hidden=!on;$("menuBtn").setAttribute("aria-expanded",on);if(!view.user)fitView();dirty=true}
function setLegend(on){S.legend=on;$("legend").hidden=!on;$("legendBtn").setAttribute("aria-expanded",on)}
function mountTour(){
  if(!window.AIOTour)return;
  var keep=null;
  // on a framed page, the map steps fold the page overlay away and the overlay step brings it back
  var fold=opts.overlayShown||function(){};
  function mapView(){if(window.innerWidth<900){setSides(false);setPanel(false)}setLegend(false);fold(false)}
  // a circle around the map centre, radius in world units, at the settled view
  function ring(r){return function(){var b=cv.getBoundingClientRect(),R=r()*view.tk;
    return{x:b.left+view.tx-R,y:b.top+view.ty-R,w:2*R,h:2*R,round:true}}}
  function guide(i){return function(){return computeLayout("rings").guides[i].r+12}}
  function sh(id){return function(){return $(id)}} // steps point at parts inside the shadow root
  function doc(sel){return function(){return document.querySelector(sel)}}
  var steps=[
      {sel:FRAMED?sh("cv"):sh("src"),before:mapView,title:"The second brain",text:"A map of how the owner works with a crew of AI agents, always running behind every page of this site. It shows only public things: approved wiki notes, FirstMate's parts, the posts, the skills and this site's pages."},
      {rect:ring(function(){return 30}),before:mapView,title:"The centre: "+root.label,text:"Every agent reads this rules file first. Everything else on the map hangs off it."},
      {rect:ring(guide(0)),before:mapView,title:"Inner ring: skills",text:"Each diamond is a skill: a playbook an agent loads only when a task calls for it. Each one links to its box on the skill map."},
      {rect:ring(guide(1)),before:mapView,title:"Memory: rooms of notes",text:"Each coloured arc is a room, like Wiki notes or Field Notes. One dot is one note, part or post. Click a dot for its card; double-click a room to fold it."},
      {rect:ring(guide(2)),before:mapView,title:"Outer ring: pages and projects",text:"Hexagons are this site's pages and public projects. A page or post opens on top of the map, and its node lights up."}];
  if(FRAMED)steps.push(
      {sel:doc(".k-nav"),before:mapView,title:"Site tabs",text:"The same tabs on every page: Field Notes, the AI-Life-OS demo, the Second Brain on its own, whoami and GitHub. Each one opens over this same map."},
      {sel:doc("#pageov"),before:function(){setLegend(false);fold(true)},title:"The page overlay",text:"Every page of the site reads in this panel, on top of the live map. Minimise it to see the whole map, or close it; the button that is left brings it back."});
  steps.push(
      {sel:sh("motionBtn"),before:mapView,title:"Buttons",text:"Turn the motion on or off (remembered on this device), show or hide the side lists, and open the menu."},
      {sel:sh("panel"),before:function(){if(window.innerWidth<900)setSides(false);setLegend(false);fold(false);setPanel(true)},title:"Menu",text:"Search the map (press / or ⌘K), switch layouts (Force, Circle, Hex, Rings), and tune motion and sizes."},
      {sel:sh("legend"),before:function(){mapView();setLegend(true)},title:"Legend",text:"Room colours with their counts, and what each shape means."},
      {sel:sh("wl"),before:function(){setLegend(false);fold(false);setSides(true)},title:"Left lists",text:"The reading order, the site's pages and projects, and FirstMate in detail. A page or post opens "+(FRAMED?"in the page overlay.":"on the right, with Prev and Next.")},
      {sel:sh("wr"),before:function(){fold(false);setSides(true)},title:"Right list",text:"The skills deck, from the same data as the map."},
      {sel:doc("#askBar"),before:mapView,title:"This ask bar",text:"Each question runs a short scripted tour like this one. Nothing is sent to a model."});
  function at(t){for(var i=0;i<steps.length;i++)if(steps[i].title===t)return i;return 0}
  AIOTour({
    steps:steps,
    chips:[
      {q:"Explain this screen",from:0},
      {q:"What do the shapes mean?",only:at("Legend")},
      {q:"How do I find something?",only:at("Menu")},
      {q:"Show me the skill map",href:BASE+"../maps/skills.html"}
    ],
    onStart:function(){
      keep={sides:!$("side").hidden,panel:!$("panel").hidden,legend:S.legend,layout:S.layout};
      drawer.close();S.sel=null;hideCard();applyFocus();view.user=false;setLayout("rings",true);
    },
    onEnd:function(){
      setSides(keep.sides);setPanel(keep.panel);setLegend(keep.legend);fold(true);
      if(keep.layout!==S.layout)setLayout(keep.layout,true);
    }
  });
}
function setAll(c){rooms.forEach(function(r){r.collapsed=c});say(c?"All rooms collapsed":"All rooms expanded");dirty=true}
function toggleRoom(r){r.collapsed=!r.collapsed;say(r.label+(r.collapsed?" collapsed":" expanded"));dirty=true}

/* ---------- picking & focus ---------- */
function w2s(x,y){return[view.x+x*view.k,view.y+y*view.k]}
function pick(mx,my){
  var best=null,bd=1e9,order={hub:0,app:1,routine:1,skill:1,root:0,dot:2};
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];if(n.vis<.35)continue;
    var sx=view.x+n.x*view.k,sy=view.y+n.y*view.k,dx=sx-mx,dy=sy-my,d=dx*dx+dy*dy;
    var rad=Math.max(n.type==="dot"?5:9,n.r*view.k+3);
    if(d>rad*rad)continue;
    var score=order[n.type]*1e6+d;
    if(score<bd){bd=score;best=n}
  }
  return best;
}
function onMove(e){
  mouse.x=e.offsetX;mouse.y=e.offsetY;
  if(drag){
    var dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
    if(drag.moved){view.x=drag.vx+dx;view.y=drag.vy+dy;view.tx=view.x;view.ty=view.y;view.user=true;dirty=true}
    return;
  }
  setHover(pick(mouse.x,mouse.y));
}
function onDown(e){drag={x:e.offsetX,y:e.offsetY,vx:view.x,vy:view.y,moved:false};cv.setPointerCapture(e.pointerId);cv.classList.add("drag")}
function onUp(e){
  cv.classList.remove("drag");
  var d=drag;drag=null;if(!d)return;
  if(!d.moved){
    var n=pick(e.offsetX,e.offsetY);
    if(n&&n!==S.sel)openNode(n);
    else{S.sel=null;hideCard();drawer.close();applyFocus();dirty=true}
  }
}
function onWheel(e){
  e.preventDefault();
  var f=Math.exp(-e.deltaY*.0015),nk=Math.max(.15,Math.min(8,view.k*f));
  var wx=(e.offsetX-view.x)/view.k,wy=(e.offsetY-view.y)/view.k;
  view.k=nk;view.tk=nk;view.x=e.offsetX-wx*nk;view.y=e.offsetY-wy*nk;view.tx=view.x;view.ty=view.y;view.user=true;dirty=true;
}
function setHover(n){
  if(n===S.hover)return;
  S.hover=n;cv.classList.toggle("hit",!!n);
  if(n)showCard(n,mouse.x,mouse.y,false);else hideCard();
  applyFocus();dirty=true;
}

function applyFocus(){
  var f=S.hover||S.sel;focusLinks=[];flags.fill(0);flagMode=false;matchCount=0;
  if(f){
    flagMode=true;flags[f.i]=1;flags[root.i]=1;
    var add=function(n){flags[n.i]=1};
    if(f.type==="dot"){add(f.hub);focusLinks.push([f,f.hub],[f.hub,root])}
    else if(f.type==="hub"){rooms[f.room].dots.forEach(function(d){add(d);focusLinks.push([f,d])});focusLinks.push([f,root])}
    else if(f.type==="root"){
      hubs.concat(skills,apps).forEach(function(n){add(n);focusLinks.push([root,n])});
    }else if(f.type==="skill"){
      focusLinks.push([f,root]);
      routines.forEach(function(r){if(r.skillNode===f){add(r);focusLinks.push([r,f])}});
    }else if(f.type==="routine"){
      focusLinks.push([f,root]);if(f.skillNode){add(f.skillNode);focusLinks.push([f,f.skillNode])}
    }else if(f.type==="app")focusLinks.push([f,root]);
    return;
  }
  if(S.q){
    flagMode=true;
    var q=S.q;
    nodes.forEach(function(n){
      var hay;
      if(n.type==="dot")hay=(n.name+" "+rooms[n.room].label+" "+rooms[n.room].folders[n.folder].name).toLowerCase();
      else if(n.type==="skill")hay=(n.label+" "+(n.info.desc||"")).toLowerCase();
      else if(n.type==="root")hay="";
      else hay=(n.label+" "+(n.info.kind||"")+" "+(n.info.when||"")).toLowerCase();
      if(hay.indexOf(q)>=0){flags[n.i]=1;matchCount++;if(n.hub)flags[n.hub.i]=1}
    });
    flags[root.i]=1;
    $("hits").textContent=matchCount+" match"+(matchCount===1?"":"es");
    return;
  }
  $("hits").textContent="";
}

function showCard(n,mx,my,pin,keepPos){
  var c=$("card");c.textContent="";c.className=pin?"pin":"";
  var t=el("b",null,n.label||(n.type==="dot"?"unnamed file":""));c.appendChild(t);
  var k="",d="",s=null;
  if(n.type==="dot"){var R=rooms[n.room];k=n.info.line||R.label+" / "+R.folders[n.folder].name;
    if(!n.name)d="One of "+R.folders[n.folder].count+" files in this folder. Only some names are listed.";}
  else if(n.type==="hub"){var Rm=rooms[n.room];k="room · "+Rm.count+" files in "+Rm.folders.length+" folders";
    d=pin?"Double-click to "+(Rm.collapsed?"expand":"collapse")+".":"Click for folder counts.";
    if(pin){s=el("ul");Rm.folders.forEach(function(f){var li=el("li");li.appendChild(el("span",null,f.name));li.appendChild(el("span","k",String(f.count)));s.appendChild(li)})}}
  else if(n.type==="root"){k="router file";d=(n.info.also?"Also "+n.info.also+". ":"")+(n.info.note||"");}
  else if(n.type==="skill"){k="skill";d=(n.info.desc||"")+(n.info.url?"":" No public page yet.");}
  else if(n.type==="routine"){k="routine · "+(n.info.when||"");d=n.info.skill?"Runs /"+n.info.skill:"";
    s=el("div","s "+(n.on?"ok":"warn"),n.info.status||(n.on?"running":"not running"));}
  else if(n.type==="app"){k=n.info.kind+(n.info.kind==="project"||n.info.kind==="page"?"":" · application");s=el("div","s "+(n.on?"ok":"warn"),n.info.state||"");}
  c.appendChild(el("div","k",k));if(d)c.appendChild(el("div","d",d));if(s)c.appendChild(s);
  c.appendChild(el("div","s","Click for the full card"+(n.type!=="hub"&&n.info&&n.info.url?" and its link":"")));
  c.style.display="block";
  if(!keepPos){
    var r=cv.getBoundingClientRect();mx+=r.left;my+=r.top;
    var x=Math.min(mx+14,window.innerWidth-280),y=Math.min(my+14,window.innerHeight-110);
    c.style.left=Math.max(8,x)+"px";c.style.top=Math.max(8,y)+"px";
  }
}
function hideCard(){$("card").style.display="none"}

/* ---------- legend ---------- */
function buildLegend(){
  var L=$("legend");L.textContent="";
  L.appendChild(el("h3",null,"Rooms"));
  rooms.forEach(function(r){
    var d=el("div"),i=el("i");i.style.background=r.color;i.style.boxShadow="0 0 6px "+r.color;
    d.appendChild(i);d.appendChild(el("span",null,r.label+" · "+r.count));L.appendChild(d);
  });
  L.appendChild(el("h3",null,"Shapes"));
  [["","#ff7a1a","Centre rules file"],["dia","#ff9a3c","Skill (links to the skill map)"],["","#b57bff","Dot: a note, part, setup or post"],["","#5a6270","Course lesson: grey until you finish it"],["hex","#2ee6c5","Public project (click for its link)"],["hex","#ffd93d","Page of this site (click to read it)"]].forEach(function(s){
    var d=el("div"),i=el("i",s[0]);i.style.background=s[1];i.style.borderColor=s[1];d.appendChild(i);d.appendChild(el("span",null,s[2]));L.appendChild(d);
  });
}

/* ---------- drawing ---------- */
function sprite(color){
  if(sprites[color])return sprites[color];
  var c=document.createElement("canvas");c.width=c.height=64;var g=c.getContext("2d");
  var gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,"#fff");gr.addColorStop(.18,color);gr.addColorStop(.45,color+"55");gr.addColorStop(1,color+"00");
  g.fillStyle=gr;g.fillRect(0,0,64,64);return sprites[color]=c;
}
function shade(hex,f,fi){ // folders view: vary lightness per folder
  var n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,m=[.75,1,1.2,.9,1.35][fi%5];
  function c(v){return Math.max(0,Math.min(255,Math.round(v*m)))}
  return"#"+((1<<24)+(c(r)<<16)+(c(g)<<8)+c(b)).toString(16).slice(1);
}
function dotColor(n){return S.view==="folders"?shade(n.color,0,n.folder):n.color}

var last=0;
function frame(t){
  var dt=Math.min(.05,(t-last)/1000||0);last=t;
  var moving=step(dt);
  if(dirty||moving||S.motion){draw(t);dirty=false}
  requestAnimationFrame(frame);
}

function step(dt){
  var moving=false,motion=S.motion;
  if(motion&&S.layout!=="force")S.angle+=S.spin*dt*2;
  var rot=S.layout==="force"?0:S.angle,L=computeLayout(S.layout);
  var ga=S.layout==="rings"?1:0;guideA+=(ga-guideA)*(motion?Math.min(1,dt*4):1);
  if(Math.abs(ga-guideA)>.01)moving=true;
  if(motion){
    var vk=1-Math.exp(-dt*5);
    if(Math.abs(view.tk-view.k)>1e-3||Math.abs(view.tx-view.x)>.3||Math.abs(view.ty-view.y)>.3){
      if(!view.user){view.k+=(view.tk-view.k)*vk;view.x+=(view.tx-view.x)*vk;view.y+=(view.ty-view.y)*vk;moving=true}
    }
  }else if(!view.user){view.k=view.tk;view.x=view.tx;view.y=view.ty}
  var hubT=[];
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];
    var f=FACTOR[n.type]||0,a=rot*f,ca=Math.cos(a),sa=Math.sin(a);
    var bx=n.bx||0,by=n.by||0;
    if(n.type==="dot"&&rooms[n.room].collapsed){bx=n.hub.bx;by=n.hub.by}
    var tx=bx*ca-by*sa,ty=bx*sa+by*ca;
    n.tx=tx;n.ty=ty;
    n.tv=n.type==="dot"&&rooms[n.room].collapsed?0:1;
    if(motion){
      var k=1-Math.exp(-dt*n.rate);
      var dx=tx-n.x,dy=ty-n.y;
      n.x+=dx*k;n.y+=dy*k;n.vis+=(n.tv-n.vis)*k;
      if(dx*dx+dy*dy>.01||Math.abs(n.tv-n.vis)>.01)moving=true;
    }else{n.x=tx;n.y=ty;n.vis=n.tv}
  }
  return moving;
}

function draw(t){
  var k=view.k,tm=t/1000;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
  ctx.fillStyle="#05060a";ctx.fillRect(0,0,W,H);
  var g=ctx.createRadialGradient(view.x,view.y,0,view.x,view.y,Math.max(W,H)*.7*Math.max(.5,k*1.2));
  g.addColorStop(0,"rgba(60,30,90,.28)");g.addColorStop(.5,"rgba(20,14,40,.12)");g.addColorStop(1,"rgba(5,6,10,0)");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.setTransform(DPR*k,0,0,DPR*k,DPR*view.x,DPR*view.y);
  var dimA=flagMode?.1:1;

  // guides (rings layout)
  var L=computeLayout(S.layout);
  if(guideA>.02){
    ctx.lineWidth=1.2/k;
    L.guides.forEach(function(gd){
      ctx.globalAlpha=guideA*(flagMode?.35:.7);ctx.strokeStyle=gd.c;
      ctx.beginPath();ctx.arc(0,0,gd.r,0,TAU);ctx.stroke();
    });
  }

  // links
  ctx.lineCap="round";
  var baseA=flagMode?.05:.2;
  ctx.lineWidth=1/k;
  hubs.forEach(function(h){
    ctx.globalAlpha=baseA*h.vis;ctx.strokeStyle=h.color;
    ctx.beginPath();ctx.moveTo(root.x,root.y);ctx.lineTo(h.x,h.y);ctx.stroke();
  });
  ctx.strokeStyle="#ff7a1a";ctx.globalAlpha=baseA*.5;ctx.beginPath();
  skills.forEach(function(s){ctx.moveTo(root.x,root.y);ctx.lineTo(s.x,s.y)});ctx.stroke();
  if(S.layout==="force"&&!flagMode){
    ctx.globalAlpha=.05+.1*S.spring;
    rooms.forEach(function(R){
      if(R.collapsed)return;ctx.strokeStyle=R.color;ctx.beginPath();
      for(var i=0;i<R.dots.length;i++){var d=R.dots[i];ctx.moveTo(R.hub.x,R.hub.y);ctx.lineTo(d.x,d.y)}
      ctx.stroke();
    });
  }
  // focus links
  if(focusLinks.length){
    ctx.lineWidth=1.2/k;
    focusLinks.forEach(function(p){
      ctx.globalAlpha=(p[1].type==="dot"||p[0].type==="dot"?.35:.7)*(.4+.6*S.spring)*Math.min(p[0].vis,p[1].vis);
      ctx.strokeStyle=p[0].type==="dot"?p[0].color:(p[1].type==="dot"?p[1].color:p[0].color);
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.stroke();
    });
  }

  // dots: additive glow sprites
  ctx.globalCompositeOperation="lighter";
  var drift=S.motion&&S.layout==="force"?1:0;
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];if(n.type!=="dot"||n.vis<.02)continue;
    var a=(flagMode?(flags[i]?1:dimA):1)*n.vis*.9;
    var x=n.x,y=n.y;
    if(drift){x+=Math.cos(tm*.6+n.jit)*2.2;y+=Math.sin(tm*.5+n.jit*1.3)*2.2}
    var sz=n.r*(flagMode&&flags[i]?3.4:3),col=dotColor(n);
    if(n.info.lesson){if(lit[n.info.lesson])sz*=1.4;else{col="#5a6270";a*=.6}}
    ctx.globalAlpha=a;ctx.drawImage(sprite(col),x-sz,y-sz,sz*2,sz*2);
  }
  ctx.globalCompositeOperation="source-over";

  // hubs
  hubs.forEach(function(h){
    var a=flagMode?(flags[h.i]?1:dimA+.1):1,R=rooms[h.room],hr=h.r*(R.collapsed?1.5:1);
    ctx.globalCompositeOperation="lighter";ctx.globalAlpha=a*.9;
    ctx.drawImage(sprite(h.color),h.x-hr*3.2,h.y-hr*3.2,hr*6.4,hr*6.4);
    ctx.globalCompositeOperation="source-over";
    ctx.globalAlpha=a;ctx.fillStyle="#05060a";ctx.strokeStyle=h.color;ctx.lineWidth=1.6/k;
    ctx.beginPath();ctx.arc(h.x,h.y,hr*.55,0,TAU);ctx.fill();ctx.stroke();
  });

  // skills (diamonds)
  skills.forEach(function(s){
    var a=flagMode?(flags[s.i]?1:dimA+.1):1;ctx.globalAlpha=a;
    ctx.fillStyle="#2a1608";ctx.strokeStyle=s.color;ctx.lineWidth=1.4/k;
    ctx.beginPath();ctx.moveTo(s.x,s.y-s.r*1.3);ctx.lineTo(s.x+s.r,s.y);ctx.lineTo(s.x,s.y+s.r*1.3);ctx.lineTo(s.x-s.r,s.y);ctx.closePath();ctx.fill();ctx.stroke();
  });
  // routines (circles)
  routines.forEach(function(r){
    var a=flagMode?(flags[r.i]?1:dimA+.1):1;ctx.globalAlpha=a;
    ctx.lineWidth=1.6/k;ctx.strokeStyle=r.color;
    if(r.on){
      ctx.globalCompositeOperation="lighter";ctx.globalAlpha=a*.7;ctx.drawImage(sprite("#ffb347"),r.x-r.r*2.2,r.y-r.r*2.2,r.r*4.4,r.r*4.4);
      ctx.globalCompositeOperation="source-over";ctx.globalAlpha=a;ctx.setLineDash([]);
    }else ctx.setLineDash([2/k*2,2/k*2]);
    ctx.fillStyle="#0c0e11";ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.fill();ctx.stroke();ctx.setLineDash([]);
  });
  // apps (hexagons)
  apps.forEach(function(p){
    var a=flagMode?(flags[p.i]?1:dimA+.1):1;ctx.globalAlpha=a;
    ctx.fillStyle="#0a1220";ctx.strokeStyle=p.color;ctx.lineWidth=1.5/k;
    ctx.beginPath();
    for(var v=0;v<6;v++){var an=Math.PI/6+v*Math.PI/3,px=p.x+p.r*Math.cos(an),py=p.y+p.r*Math.sin(an);v?ctx.lineTo(px,py):ctx.moveTo(px,py)}
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=p.color;ctx.font="bold "+(p.r*.95)+"px ui-monospace,monospace";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText((p.label[0]||"?").toUpperCase(),p.x,p.y+.5);
  });
  // root
  (function(){
    var a=1;ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.9;
    ctx.drawImage(sprite("#ff7a1a"),root.x-root.r*3,root.y-root.r*3,root.r*6,root.r*6);
    ctx.globalCompositeOperation="source-over";ctx.globalAlpha=a;
    ctx.fillStyle="#150b04";ctx.strokeStyle="#ff7a1a";ctx.lineWidth=2/k;
    ctx.beginPath();ctx.arc(root.x,root.y,root.r*.7,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle="#ff7a1a";ctx.fillRect(root.x-3,root.y-3,6,6);
  })();

  // text in screen space
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.textAlign="center";ctx.textBaseline="alphabetic";
  function label(txt,wx,wy,color,size,dy,al){
    var x=view.x+wx*k,y=view.y+wy*k+dy;if(x<-80||x>W+80||y<-20||y>H+20)return;
    ctx.globalAlpha=al;ctx.fillStyle=color;ctx.font=size+"px ui-monospace,monospace";ctx.fillText(txt,x,y);
  }
  label(root.label,root.x,root.y,"#e9e6e0",11,root.r*k+16,1);
  hubs.forEach(function(h){
    var R=rooms[h.room];
    label(R.label.toUpperCase()+(R.collapsed?" · "+R.count:""),h.x,h.y,h.color,10,-h.r*k-8,flagMode?(flags[h.i]?1:.3):.95);
  });
  if(guideA>.05)L.guides.forEach(function(gd){label(gd.label,0,gd.ly,gd.lc,12,0,guideA*(flagMode?.4:.9))});
  if(S.hover&&S.hover.type!=="dot"&&S.hover.type!=="hub"&&S.hover.type!=="root")label(S.hover.label,S.hover.x,S.hover.y,"#e9e6e0",11,-S.hover.r*k-8,1);
  else if(S.sel&&S.sel!==S.hover&&S.sel.type!=="dot"&&S.sel.type!=="hub"&&S.sel.type!=="root")label(S.sel.label,S.sel.x,S.sel.y,"#e9e6e0",11,-S.sel.r*k-8,1);
  if(S.names||(S.q&&matchCount>0&&matchCount<=40)){
    var cnt=0;
    for(var i2=0;i2<nodes.length&&cnt<260;i2++){
      var d=nodes[i2];if(d.type!=="dot"||!d.name||d.vis<.5)continue;
      if(S.q&&!flags[i2])continue;
      if(k<.45&&!S.q)continue;
      label(d.name,d.x,d.y,"#cfc9bd",9,-6,flagMode&&!flags[i2]?.2:.8);cnt++;
    }
  }
  if(S.view==="folders"){
    rooms.forEach(function(R){
      if(R.collapsed||k<.5)return;
      var idx=0;R.folders.forEach(function(f,fi){
        var sx=0,sy=0,c=0;
        for(var j=idx;j<idx+f.count;j++){sx+=R.dots[j].x;sy+=R.dots[j].y;c++}
        idx+=f.count;if(c)label(f.name,sx/c,sy/c,shade(R.color,0,fi),9,3,.9);
      });
    });
  }
  ctx.globalAlpha=1;
}

boot();
return API;
};
