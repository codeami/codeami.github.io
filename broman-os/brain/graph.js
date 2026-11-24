/* The second brain: the AIO prototype's ring map, fed only public data (brain-data.json).
   It is the chart of Chart & Cards, the base layer of the whole site. the demo (index.html) shows it with a chat; on every other
   page hud.js mounts it behind the page, which then reads as an overlay on top of it.
   var g=AIOBrain({base:"<url of brain/>", framed:bool, onPage:fn(url)->bool});
   g.select(url) marks a page's node as "you are here" (that node alone is lit, with a ring); g.state() and g.screenOf(label) are for the tests; g.setInsets(bottom) keeps the map clear of a bottom sheet;
   g.overlay(on) hides the right skills deck while a page overlay covers it.
   The map lives in a shadow root, so the site's CSS and its own names never clash. */
window.AIOBrain=function(opts){
"use strict";
opts=opts||{};
const BASE=opts.base||"",FRAMED=!!opts.framed;
const host=document.createElement("div");host.id="brainHost";if(FRAMED)host.className="framed";
const shadow=host.attachShadow({mode:"open"});
shadow.innerHTML='<link rel="stylesheet" href="'+BASE+'graph.css">'+
  '<div id="stage"><div id="g3d" hidden></div><canvas id="cv" role="img" aria-label="Second brain map: a centre rules file linked to rooms of public notes, harness parts and posts, with a ring of skills and a ring of pages and projects. The side lists hold the same items as buttons."></canvas></div>'+
  '<div id="side" hidden><aside class="side-col" id="wl" aria-label="Map tree: reading order, rooms and pages">'+
  '<div id="thead"><nav id="trail" aria-label="You are here"></nav>'+
  '<div id="tfind"><input type="search" id="tq" placeholder="Filter the tree…  (/)" aria-label="Filter the tree" aria-controls="tree" autocomplete="off"><p id="tcount" aria-live="polite"></p></div></div>'+
  '<ul id="tree" role="tree" aria-label="The map as a tree: rooms, folders and files"></ul></aside>'+
  '<aside class="side-col" id="wr" aria-label="Skills"><section class="wd"><h2>Skills deck</h2><ul id="sSkills"></ul></section></aside></div>'+
  '<div class="title"'+(FRAMED?' hidden':'')+'><b>THE SOFTWARE META-FACTORY</b><span>SECOND BRAIN</span><small id="src">loading…</small></div>'+
  '<div class="top"><button class="btn" id="dimBtn" type="button" aria-pressed="false" title="Switch between the flat map and a 3D view">3D</button>'+
  '<button class="btn" id="motionBtn" type="button" aria-pressed="true">Motion on</button>'+
  '<button class="btn" id="sideBtn" type="button" aria-expanded="false" aria-controls="side">&#9638; Widgets</button>'+
  '<button class="btn" id="menuBtn" type="button" aria-expanded="true" aria-controls="panel">&#9776; Menu</button></div>'+
  '<aside id="panel" aria-label="Second brain controls"><div class="phead"><b>Controls</b><button class="btn" id="panelX" type="button" aria-label="Close the controls">&#10005;</button></div><h3>Search</h3>'+
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
const $=function(id){return shadow.getElementById(id)};
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
const TAU=Math.PI*2;
const mq=window.matchMedia?matchMedia("(prefers-reduced-motion: reduce)"):{matches:false};
/* Motion: reduced motion turns it off by default; the Motion button overrides that, and is remembered */
const MKEY="brain-motion";
function savedMotion(){try{const v=localStorage.getItem(MKEY);return v==="on"?true:v==="off"?false:null}catch{return null}}
function setMotion(on,remember){S.motion=on;$("motion").checked=on;const b=$("motionBtn");b.textContent=on?"Motion on":"Motion off";b.setAttribute("aria-pressed",String(on));
  if(remember)try{localStorage.setItem(MKEY,on?"on":"off")}catch{}dirty=true}
const INS={bottom:0}; // screen space a bottom sheet covers; the map centres above it
/* Course lessons: course/index.html keeps progress under CKEY; a lesson's dot stays grey until it is done */
const CKEY="ai-course:v1";let lit={};
function readLit(){lit={};try{const s=JSON.parse(localStorage.getItem(CKEY)||"null");if(s&&s.done)for(const k in s.done)lit[k]=1}catch{}dirty=true}
window.addEventListener("storage",function(e){if(e.key===CKEY)readLit()});

/* ---------- data ---------- */
function validData(d){return d&&Array.isArray(d.rooms)&&d.rooms.length&&d.root&&Array.isArray(d.skills)}
// every link in the data is relative to brain/: make it absolute, so the map works mounted on any page
function absolute(d,from){
  function a(u){try{return new URL(u,from).href}catch{return u}}
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
  const url=new URL(BASE+"brain-data.json",location.href).href;
  fetch(url).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
    if(!validData(d))throw 0;start(absolute(d,url),"public notes, pages, posts and skills")}).catch(fail);
}

/* ---------- state ---------- */
const S={layout:"hex",view:"folders",spin:0.05,motion:savedMotion()!=null?savedMotion():!mq.matches,names:false,spring:0.5,size:0.6,
  q:"",hover:null,sel:null,here:false,angle:0,legend:false,fol:null,page:"",read:-1}; // here: sel is the page the reader is on, shown alone; fol: {hub,i} a folder of the selected room; page: the url of the page on show; read: the reading-order entry open in the card
const nodes=[],rooms=[],hubs=[],skills=[],routines=[],apps=[];let root=null;
const cv=$("cv"),ctx=cv.getContext("2d");let W=0,H=0,DPR=1;
const view={k:.6,x:0,y:0,tk:.6,tx:0,ty:0,user:false};
let applied="",dirty=true,flags=null,flagMode=false,focusLinks=[],guideA=0,cache={},sprites={},matchCount=0;
/* ---------- palette: Calm is a light map, HUD and Matrix keep the dark one ----------
   The canvas reads the skin's tokens from the page (hud.css). Node colours in the data are the HUD hexes; in Calm each one
   maps to its Calm token (TOK), and anything else is darkened. C(hex) is a shape's colour, T(hex) a label's. */
const TOK={"#ff7a1a":"--k-root","#ff9a3c":"--k-skill","#ffb347":"--k-routine","#6c6a66":"--k-off","#5a6270":"--k-off","#5cd3ff":"--k-cli",
  "#2ee6c5":"--k-project","#ffd93d":"--k-page","#b57bff":"--r1","#ff4fd8":"--r2","#4f8dff":"--r3","#ff8a3d":"--r6"};
let PAL={light:false};
function tok(name,fb){const v=getComputedStyle(host).getPropertyValue(name).trim();return /^#[0-9a-f]{6}$/i.test(v)?v:fb}
function darken(hex,f){const n=parseInt(hex.slice(1),16);function c(v){return Math.round(v*(1-f))}return"#"+((1<<24)+(c(n>>16)<<16)+(c(n>>8&255)<<8)+c(n&255)).toString(16).slice(1)}
function readPal(){
  const light=document.documentElement.getAttribute("data-skin")==="calm";
  PAL=light?{light:true,bg:tok("--bg","#faf7f2"),ink:tok("--ink","#2b2620"),mute:tok("--mute","#6b5f4a"),fill:tok("--panel","#ffffff"),tint:tok("--accent-dim","#efe3d2"),accent:tok("--accent","#8a5a2b")}
    :{light:false,bg:"#05060a",ink:"#e9e6e0",mute:"#cfc9bd",fill:"#0c0e11",tint:"#2a1608",accent:"#ff7a1a"};
  PAL.col={};PAL.txt={};
  sprites={};dirty=true;
}
function C(hex){
  if(!PAL.light)return hex;
  return PAL.col[hex]||(PAL.col[hex]=TOK[hex.toLowerCase()]?tok(TOK[hex.toLowerCase()],darken(hex,.45)):darken(hex,.45));
}
function T(hex){return PAL.light?(PAL.txt[hex]||(PAL.txt[hex]=darken(C(hex),.4))):hex}
let drag=null;const mouse={x:-1,y:-1};

function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function start(d,srcLabel){
  readPal();
  // the skin can change at any time (the top bar, another tab): the map repaints in the new one
  new MutationObserver(function(){readPal();buildLegend();if(g3)g3.backgroundColor(PAL.bg)}).observe(document.documentElement,{attributes:true,attributeFilter:["data-skin"]});
  $("src").textContent="public data · "+srcLabel;
  window.AIO_READING=d.reading||[];
  // the "#map" entry opens the chart itself, so it is not a reading page in the drawer's "n of m" run
  drawer=AIODrawer({reading:window.AIO_READING.filter(function(r){return r.url.indexOf("#map")<0}),onClose:function(){S.sel=null;S.fol=null;S.read=-1;applyFocus();dirty=true},
    onNote:function(id){if(byId[id])openNode(byId[id])}}); // "Show on the map" in the note reader
  readLit();build(d);buildLegend();wire();renderSides();
  resize();setLayout(S.layout,true);mountTour();
  requestAnimationFrame(frame);
  if(FRAMED&&pending)API.select(pending);
  // a link such as broman-os/index.html#first-mate opens that node's card
  function fromHash(){const id=decodeURIComponent(location.hash.slice(1));if(id&&byId[id])openNode(byId[id])}
  window.addEventListener("hashchange",fromHash);setTimeout(fromHash,0);
}
let pending=null;
function bare(u){try{u=new URL(u,location.href);return(u.origin+u.pathname).replace(/index\.html$/,"")}catch{return String(u)}}
const API={
  // highlight the node of the page at url (a post's dot, or a page's hexagon) without opening its card
  select:function(url){
    if(!nodes.length){pending=url;return}
    const u=bare(url);let hit=null;
    nodes.forEach(function(n){if(n.info&&n.info.url&&bare(n.info.url)===u)hit=n});
    S.sel=hit;S.fol=null;S.read=-1;S.page=u;S.here=!!hit;applyFocus();dirty=true;return hit;
  },
  // the tests read what is lit and where a node sits on the canvas
  state:function(){return{here:S.here&&S.sel?S.sel.label:null,lit:flagMode?nodes.filter(function(n){return flags[n.i]}).map(function(n){return n.label}):[]}},
  // and how they sit, in world units: the gap from a page badge to its nearest dot, and the closest two dots come
  metrics:function(){
    const dots=nodes.filter(function(n){return n.type==="dot"&&n.vis>.5});let gap=1e9,pitch=1e9;
    apps.forEach(function(a){dots.concat(hubs).forEach(function(d){gap=Math.min(gap,Math.hypot(a.x-d.x,a.y-d.y)-a.r)})});
    dots.forEach(function(a,i){for(let j=i+1;j<dots.length;j++)pitch=Math.min(pitch,Math.hypot(a.x-dots[j].x,a.y-dots[j].y))});
    return{gap:gap,badge:apps.length?2*apps[0].r:0,pitch:pitch,layout:S.layout,view:S.view};
  },
  // the ground and the colours the canvas writes text in, for the contrast test
  textColours:function(){return{bg:PAL.bg,text:rooms.map(function(R){return T(R.color)}).concat(apps.map(function(a){return T(a.color)}),[PAL.ink,PAL.mute])}},
  screenOf:function(label){const n=nodes.filter(function(m){return m.label===label&&m.type==="app"})[0];return n?w2s(n.x,n.y):null},
  setInsets:function(bottom){INS.bottom=bottom||0;if(!view.user)fitView();dirty=true},
  overlay:function(on){host.classList.toggle("ov",!!on);setTimeout(resize,0)},
  lit:readLit, // the course page calls this after a lesson is done
  // a link to a note or text file of this site opens in the drawer's reader, rendered; true when it did
  note:function(url){if(!drawer||!drawer.isText(url))return false;drawer.note({href:url,label:decodeURIComponent(url.split("/").pop().replace(/\.\w+$/,"").replace(/-/g," "))});return true},
  // the site's one dropdown reads and drives the map's controls through these two
  get:function(){return{motion:!!S.motion,widgets:!$("side").hidden,legend:!!S.legend,layout:S.dim3?"3d":S.layout,menu:!$("panel").hidden}},
  act:function(name){
    if(name==="motion")setMotion(!S.motion,true);
    else if(name==="widgets")setSides($("side").hidden);
    else if(name==="legend")setLegend(!S.legend);
    else if(name==="menu"){const open=$("panel").hidden;setPanel(open,true)}
    else if(name==="search"){setPanel(true,true);$("q").focus()}
    else if(name==="3d")setDim(true);
    else if(/^(force|circle|hex|rings)$/.test(name)){setDim(false,true);setLayout(name)}
  },

  host:host,root:shadow
};
const byId={}; // node by its data id (notes, parts, posts) or name (skills, pages)

function mk(type,label,extra){
  const n={i:nodes.length,type:type,label:label,x:0,y:0,tx:0,ty:0,vis:1,tv:1,rate:3+Math.random()*3,r:3,room:-1,folder:-1,color:"#ff7a1a",name:"",rand:Math.random()};
  for(const k in extra)n[k]=extra[k];
  nodes.push(n);return n;
}

function build(d){
  const rand=rng(7);
  root=mk("root",d.root.label||"CLAUDE.md",{r:13,color:"#ff7a1a",info:d.root});
  d.rooms.forEach(function(rm,ri){
    let total=0;rm.folders.forEach(function(f){total+=f.count});
    const hub=mk("hub",rm.label,{r:9,color:rm.color,room:ri,count:total,collapsed:false,info:rm});
    rooms.push({id:rm.id,label:rm.label,color:rm.color,hub:hub,dots:[],count:total,folders:rm.folders,collapsed:false,ang0:0,span:0});
    hubs.push(hub);
    byId[rm.id]=hub; // a link such as index.html#giants opens the room's card
  });
  (d.skills||[]).forEach(function(s,i){skills.push(mk("skill",s.n,{r:5,color:"#ff9a3c",info:s,idx:i}))});
  const skillByName={};skills.forEach(function(s){skillByName[s.label]=s});
  (d.routines||[]).forEach(function(r,i){
    const run=r.status==="running"||r.status==="scheduled";
    routines.push(mk("routine",r.n,{r:6,color:run?"#ffb347":"#6c6a66",info:r,on:run,skillNode:skillByName[r.skill]||null,idx:i}));
  });
  // projects and pages share the outer ring with the apps; they carry a url to open
  const KIND={cli:"#5cd3ff",project:"#2ee6c5",page:"#ffd93d"};
  (d.apps||[]).concat(d.projects||[],d.pages||[]).forEach(function(a,i){
    const ok=["not connected","needs Chrome","paused"].indexOf(a.state)<0;
    apps.push(mk("app",a.n,{r:9,color:ok?(KIND[a.kind]||"#4f8dff"):"#5a6270",info:a,on:ok,idx:i}));
  });
  d.rooms.forEach(function(rm,ri){
    const R=rooms[ri];
    rm.folders.forEach(function(f,fi){
      for(let j=0;j<f.count;j++){
        // a file is {id, n, line, body, links, rel, url}; every one is public, so it is named and has a card
        const it=f.files&&j<f.files.length?f.files[j]:{},nm=typeof it==="string"?it:(it.n||"");
        const n=mk("dot",nm,{r:2.6+rand()*1.2,color:rm.color,room:ri,folder:fi,name:nm,hub:R.hub,info:typeof it==="string"?{}:it,rand:rand(),rate:2.5+rand()*4,jit:rand()*TAU});
        R.dots.push(n);if(n.info.id)byId[n.info.id]=n;
      }
    });
  });
  skills.concat(apps).forEach(function(n){byId[n.label]=n});
  flags=new Uint8Array(nodes.length);
}

/* ---------- layouts (base positions in world units, root at 0,0) ---------- */
const FACTOR={dot:1,hub:1,skill:-1.5,routine:.6,app:-.4,root:0};
function ringPlace(list,r,off){list.forEach(function(n,i){const a=off+i/list.length*TAU;n.bx=r*Math.cos(a);n.by=r*Math.sin(a)})}
function sectors(){
  let total=0;const gap=.07;rooms.forEach(function(r){total+=r.count});
  const avail=TAU-gap*rooms.length;let a=-Math.PI/2;
  rooms.forEach(function(r){r.span=avail*r.count/total;r.ang0=a;a+=r.span+gap});
}
function hexCell(q,r,sp){return[sp*(q+r/2),sp*r*.866]}
function hexSpiral(count){
  const out=[[0,0]];let ring=1;const dirs=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  while(out.length<count){
    let q=-ring,r=ring;
    for(let s=0;s<6;s++)for(let t=0;t<ring;t++){out.push([q,r]);q+=dirs[s][0];r+=dirs[s][1]}
    ring++;
  }
  return out;
}
function hexPerimeter(R,i,m){
  const t=i/m*6,k=Math.floor(t),f=t-k,a0=-Math.PI/2+k*Math.PI/3,a1=a0+Math.PI/3;
  return[R*((1-f)*Math.cos(a0)+f*Math.cos(a1)),R*((1-f)*Math.sin(a0)+f*Math.sin(a1))];
}

function computeLayout(name){
  const key=name+"|"+S.spring.toFixed(2)+"|"+S.size.toFixed(2);
  if(cache[key]){
    if(applied!==key){ // node base positions are shared: restore this layout's
      const P=cache[key].pos;
      for(let i=0;i<nodes.length;i++){nodes[i].bx=P[2*i];nodes[i].by=P[2*i+1]}
      applied=key;
    }
    return cache[key];
  }
  const L={ext:700,guides:[]},sp=14*S.size+2,rand=rng(11);
  sectors();root.bx=0;root.by=0;
  if(name==="rings"){
    const rho0=215,step=sp;let rEnd=rho0;
    rooms.forEach(function(R){
      let i=0,row=0;const A=R.span;
      while(i<R.dots.length){
        const rho=rho0+row*step,cap=Math.max(1,Math.floor(rho*A/sp));
        for(let j=0;j<cap&&i<R.dots.length;j++,i++){
          const a=R.ang0+(j+.5)/cap*A;
          R.dots[i].bx=rho*Math.cos(a);R.dots[i].by=rho*Math.sin(a);
        }
        rEnd=Math.max(rEnd,rho);row++;
      }
      const am=R.ang0+R.span/2;R.hub.bx=(rho0-26)*Math.cos(am);R.hub.by=(rho0-26)*Math.sin(am);
    });
    ringPlace(skills,130,-Math.PI/2);
    // no routines on the public map: the pages ring moves in where they were
    const rr=rEnd+58,ra=routines.length?rEnd+120:rEnd+70;
    ringPlace(routines,rr,-Math.PI/2+.2);ringPlace(apps,ra,-Math.PI/2);
    L.ext=ra+70;
    L.guides=[{r:130,c:"#ff7a1a",label:"SKILLS",lc:"#ff9a3c",ly:-(130-16)},
      {r:rEnd+22,c:"#7a4fd0",label:"MEMORY",lc:"#b57bff",ly:-(rEnd+8)},
      {r:ra,c:"#2f5fa8",label:"PAGES AND PROJECTS",lc:"#5ea0ff",ly:-(ra-14)}];
    if(routines.length)L.guides.splice(2,0,{r:rr,c:"#c98a2e",label:"ROUTINES",lc:"#ffb347",ly:-(rr-14)});
  }else if(name==="circle"){
    let maxD=0;
    rooms.forEach(function(R){
      let rings=0,cap=0;while(cap<R.dots.length){rings++;cap+=6*rings}
      R.rad=rings*sp;maxD=Math.max(maxD,R.rad);
    });
    const Rc=Math.max(300,(maxD+36)/Math.sin(Math.PI/rooms.length));
    rooms.forEach(function(R,ri){
      const a=-Math.PI/2+ri/rooms.length*TAU,cx=Rc*Math.cos(a),cy=Rc*Math.sin(a);
      R.hub.bx=cx;R.hub.by=cy;
      let i=0,ring=1;
      while(i<R.dots.length){
        const cap=6*ring;
        for(let j=0;j<cap&&i<R.dots.length;j++,i++){
          const b=j/cap*TAU+ring*.35;
          R.dots[i].bx=cx+ring*sp*Math.cos(b);R.dots[i].by=cy+ring*sp*Math.sin(b);
        }
        ring++;
      }
    });
    ringPlace(skills,130,-Math.PI/2);
    const r2=Rc+maxD+70;
    ringPlace(routines,r2,-Math.PI/2+.2);ringPlace(apps,r2+66,-Math.PI/2);
    L.ext=r2+66+70;
    L.guides=[{r:130,c:"#ff7a1a",label:"SKILLS",lc:"#ff9a3c",ly:-114}];
  }else if(name==="hex"){
    // the cells sit wider apart than in the other layouts, so folder and room names fit between them
    const hs=sp*2.4,S0=skills.length;let M=0;rooms.forEach(function(R){M+=R.count});
    const cells=hexSpiral(1+S0+M+40);
    const skillCells=cells.slice(1,1+S0),memCells=cells.slice(1+S0,1+S0+M);
    skillCells.forEach(function(c,i){const p=hexCell(c[0],c[1],hs);skills[i].bx=p[0];skills[i].by=p[1]});
    // memory cells follow the skill cells in spiral order, so they sit outside
    // the skills block; sort by angle from the top so each room gets a wedge
    let maxR=0;
    const mp=memCells.map(function(c){const p=hexCell(c[0],c[1],hs);
      return{x:p[0],y:p[1],a:(Math.atan2(p[1],p[0])+Math.PI/2+TAU)%TAU,r:Math.hypot(p[0],p[1])}});
    skills.forEach(function(s){maxR=Math.max(maxR,Math.hypot(s.bx,s.by))});
    mp.forEach(function(p){maxR=Math.max(maxR,p.r)});
    mp.sort(function(a,b){return a.a-b.a||a.r-b.r});
    let k=0;
    rooms.forEach(function(R){
      let sx=0,sy=0;
      R.dots.forEach(function(n){const p=mp[k++];n.bx=p.x;n.by=p.y;sx+=p.x;sy+=p.y});
      R.hub.bx=sx/R.dots.length;R.hub.by=sy/R.dots.length; // the room's name sits on the middle of its own notes
    });
    // the badges hug the cluster: each sits one badge width outside the cells nearest its own bearing (the hex layout does not spin)
    const badge=2*(apps.length?apps[0].r:9);let far=0;
    function outer(a,w){let o=0;mp.forEach(function(p){const d=Math.abs(p.a-a);if(Math.min(d,TAU-d)<=w&&p.r>o)o=p.r});return o||maxR}
    if(routines.length){routines.forEach(function(n,i){const p=hexPerimeter(maxR+badge+9,i,routines.length);n.bx=p[0];n.by=p[1]});far=badge+9}
    apps.forEach(function(n,i){
      const a=i/apps.length*TAU,rad=outer(a,TAU/apps.length*.75)+badge+9+far;
      n.bx=rad*Math.sin(a);n.by=-rad*Math.cos(a); // bearing a is measured from the top, clockwise
      L.far=Math.max(L.far||0,rad);
    });
    L.ext=(L.far||maxR)+badge+16;
    L.guides=[];
  }else{ // force
    const spread=1.6-1.2*S.spring;
    const cr=rooms.map(function(R){return 6.2*Math.sqrt(R.count)*spread});
    const pos=rooms.map(function(R,i){const a=-Math.PI/2+i/rooms.length*TAU;return[360*Math.cos(a),360*Math.sin(a)]});
    for(let it=0;it<160;it++){
      for(let a=0;a<pos.length;a++){
        let fx=-pos[a][0]*.01,fy=-pos[a][1]*.01;
        for(let b=0;b<pos.length;b++){
          if(a===b)continue;
          const dx=pos[a][0]-pos[b][0],dy=pos[a][1]-pos[b][1],d=Math.hypot(dx,dy)||1,want=cr[a]+cr[b]+30;
          if(d<want){fx+=dx/d*(want-d)*.12;fy+=dy/d*(want-d)*.12}
        }
        pos[a][0]+=fx;pos[a][1]+=fy;
      }
    }
    let maxE=0;
    rooms.forEach(function(R,ri){
      R.hub.bx=pos[ri][0];R.hub.by=pos[ri][1];
      R.dots.forEach(function(n){
        const a=rand()*TAU,r=cr[ri]*Math.pow(rand(),.6);
        n.bx=pos[ri][0]+r*Math.cos(a);n.by=pos[ri][1]+r*Math.sin(a);
      });
      maxE=Math.max(maxE,Math.hypot(pos[ri][0],pos[ri][1])+cr[ri]);
    });
    ringPlace(skills,110,-Math.PI/2);
    function scatter(list,r){list.forEach(function(n,i){const a=i/list.length*TAU+.3,rr=r+(rand()-.5)*50;n.bx=rr*Math.cos(a);n.by=rr*Math.sin(a)})}
    scatter(routines,maxE+70);scatter(apps,maxE+150);
    L.ext=maxE+210;
  }
  L.pos=new Float32Array(nodes.length*2);
  for(let j=0;j<nodes.length;j++){L.pos[2*j]=nodes[j].bx||0;L.pos[2*j+1]=nodes[j].by||0}
  applied=key;cache[key]=L;return L;
}

/* ---------- control wiring ---------- */
function setLayout(name,quiet){
  S.layout=name;
  const L=computeLayout(name);
  view.user=false;fitView(L);
  const btns=shadow.querySelectorAll("#layouts .btn");
  for(let i=0;i<btns.length;i++)btns[i].setAttribute("aria-pressed",btns[i].dataset.l===name);
  if(!quiet)say("Layout "+name);
  dirty=true;
}
function setView(v){
  S.view=v;const b=shadow.querySelectorAll("#views .btn");
  for(let i=0;i<b.length;i++)b[i].setAttribute("aria-pressed",b[i].dataset.v===v);
  dirty=true;
}
function say(t){$("live").textContent=t}
function fitView(L){
  if(!root)return; // the frame may resize the map before its data has loaded
  const aw=W,ah=Math.max(160,H-INS.bottom-(W>760?56:0)), /* on a wide screen the hint line takes the bottom strip */k=Math.min(aw,ah)/(2*(L||computeLayout(S.layout)).ext)*.98;
  view.tk=k;view.tx=aw/2;view.ty=ah/2+8;
  if(!S.motion||!view.init){view.k=k;view.x=view.tx;view.y=view.ty;view.init=true}
}
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=cv.clientWidth||window.innerWidth;H=cv.clientHeight||window.innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  if(g3&&S.dim3){const sz=g3Size();g3.width(sz[0]).height(sz[1])}
  if(!view.user)fitView();dirty=true;
}

function wire(){
  $("layouts").addEventListener("click",function(e){const b=e.target.closest("button");if(b)setLayout(b.dataset.l)});
  $("views").addEventListener("click",function(e){const b=e.target.closest("button");if(b)setView(b.dataset.v)});
  setView(S.view);
  $("q").addEventListener("input",function(){S.q=this.value.trim().toLowerCase();applyFocus();dirty=true});
  function slider(id,key,out,digits){
    const s=$(id);s.addEventListener("input",function(){S[key]=parseFloat(this.value);$(out).textContent=S[key].toFixed(digits);
      if(key!=="spin"){cache={};if(!view.user)fitView()}dirty=true});
  }
  slider("spin","spin","spinO",2);slider("spring","spring","springO",2);slider("size","size","sizeO",2);
  setMotion(S.motion,false);
  $("motion").addEventListener("change",function(){setMotion(this.checked,true)});
  $("motionBtn").addEventListener("click",function(){setMotion(!S.motion,true)});
  $("dimBtn").addEventListener("click",function(){setDim(!S.dim3)});
  $("names").addEventListener("change",function(){S.names=this.checked;dirty=true});
  $("expand").addEventListener("click",function(){setAll(false)});
  $("collapse").addEventListener("click",function(){setAll(true)});
  $("menuBtn").addEventListener("click",function(){setPanel($("panel").hidden,true)});
  $("panelX").addEventListener("click",function(){setPanel(false,true)});
  $("legendBtn").addEventListener("click",function(){
    S.legend=!S.legend;$("legend").hidden=!S.legend;this.setAttribute("aria-expanded",S.legend)});
  // the menu starts closed unless the map has room beside it (the Menu button or / or ⌘K opens it)
  if(window.innerWidth<1400){$("panel").hidden=true;$("menuBtn").setAttribute("aria-expanded","false")}
  $("sideBtn").addEventListener("click",function(){setSides($("side").hidden)});
  setSides(window.innerWidth>=900&&!opts.explain); // the calm landing keeps the side lists behind Widgets
  window.addEventListener("resize",resize);
  if(mq.addEventListener)mq.addEventListener("change",function(){if(savedMotion()==null)setMotion(!mq.matches,false)});
  document.addEventListener("keydown",function(e){
    const t=e.composedPath?e.composedPath()[0]:e.target; // the real target, also inside the shadow root
    const typing=/^(input|textarea|select)$/i.test(t.tagName||"")||t.isContentEditable;
    if((e.key==="/"&&!typing)||((e.metaKey||e.ctrlKey)&&(e.key||"").toLowerCase()==="k")){e.preventDefault();
      // with the tree on screen, search is the tree's filter box; otherwise the controls panel's
      const box=$("side").hidden?($("panel").hidden&&setPanel(true,true),$("q")):$("tq");box.focus();box.select()}
    else if(e.key==="Escape"){const was=!$("panel").hidden;$("q").value="";S.q="";S.sel=null;S.fol=null;S.read=-1;hideCard();applyFocus();dirty=true;if(was)setPanel(false,true)}
    else if(e.key==="m"&&!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey)setMotion(!S.motion,true);
  });
  cv.addEventListener("pointermove",onMove);
  cv.addEventListener("pointerdown",onDown);
  cv.addEventListener("pointerup",onUp);
  cv.addEventListener("pointerleave",function(){if(!drag){mouse.x=-1;setHover(null)}});
  cv.addEventListener("wheel",onWheel,{passive:false});
  cv.addEventListener("dblclick",function(e){
    const n=pick(e.offsetX,e.offsetY);
    if(n&&n.type==="hub")toggleRoom(rooms[n.room]);
    else if(!n){view.user=false;fitView();dirty=true}
  });
  cv.tabIndex=0;
}
let tucked=false;
function setSides(on){
  // on a phone the tree is a full-width drawer and the card would cover it: the card steps aside, keeping its selection, and returns when the tree closes
  if(window.innerWidth<900&&drawer){
    if(on&&!drawer.el.hidden){drawer.el.hidden=true;tucked=true}
    else if(!on&&tucked){drawer.el.hidden=false;tucked=false}
  }
  $("side").hidden=!on;document.body.classList.toggle("side",on);
  $("sideBtn").setAttribute("aria-expanded",on);resize();
  if(on)syncTree(true); // the tree scrolls to the selection it was not showing
}
/* ---------- side widgets (same real data as the map) ---------- */
function renderSides(){
  function item(n,right,cls){
    const li=el("li"),b=el("button","lk",n.label);b.type="button";
    b.addEventListener("click",function(){
      if(window.innerWidth<900)setSides(false); // show the map behind the card
      openNode(n);
    });
    li.appendChild(b);li.appendChild(el("span",cls||"m",right));return li;
  }
  buildTree();
  // an empty deck is not drawn, so the map keeps the width
  if(skills.length)skills.forEach(function(n){$("sSkills").appendChild(item(n,"details"))});
  else{$("wr").remove();document.body.classList.add("noskills")}
}
/* ---------- the left tree: the reading order, the rooms (room > folder > file) and the pages ----------
   One selection drives the map, the card and this tree: S.sel (a node), S.fol (a folder of the selected room) and
   S.read (a reading-order step). applyFocus() calls syncTree(), so every way of selecting (the map, the tree, the
   card's Related buttons, a #hash, the tour) lights the same row, opens its parents and updates the trail. */
let syncTree=function(){},closeAll=function(){},filterTree=function(){};
function readPage(i){
  const r=(window.AIO_READING||[])[i];if(!r)return;
  S.used=true;
  if(opts.onPage&&opts.onPage(r.url)){S.read=i;applyFocus();return} // on a framed page the page overlay shows it
  S.sel=null;S.fol=null;S.read=i;hideCard();applyFocus();dirty=true;
  const j=drawer.readIndex(r.url);if(j>=0)drawer.read(j);
}
function openFolder(R,fi){
  const f=R.folders[fi],files=R.dots.filter(function(d){return d.folder===fi&&d.name});
  S.used=true;S.sel=R.hub;S.fol={hub:R.hub,i:fi};S.here=false;S.read=-1;hideCard();applyFocus();dirty=true;say(R.label+", "+f.name);
  drawer.card({kind:"Folder",title:f.name,line:"folder · "+f.count+" item"+(f.count===1?"":"s")+" in "+R.label,status:"in the room "+R.label,statusCls:"a",
    body:el("p",null,f.count+" item"+(f.count===1?"":"s")+" in this folder"+(files.length<f.count?"; only "+files.length+" are named." :". Pick one below, or in the tree on the left.")),
    related:[{label:R.label+" (room)",go:function(){openNode(R.hub)}}].concat(files.map(function(d){return{label:d.name,go:function(){openNode(d)}}}))});
}
// bring a node into the part of the map that is not under the left list or the card
function reveal(n){
  if(!n||n.x==null||window.innerWidth<760)return;
  const sx=view.x+n.x*view.k,sy=view.y+n.y*view.k,pad=28,
    l=(document.body.classList.contains("side")?260:0)+pad,r=W-(drawer.el.hidden?0:drawer.el.offsetWidth)-pad,b=H-INS.bottom-pad,
    dx=sx<l?l-sx:sx>r?r-sx:0,dy=sy<pad?pad-sy:sy>b?b-sy:0;
  if(!dx&&!dy)return;
  view.x+=dx;view.y+=dy;view.tx=view.x;view.ty=view.y;dirty=true;
}
function buildTree(){
  const tree=$("tree"),acts={},items={};let last="",cur=null,rove=null;const reading=window.AIO_READING||[];
  function item(key,label,meta,level,kids,act){
    const li=el("li"),r=el("div","tr"),tw=el("span","tw",kids?"▸":"");
    r.style.paddingLeft=((level-1)*12+4)+"px";
    li.setAttribute("role","treeitem");li.setAttribute("aria-level",level);li.setAttribute("aria-label",label);li.tabIndex=-1;li.dataset.k=key;
    tw.setAttribute("aria-hidden","true");r.appendChild(tw);r.appendChild(el("span","lk",label));
    if(meta!=null&&meta!=="")r.appendChild(el("span","m",meta));
    li.appendChild(r);
    if(kids){const g=el("ul");g.setAttribute("role","group");g.hidden=true;li.setAttribute("aria-expanded","false");li.appendChild(g)}
    acts[key]=act||null;items[key]=li;return li;
  }
  function put(parent,li){(parent?parent.lastChild:tree).appendChild(li);return li}
  function toggle(li,on){
    const g=li.lastChild;if(g.tagName!=="UL")return;
    const open=on==null?li.getAttribute("aria-expanded")!=="true":on;
    li.setAttribute("aria-expanded",String(open));g.hidden=!open;
  }
  function visible(){return[].filter.call(tree.querySelectorAll("li"),function(x){return!x.hidden&&!x.parentNode.closest("ul[hidden],li[hidden]")})}
  function setRove(li){if(rove)rove.tabIndex=-1;rove=li;li.tabIndex=0}
  function focusRow(li){setRove(li);li.focus({preventScroll:false})}
  function activate(li){
    const act=acts[li.dataset.k];
    if(act){
      act();if(li.getAttribute("aria-expanded")==="false")toggle(li,true);
      li.focus({preventScroll:true}); // the card takes focus when it opens; the reader stays on the row, so the arrow keys keep working
      if(window.innerWidth<900)setSides(false); // show the map behind the card
    }
    else toggle(li); // a group row only opens and closes
  }
  // Read in order
  if(reading.length){
    const gr=put(null,item("g:read","Read in order",reading.length,1,true));
    reading.forEach(function(r,i){put(gr,item("rd:"+i,(i+1)+". "+r.title,r.line.split(" · ")[0],2,false,function(){readPage(i)}))});
    toggle(gr,true);
  }
  // the rooms, each with its folders and files
  const gm=put(null,item("g:rooms","Rooms",rooms.length,1,true));
  put(gm,item("root",root.label,"router file",2,false,function(){openNode(root)}));
  rooms.forEach(function(R,ri){
    const rl=put(gm,item("r:"+ri,R.label,R.count,2,true,function(){openNode(R.hub)}));
    R.folders.forEach(function(f,fi){
      const fl=put(rl,item("f:"+ri+":"+fi,f.name,f.count,3,true,function(){openFolder(R,fi)})),files=R.dots.filter(function(d){return d.folder===fi});
      files.forEach(function(d){if(d.name)put(fl,item("n:"+d.i,d.name,"",4,false,function(){R.collapsed=false;openNode(d);reveal(d)}))});
      const un=files.filter(function(d){return!d.name}).length;
      if(un)put(fl,item("u:"+ri+":"+fi,"+ "+un+" more, names not listed","",4,false,null));
    });
  });
  toggle(gm,true);
  // the pages and projects (the map's outer ring)
  if(apps.length){
    const gp=put(null,item("g:pages","Pages and projects",apps.length,1,true));
    apps.forEach(function(n){put(gp,item("n:"+n.i,n.label,n.info.kind,2,false,function(){openNode(n);reveal(n)}))});
  }
  setRove(tree.firstChild);

  function selKey(){
    const n=S.sel;
    if(S.read>=0)return"rd:"+S.read; // a step the reader picked in the list wins
    if(n){
      if(n.type==="root")return"root";
      if(n.type==="hub")return S.fol&&S.fol.hub===n?"f:"+n.room+":"+S.fol.i:"r:"+n.room;
      return n.type==="dot"||n.type==="app"?"n:"+n.i:"";
    }
    if(S.page)for(let i=0;i<reading.length;i++)if(reading[i].url.indexOf("#")<0&&bare(reading[i].url)===S.page)return"rd:"+i; // the page on show
    return"";
  }
  function crumb(ol,label,fn,here){
    const li=el("li");
    if(here){const s=el("span",null,label);s.setAttribute("aria-current","location");li.appendChild(s)}
    else{const b=el("button","lk",label);b.type="button";b.addEventListener("click",fn);li.appendChild(b)}
    ol.appendChild(li);
  }
  function trail(){
    const t=$("trail");t.textContent="";t.appendChild(el("span","tl","You are here"));
    if(!cur){t.appendChild(el("p","none","Nothing picked yet. Pick a reading step, a room or a page."));return}
    const chain=[],ol=el("ol");
    for(let p=cur;p;p=p.parentNode.closest("li"))chain.unshift(p);
    crumb(ol,"Map",closeAll,false);
    chain.forEach(function(li,i){
      if(li.dataset.k==="g:rooms")return; // "Map > Shoulders of giants" reads better than "Map > Rooms > Shoulders of giants"
      const group=li.dataset.k.charAt(0)==="g";
      crumb(ol,li.getAttribute("aria-label"),function(){if(group)focusRow(li);else{activate(li);focusRow(li)}},i===chain.length-1);
    });
    t.appendChild(ol);
  }
  syncTree=function(force){
    const k=selKey();if(!force&&k===last)return;
    last=k;if(cur)cur.removeAttribute("aria-current");
    cur=k&&items[k]||null;
    if(cur){
      cur.setAttribute("aria-current","location");
      for(let p=cur.parentNode.closest("li");p;p=p.parentNode.closest("li"))toggle(p,true);
      if(cur.getAttribute("aria-expanded")==="false")toggle(cur,true);
      setRove(cur);
      if(S.used||!S.here)cur.firstChild.scrollIntoView({block:"nearest"}); // at load, the page the reader is on is marked but the list stays at the top
    }
    trail();
  };
  closeAll=function(){drawer.close();S.sel=null;S.fol=null;S.read=-1;hideCard();applyFocus();dirty=true};

  /* Filter: the same query as the map's search. A row stays when it matches, when something under it matches, or when a
     row above it matches (a room that matches keeps its folders and files). Groups that hold a match open; the open and
     shut state from before the filter comes back when it is cleared. */
  const tq=$("tq"),tcount=$("tcount");let was=null,q0="";
  function hit(li,q){
    const k=li.dataset.k;
    if(k.charAt(0)==="g"||k.charAt(0)==="u")return false; // the group headers and the "names not listed" rows are never a match
    if(k.indexOf("n:")===0)return hayOf(nodes[+k.slice(2)]).indexOf(q)>=0;
    return li.getAttribute("aria-label").toLowerCase().indexOf(q)>=0;
  }
  function walk(li,q,inherited,out){
    const own=hit(li,q),g=li.lastChild.tagName==="UL"?li.lastChild:null;let any=false,deep=false;
    if(g)[].forEach.call(g.children,function(c){const r=walk(c,q,own||inherited,out);if(r.vis)any=true;if(r.own)deep=true});
    li.hidden=!(own||inherited||any);
    if(own&&li.dataset.k.charAt(0)!=="u")out.n++;
    if(g&&deep)toggle(li,true);
    return{vis:!li.hidden,own:own||deep};
  }
  filterTree=function(q){
    if(tq.value.trim().toLowerCase()!==q)tq.value=q; // keep the two search boxes the same
    const all=[].slice.call(tree.querySelectorAll("li"));
    if(!q){
      if(was){
        all.forEach(function(li){li.hidden=false;if(li.dataset.k in was)toggle(li,was[li.dataset.k])});
        was=null;syncTree(true);
      }
      tcount.textContent="";q0="";return;
    }
    if(q===q0)return;
    q0=q;
    if(!was){was={};all.forEach(function(li){if(li.hasAttribute("aria-expanded"))was[li.dataset.k]=li.getAttribute("aria-expanded")==="true"})}
    const out={n:0};
    [].forEach.call(tree.children,function(li){walk(li,q,false,out)});
    tcount.textContent=out.n?out.n+" match"+(out.n===1?"":"es")+" in the tree":"No match. Clear the filter to see the whole tree.";
  };
  function setQ(v){S.q=v.trim().toLowerCase();$("q").value=v;applyFocus();dirty=true}
  tq.addEventListener("input",function(){setQ(this.value)});
  tq.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&tq.value){e.stopPropagation();setQ("")} // the first Esc clears the filter; the pick and the card stay
    else if(e.key==="ArrowDown"||e.key==="Enter"){
      const v=visible();if(!v.length)return;
      e.preventDefault();
      focusRow(e.key==="Enter"&&q0?v.filter(function(li){return hit(li,q0)})[0]||v[0]:rove&&v.indexOf(rove)>=0?rove:v[0]);
    }
  });

  tree.addEventListener("click",function(e){
    const r=e.target.closest(".tr");if(!r)return;
    const li=r.parentNode;setRove(li);
    if(e.target.closest(".tw")){toggle(li);li.focus();return}
    li.focus();activate(li);
  });
  tree.addEventListener("keydown",function(e){
    const li=e.target;if(li.tagName!=="LI"||e.altKey||e.ctrlKey||e.metaKey)return;
    const v=visible(),i=v.indexOf(li),k=e.key,open=li.getAttribute("aria-expanded");let to=null;
    if(k==="ArrowDown")to=v[i+1];
    else if(k==="ArrowUp")to=v[i-1];
    else if(k==="Home")to=v[0];
    else if(k==="End")to=v[v.length-1];
    else if(k==="ArrowRight"){if(open==="false")toggle(li,true);else if(open==="true")to=v[i+1];else return}
    else if(k==="ArrowLeft"){if(open==="true")toggle(li,false);else to=li.parentNode.closest("li")}
    else if(k==="Enter"||k===" "){activate(li)}
    else return;
    e.preventDefault();
    if(to)focusRow(to);
  });
  syncTree(true);
}
/* ---------- open a node: its card in the right-side drawer; a reading page opens its text there ---------- */
let drawer=null;
function openNode(n){
  S.used=true;S.sel=n;S.fol=null;S.read=-1;S.here=false;hideCard();applyFocus();dirty=true;say(n.label||"file");
  // a page or post of this site: on a framed page it opens in the page overlay instead of the drawer
  if(n.info&&n.info.url&&opts.onPage&&opts.onPage(n.info.url)){drawer.close();S.sel=n;S.here=true;applyFocus();return}
  const c=nodeCard(n),i=n.info&&n.info.url?drawer.readIndex(n.info.url):-1;
  if(i>=0)drawer.read(i,{status:c.status,statusCls:c.statusCls,related:c.related});else drawer.card(c);
}
// the Second-brain notes card: each interest tag sized by its note count, an empty tag dashed; a tap lists that tag's notes
function interestCloud(tags){
  const wrap=el("div","cloud-w"),cloud=el("div","cloud"),list=el("div","cloud-l");let pressed=null;const max=Math.max.apply(null,tags.map(function(t){return t.count}))||1;
  cloud.setAttribute("role","group");cloud.setAttribute("aria-label","Interest tags");list.setAttribute("aria-live","polite");
  tags.forEach(function(t){
    const b=el("button","ctag",t.name),c=el("span","cn",String(t.count));b.type="button";b.appendChild(c);
    b.style.fontSize=(12+Math.round(t.count/max*10))+"px";b.title=t.what;b.setAttribute("aria-pressed","false");
    if(!t.count)b.classList.add("empty");
    b.addEventListener("click",function(){
      const on=pressed!==b;
      Array.prototype.forEach.call(cloud.children,function(x){x.setAttribute("aria-pressed","false")});
      list.textContent="";pressed=on?b:null;
      if(!on)return;
      b.setAttribute("aria-pressed","true");
      list.appendChild(el("div","lg",t.name+" · "+(t.count?t.count+" note"+(t.count===1?"":"s"):"no notes yet")));
      if(!t.count)list.appendChild(el("p","none","A direction I want to build up. Nothing here yet."));
      t.notes.forEach(function(x){
        const nb=el("button",null,x.n);nb.type="button";nb.addEventListener("click",function(){if(byId[x.id])openNode(byId[x.id])});list.appendChild(nb);
      });
    });
    cloud.appendChild(b);
  });
  wrap.appendChild(cloud);wrap.appendChild(list);return wrap;
}
function nodeCard(n){
  function go(m){return{label:m.label||"a file",go:function(){openNode(m)}}}
  const c={title:n.label,related:[],links:[]},inf=n.info||{};
  // every link here comes from brain-data.json: public pages of this site or public https links
  function paras(b){if(!Array.isArray(b))return b;const w=el("div");b.forEach(function(p){w.appendChild(el("p",null,p))});return w}
  if(n.type==="root"){
    c.kind="Router file";c.line="router file"+(inf.also?" · also "+inf.also:"");c.body=inf.note;
    c.status="loaded first by every agent";c.statusCls="ok";
    c.links=(inf.links||[]).map(function(l){return{label:l[0],href:l[1]}});c.related=hubs.map(go);
  }else if(n.type==="hub"){
    const R=rooms[n.room],w=el("div"),ul=el("ul");c.kind="Room";c.line="room · "+R.count+" items in "+R.folders.length+" folder"+(R.folders.length===1?"":"s");
    if(inf.cloud)c.line="room · "+R.count+" notes · "+inf.cloud.filter(function(t){return t.count}).length+" of "+inf.cloud.length+" interests have notes";
    c.status=R.collapsed?"folded on the map":"open on the map";c.statusCls="a";
    if(inf.summary)w.appendChild(el("p",null,inf.summary));
    if(inf.cloud)w.appendChild(interestCloud(inf.cloud));
    if(inf.note)w.appendChild(el("p",null,inf.note));
    if(!inf.cloud)R.folders.forEach(function(f,fi){const li=el("li"),b=el("button","fl",f.name);b.type="button";b.addEventListener("click",function(){openFolder(R,fi)});li.appendChild(b);li.appendChild(el("span","k"," · "+f.count));ul.appendChild(li)});
    w.appendChild(ul);c.body=w;c.related=[go(root)].concat(R.dots.slice(0,12).map(go));c.links=inf.links||[];
  }else if(n.type==="dot"){
    const Rd=rooms[n.room],f=Rd.folders[n.folder];c.kind=Rd.label;
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
/* The controls float over the map and never resize it. On a phone they are a sheet over its lower part, so the page card steps aside while they are open. */
let panelFold=false;
function setPanel(on,user){
  $("panel").hidden=!on;$("menuBtn").setAttribute("aria-expanded",on);
  if(user&&window.innerWidth<=760){
    const folded=panelFold;
    if(opts.overlayShown){
      if(on&&!panelFold){panelFold=true;opts.overlayShown(false)}
      else if(!on&&panelFold){panelFold=false;opts.overlayShown(true)}
    }
    if(on)INS.bottom=$("panel").offsetHeight; // the map centres above the sheet
    else if(!folded)INS.bottom=0;
    if(!view.user)fitView();
  }
  if(user&&on)$("panelX").focus({preventScroll:true});
  else if(user){const o=document.getElementById("tbDrop")||$("menuBtn");if(o.offsetParent!==null)o.focus()} // focus goes back to what opened it
  dirty=true;
}
function setLegend(on){S.legend=on;$("legend").hidden=!on;$("legendBtn").setAttribute("aria-expanded",on)}
function mountTour(){
  if(!window.AIOTour)return;
  let keep=null;
  // on a framed page, the map steps fold the page overlay away and the overlay step brings it back
  const fold=opts.overlayShown||function(){};
  function mapView(){if(window.innerWidth<900){setSides(false);setPanel(false)}setLegend(false);fold(false)}
  // a circle around the map centre, radius in world units, at the settled view
  function ring(r){return function(){const b=cv.getBoundingClientRect(),R=r()*view.tk;
    return{x:b.left+view.tx-R,y:b.top+view.ty-R,w:2*R,h:2*R,round:true}}}
  function guide(i){return function(){return computeLayout("rings").guides[i].r+12}}
  function sh(id){return function(){return $(id)}} // steps point at parts inside the shadow root
  function doc(sel){return function(){return document.querySelector(sel)}}
  const steps=[
      {sel:FRAMED?sh("cv"):sh("src"),before:mapView,title:"The second brain",text:"A map of how the owner works with a crew of AI agents, always running behind every page of this site. It shows only public things: approved wiki notes, FirstMate's parts, the posts and this site's pages."},
      {rect:ring(function(){return 30}),before:mapView,title:"The centre: "+root.label,text:"Every agent reads this rules file first. Everything else on the map hangs off it."},
      {rect:ring(guide(1)),before:mapView,title:"Memory: rooms of notes",text:"Each coloured arc is a room, like Second-brain notes or Blog. One dot is one note, part or post. Click a dot for its card; double-click a room to fold it."},
      {rect:ring(guide(2)),before:mapView,title:"Outer ring: pages and projects",text:"Hexagons are this site's pages and public projects. A page or post opens on top of the map, and its node lights up."}];
  if(FRAMED)steps.push(
      {sel:doc(".k-nav"),before:mapView,title:"Site tabs",text:"The same bar on every page: Meta-Factory, Case studies, Blog, About and Work with me. Each page opens over this same map."},
      {sel:doc("#pageov"),before:function(){setLegend(false);fold(true)},title:"The page overlay",text:"Every page of the site reads in this panel, on top of the live map. Minimise it to see the whole map, or close it; the button that is left brings it back."});
  steps.push(
      {sel:sh("motionBtn"),before:mapView,title:"Buttons",text:"Turn the motion on or off (remembered on this device), show or hide the side lists, and open the menu."},
      {sel:sh("panel"),before:function(){if(window.innerWidth<900)setSides(false);setLegend(false);fold(false);setPanel(true)},title:"Menu",text:"Search the map (press / or ⌘K), switch layouts (Force, Circle, Hex, Rings), and tune motion and sizes."},
      {sel:sh("legend"),before:function(){mapView();setLegend(true)},title:"Legend",text:"Room colours with their counts, and what each shape means."},
      {sel:sh("wl"),before:function(){setLegend(false);fold(false);setSides(true)},title:"Left tree",text:"The same map as a tree: the reading order, each room with its folders and files, and the site's pages. It follows what you pick on the map, and a pick here shows on the map. A page or post opens "+(FRAMED?"in the page overlay.":"on the right, with Prev and Next.")},
      {sel:doc("#askBar"),before:mapView,title:"This ask bar",text:"Each question runs a short scripted tour like this one. Nothing is sent to a model."});
  function at(t){for(let i=0;i<steps.length;i++)if(steps[i].title===t)return i;return 0}
  AIOTour({
    steps:steps,
    // the landing passes opts.explain: one primary button, the map questions behind "More"
    chips:(opts.explain?[{q:"Explain this",act:opts.explain}]:[]).concat([
      {q:opts.explain?"Tour the map":"Explain this screen",from:0,sec:!!opts.explain},
      {q:"What do the shapes mean?",only:at("Legend"),sec:!!opts.explain},
      {q:"How do I find something?",only:at("Menu"),sec:!!opts.explain}
    ]),
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
  let best=null,bd=1e9;const order={hub:0,app:1,routine:1,skill:1,root:0,dot:2};
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];if(n.vis<.35)continue;
    const sx=view.x+n.x*view.k,sy=view.y+n.y*view.k,dx=sx-mx,dy=sy-my,d=dx*dx+dy*dy;
    const rad=Math.max(n.type==="dot"?5:9,n.r*view.k+3);
    if(d>rad*rad)continue;
    const score=order[n.type]*1e6+d;
    if(score<bd){bd=score;best=n}
  }
  return best;
}
function onMove(e){
  mouse.x=e.offsetX;mouse.y=e.offsetY;
  if(drag){
    const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
    if(drag.moved){view.x=drag.vx+dx;view.y=drag.vy+dy;view.tx=view.x;view.ty=view.y;view.user=true;dirty=true}
    return;
  }
  setHover(pick(mouse.x,mouse.y));
}
function onDown(e){drag={x:e.offsetX,y:e.offsetY,vx:view.x,vy:view.y,moved:false};cv.setPointerCapture(e.pointerId);cv.classList.add("drag")}
function onUp(e){
  cv.classList.remove("drag");
  const d=drag;drag=null;if(!d)return;
  if(!d.moved){
    const n=pick(e.offsetX,e.offsetY);
    // the page the reader is on opens again (its page card), it is not switched off
    if(n&&(n!==S.sel||S.here))openNode(n);
    else{S.sel=null;hideCard();drawer.close();applyFocus();dirty=true}
  }
}
function onWheel(e){
  e.preventDefault();
  const f=Math.exp(-e.deltaY*.0015),nk=Math.max(.15,Math.min(8,view.k*f));
  const wx=(e.offsetX-view.x)/view.k,wy=(e.offsetY-view.y)/view.k;
  view.k=nk;view.tk=nk;view.x=e.offsetX-wx*nk;view.y=e.offsetY-wy*nk;view.tx=view.x;view.ty=view.y;view.user=true;dirty=true;
}
function setHover(n){
  if(n===S.hover)return;
  S.hover=n;cv.classList.toggle("hit",!!n);
  if(n)showCard(n,mouse.x,mouse.y,false);else hideCard();
  applyFocus();dirty=true;
}

// the text the search reads for a node: the map flags the matches and the tree filters to them, from this one text
function hayOf(n){
  if(n.type==="dot")return(n.name+" "+rooms[n.room].label+" "+rooms[n.room].folders[n.folder].name).toLowerCase();
  if(n.type==="skill")return(n.label+" "+(n.info.desc||"")).toLowerCase();
  if(n.type==="root")return"";
  return(n.label+" "+(n.info.kind||"")+" "+(n.info.when||"")).toLowerCase();
}
function applyFocus(){
  syncTree();filterTree(S.q||"");
  const f=S.hover||(S.q&&S.here?null:S.sel); // a query beats the page's own "you are here" mark, so the map lights the matches the tree lists
  focusLinks=[];flags.fill(0);flagMode=false;matchCount=0;
  if(f){
    flagMode=true;flags[f.i]=1;
    if(f===S.sel&&S.here)return; // the page the reader is on is the one lit node: no centre node, no links
    flags[root.i]=1;
    const add=function(n){flags[n.i]=1};
    if(f.type==="dot"){add(f.hub);focusLinks.push([f,f.hub],[f.hub,root])}
    else if(f.type==="hub"){
      const fo=f===S.sel&&S.fol&&S.fol.hub===f?S.fol:null; // a folder picked in the tree or the card lights only its own files
      rooms[f.room].dots.forEach(function(d){if(fo&&d.folder!==fo.i)return;add(d);focusLinks.push([f,d])});focusLinks.push([f,root]);
    }
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
    const q=S.q;
    nodes.forEach(function(n){
      if(hayOf(n).indexOf(q)>=0){flags[n.i]=1;matchCount++;if(n.hub)flags[n.hub.i]=1}
    });
    flags[root.i]=1;
    $("hits").textContent=matchCount+" match"+(matchCount===1?"":"es");
    return;
  }
  $("hits").textContent="";
}

function showCard(n,mx,my,pin,keepPos){
  const c=$("card");c.textContent="";c.className=pin?"pin":"";
  const t=el("b",null,n.label||(n.type==="dot"?"unnamed file":""));c.appendChild(t);
  let k="",d="",s=null;
  if(n.type==="dot"){const R=rooms[n.room];k=n.info.line||R.label+" / "+R.folders[n.folder].name;
    if(!n.name)d="One of "+R.folders[n.folder].count+" files in this folder. Only some names are listed.";}
  else if(n.type==="hub"){const Rm=rooms[n.room];k="room · "+Rm.count+" files in "+Rm.folders.length+" folders";
    d=pin?"Double-click to "+(Rm.collapsed?"expand":"collapse")+".":"Click for folder counts.";
    if(pin){s=el("ul");Rm.folders.forEach(function(f){const li=el("li");li.appendChild(el("span",null,f.name));li.appendChild(el("span","k",String(f.count)));s.appendChild(li)})}}
  else if(n.type==="root"){k="router file";d=(n.info.also?"Also "+n.info.also+". ":"")+(n.info.note||"");}
  else if(n.type==="skill"){k="skill";d=(n.info.desc||"")+(n.info.url?"":" No public page yet.");}
  else if(n.type==="routine"){k="routine · "+(n.info.when||"");d=n.info.skill?"Runs /"+n.info.skill:"";
    s=el("div","s "+(n.on?"ok":"warn"),n.info.status||(n.on?"running":"not running"));}
  else if(n.type==="app"){k=n.info.kind+(n.info.kind==="project"||n.info.kind==="page"?"":" · application");s=el("div","s "+(n.on?"ok":"warn"),n.info.state||"");}
  c.appendChild(el("div","k",k));if(d)c.appendChild(el("div","d",d));if(s)c.appendChild(s);
  c.appendChild(el("div","s","Click for the full card"+(n.type!=="hub"&&n.info&&n.info.url?" and its link":"")));
  c.style.display="block";
  if(!keepPos){
    const r=cv.getBoundingClientRect();mx+=r.left;my+=r.top;
    const x=Math.min(mx+14,window.innerWidth-280),y=Math.min(my+14,window.innerHeight-110);
    c.style.left=Math.max(8,x)+"px";c.style.top=Math.max(8,y)+"px";
  }
}
function hideCard(){$("card").style.display="none"}

/* ---------- legend ---------- */
function buildLegend(){
  const L=$("legend");L.textContent="";
  L.appendChild(el("h3",null,"Rooms"));
  rooms.forEach(function(r){
    const d=el("div"),i=el("i");i.style.background=C(r.color);if(!PAL.light)i.style.boxShadow="0 0 6px "+r.color;
    d.appendChild(i);d.appendChild(el("span",null,r.label+" · "+r.count));L.appendChild(d);
  });
  L.appendChild(el("h3",null,"Shapes"));
  [["","#ff7a1a","Centre rules file"],["dia","#ff9a3c","Skill (links to the skill map)"],["","#b57bff","Dot: a note, part, setup or post"],["","#5a6270","Course lesson: grey until you finish it"],["hex","#2ee6c5","Public project (click for its link)"],["hex","#ffd93d","Page of this site (click to read it)"]].forEach(function(s){
    const d=el("div"),i=el("i",s[0]);i.style.background=C(s[1]);i.style.borderColor=C(s[1]);d.appendChild(i);d.appendChild(el("span",null,s[2]));L.appendChild(d);
  });
}

/* ---------- drawing ---------- */
function sprite(color){
  if(sprites[color])return sprites[color];
  const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");
  const gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,"#fff");gr.addColorStop(.18,color);gr.addColorStop(.45,color+"55");gr.addColorStop(1,color+"00");
  g.fillStyle=gr;g.fillRect(0,0,64,64);return sprites[color]=c;
}
function shade(hex,f,fi){ // folders view: vary lightness per folder
  const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,m=(PAL.light?[1,.82,.68,.9,.76]:[.75,1,1.2,.9,1.35])[fi%5]; // on paper the shades only go darker
  function c(v){return Math.max(0,Math.min(255,Math.round(v*m)))}
  return"#"+((1<<24)+(c(r)<<16)+(c(g)<<8)+c(b)).toString(16).slice(1);
}
function dotColor(n){return S.view==="folders"?shade(C(n.color),0,n.folder):C(n.color)}

let last=0;
function frame(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  const moving=step(dt);
  if(!S.dim3&&(dirty||moving||S.motion)){draw(t);dirty=false}
  requestAnimationFrame(frame);
}

/* ---------- the 3D view: the same public nodes, drawn by 3d-force-graph (pinned, loaded only when 3D is opened) ---------- */
const G3D_SRC="https://cdn.jsdelivr.net/npm/3d-force-graph@1.79.0/dist/3d-force-graph.min.js";let g3=null,g3Loading=false;
const KINDWORD={root:"rules file",hub:"room",dot:"note, part or post",skill:"skill",routine:"routine",app:"page or project"};
function g3Data(){
  const ns=nodes.map(function(n){return{id:n.i,name:n.label||"",kind:KINDWORD[n.type]||n.type,color:n.color,val:n.type==="root"?30:n.type==="hub"?12:n.type==="dot"?1:6}});
  const ls=[];
  nodes.forEach(function(n){
    if(n.type==="hub")ls.push({source:root.i,target:n.i});
    else if(n.type==="dot"&&n.hub)ls.push({source:n.hub.i,target:n.i});
    else if(n.type==="skill"||n.type==="app"||n.type==="routine")ls.push({source:root.i,target:n.i});
  });
  return{nodes:ns,links:ls};
}
function g3Size(){const s=$("stage");return[s.clientWidth||W,s.clientHeight||H]}
function g3Fail(){
  setDim(false,true);say("The 3D view did not load. The flat map stays.");
}
function g3Build(){
  const box=$("g3d"),sz=g3Size();
  g3=window.ForceGraph3D()(box).width(sz[0]).height(sz[1]).backgroundColor(PAL.bg).showNavInfo(false)
    .graphData(g3Data()).nodeLabel(function(n){return n.kind+" · "+n.name}).nodeColor("color").nodeVal("val").nodeRelSize(4).nodeOpacity(.9)
    .linkColor(function(){return "rgba(120,130,150,.35)"}).linkWidth(.4)
    .onNodeClick(function(n){const m=nodes[n.id];if(m)openNode(m)});
  if(!S.motion)g3.cooldownTime(0);
}
function setDim(on,quiet){
  if(on===!!S.dim3)return;
  if(on&&!g3){
    if(g3Loading)return;
    const go=function(){g3Loading=false;if(window.ForceGraph3D){try{g3Build();showDim(true,quiet)}catch{g3Fail()}}else g3Fail()};
    if(window.ForceGraph3D){go();return}
    g3Loading=true;const s=document.createElement("script");s.src=G3D_SRC;s.onload=go;s.onerror=function(){g3Loading=false;g3Fail()};
    document.head.appendChild(s);say("Loading the 3D view");return;
  }
  showDim(on,quiet);
}
function showDim(on,quiet){
  S.dim3=on;$("g3d").hidden=!on;cv.hidden=on;
  const b=$("dimBtn");b.textContent=on?"2D":"3D";b.setAttribute("aria-pressed",String(on));
  b.title=on?"Back to the flat map":"Switch between the flat map and a 3D view";
  if(g3){if(on){const sz=g3Size();g3.width(sz[0]).height(sz[1]);g3.resumeAnimation()}else g3.pauseAnimation()}
  if(!on){resize();dirty=true}
  if(!quiet)say(on?"3D view":"Flat map");
}

function step(dt){
  let moving=false;const motion=S.motion;
  if(motion&&S.layout!=="force"&&S.layout!=="hex")S.angle+=S.spin*dt*2;
  const rot=S.layout==="force"||S.layout==="hex"?0:S.angle;computeLayout(S.layout);
  const ga=S.layout==="rings"?1:0;guideA+=(ga-guideA)*(motion?Math.min(1,dt*4):1);
  if(Math.abs(ga-guideA)>.01)moving=true;
  if(motion){
    const vk=1-Math.exp(-dt*5);
    if(Math.abs(view.tk-view.k)>1e-3||Math.abs(view.tx-view.x)>.3||Math.abs(view.ty-view.y)>.3){
      if(!view.user){view.k+=(view.tk-view.k)*vk;view.x+=(view.tx-view.x)*vk;view.y+=(view.ty-view.y)*vk;moving=true}
    }
  }else if(!view.user){view.k=view.tk;view.x=view.tx;view.y=view.ty}
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    const f=FACTOR[n.type]||0,a=rot*f,ca=Math.cos(a),sa=Math.sin(a);
    let bx=n.bx||0,by=n.by||0;
    if(n.type==="dot"&&rooms[n.room].collapsed){bx=n.hub.bx;by=n.hub.by}
    const tx=bx*ca-by*sa,ty=bx*sa+by*ca;
    n.tx=tx;n.ty=ty;
    n.tv=n.type==="dot"&&rooms[n.room].collapsed?0:1;
    if(motion){
      const k=1-Math.exp(-dt*n.rate);
      const dx=tx-n.x,dy=ty-n.y;
      n.x+=dx*k;n.y+=dy*k;n.vis+=(n.tv-n.vis)*k;
      if(dx*dx+dy*dy>.01||Math.abs(n.tv-n.vis)>.01)moving=true;
    }else{n.x=tx;n.y=ty;n.vis=n.tv}
  }
  return moving;
}

function draw(t){
  const k=view.k,tm=t/1000;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
  ctx.fillStyle=PAL.bg;ctx.fillRect(0,0,W,H);
  if(!PAL.light){
    const g=ctx.createRadialGradient(view.x,view.y,0,view.x,view.y,Math.max(W,H)*.7*Math.max(.5,k*1.2));
    g.addColorStop(0,"rgba(60,30,90,.28)");g.addColorStop(.5,"rgba(20,14,40,.12)");g.addColorStop(1,"rgba(5,6,10,0)");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  ctx.setTransform(DPR*k,0,0,DPR*k,DPR*view.x,DPR*view.y);
  const dimA=flagMode?(PAL.light?.3:.1):1;

  // guides (rings layout)
  const L=computeLayout(S.layout);
  if(guideA>.02){
    ctx.lineWidth=1.2/k;
    L.guides.forEach(function(gd){
      ctx.globalAlpha=guideA*(flagMode?.35:.7);ctx.strokeStyle=C(gd.c);
      ctx.beginPath();ctx.arc(0,0,gd.r,0,TAU);ctx.stroke();
    });
  }

  // links
  ctx.lineCap="round";
  const baseA=(flagMode?.05:.2)*(PAL.light?2:1); // thin lines need more weight on paper than on a dark ground
  ctx.lineWidth=1/k;
  hubs.forEach(function(h){
    ctx.globalAlpha=baseA*h.vis;ctx.strokeStyle=C(h.color);
    ctx.beginPath();ctx.moveTo(root.x,root.y);ctx.lineTo(h.x,h.y);ctx.stroke();
  });
  ctx.strokeStyle=C("#ff7a1a");ctx.globalAlpha=baseA*.5;ctx.beginPath();
  skills.forEach(function(s){ctx.moveTo(root.x,root.y);ctx.lineTo(s.x,s.y)});ctx.stroke();
  if(S.layout==="force"&&!flagMode){
    ctx.globalAlpha=.05+.1*S.spring;
    rooms.forEach(function(R){
      if(R.collapsed)return;ctx.strokeStyle=C(R.color);ctx.beginPath();
      for(let i=0;i<R.dots.length;i++){const d=R.dots[i];ctx.moveTo(R.hub.x,R.hub.y);ctx.lineTo(d.x,d.y)}
      ctx.stroke();
    });
  }
  // focus links
  if(focusLinks.length){
    ctx.lineWidth=1.2/k;
    focusLinks.forEach(function(p){
      ctx.globalAlpha=(p[1].type==="dot"||p[0].type==="dot"?.35:.7)*(.4+.6*S.spring)*Math.min(p[0].vis,p[1].vis);
      ctx.strokeStyle=C(p[0].type==="dot"?p[0].color:(p[1].type==="dot"?p[1].color:p[0].color));
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.stroke();
    });
  }

  // dots: additive glow sprites on the dark map, flat discs on Calm paper
  ctx.globalCompositeOperation=PAL.light?"source-over":"lighter";
  const drift=S.motion&&S.layout==="force"?1:0;
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];if(n.type!=="dot"||n.vis<.02)continue;
    let a=(flagMode?(flags[i]?1:dimA):1)*n.vis*.9;
    let x=n.x,y=n.y;
    if(drift){x+=Math.cos(tm*.6+n.jit)*2.2;y+=Math.sin(tm*.5+n.jit*1.3)*2.2}
    let sz=n.r*(flagMode&&flags[i]?3.4:3),col=dotColor(n);
    if(n.info.lesson){if(lit[n.info.lesson])sz*=1.4;else{col=C("#5a6270");a*=.6}}
    ctx.globalAlpha=a;
    if(PAL.light){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,sz/3,0,TAU);ctx.fill()}
    else ctx.drawImage(sprite(col),x-sz,y-sz,sz*2,sz*2);
  }
  ctx.globalCompositeOperation="source-over";

  // hubs
  hubs.forEach(function(h){
    const a=flagMode?(flags[h.i]?1:dimA+.1):1,R=rooms[h.room],hr=h.r*(R.collapsed?1.5:1);
    if(!PAL.light){
      ctx.globalCompositeOperation="lighter";ctx.globalAlpha=a*.9;
      ctx.drawImage(sprite(h.color),h.x-hr*3.2,h.y-hr*3.2,hr*6.4,hr*6.4);
      ctx.globalCompositeOperation="source-over";
    }
    ctx.globalAlpha=a;ctx.fillStyle=PAL.light?PAL.fill:"#05060a";ctx.strokeStyle=C(h.color);ctx.lineWidth=1.6/k;
    ctx.beginPath();ctx.arc(h.x,h.y,hr*.55,0,TAU);ctx.fill();ctx.stroke();
  });

  // skills (diamonds)
  skills.forEach(function(s){
    const a=flagMode?(flags[s.i]?1:dimA+.1):1;ctx.globalAlpha=a;
    ctx.fillStyle=PAL.tint;ctx.strokeStyle=C(s.color);ctx.lineWidth=1.4/k;
    ctx.beginPath();ctx.moveTo(s.x,s.y-s.r*1.3);ctx.lineTo(s.x+s.r,s.y);ctx.lineTo(s.x,s.y+s.r*1.3);ctx.lineTo(s.x-s.r,s.y);ctx.closePath();ctx.fill();ctx.stroke();
  });
  // routines (circles)
  routines.forEach(function(r){
    const a=flagMode?(flags[r.i]?1:dimA+.1):1;ctx.globalAlpha=a;
    ctx.lineWidth=1.6/k;ctx.strokeStyle=C(r.color);
    if(r.on){
      if(!PAL.light){ctx.globalCompositeOperation="lighter";ctx.globalAlpha=a*.7;ctx.drawImage(sprite("#ffb347"),r.x-r.r*2.2,r.y-r.r*2.2,r.r*4.4,r.r*4.4)}
      ctx.globalCompositeOperation="source-over";ctx.globalAlpha=a;ctx.setLineDash([]);
    }else ctx.setLineDash([2/k*2,2/k*2]);
    ctx.fillStyle=PAL.fill;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.fill();ctx.stroke();ctx.setLineDash([]);
  });
  // apps (hexagons)
  apps.forEach(function(p){
    const a=flagMode?(flags[p.i]?1:dimA+.1):1;ctx.globalAlpha=a;
    ctx.fillStyle=PAL.light?PAL.fill:"#0a1220";ctx.strokeStyle=C(p.color);ctx.lineWidth=1.5/k;
    ctx.beginPath();
    for(let v=0;v<6;v++){const an=Math.PI/6+v*Math.PI/3,px=p.x+p.r*Math.cos(an),py=p.y+p.r*Math.sin(an);v?ctx.lineTo(px,py):ctx.moveTo(px,py)}
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=T(p.color);ctx.font="bold "+(p.r*.95)+"px ui-monospace,monospace";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText((p.label[0]||"?").toUpperCase(),p.x,p.y+.5);
  });
  // the page the reader is on: one ring round its node
  if(S.sel&&S.here){ctx.globalAlpha=1;ctx.strokeStyle=C(S.sel.color);ctx.lineWidth=2/k;ctx.beginPath();ctx.arc(S.sel.x,S.sel.y,Math.max(S.sel.r*1.9,7/k),0,TAU);ctx.stroke()}
  // root
  (function(){
    const a=flagMode&&!flags[root.i]?.25:1; // dimmed like any node that is not lit
    if(!PAL.light){
      ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.9*a;
      ctx.drawImage(sprite("#ff7a1a"),root.x-root.r*3,root.y-root.r*3,root.r*6,root.r*6);
    }
    ctx.globalCompositeOperation="source-over";ctx.globalAlpha=a;
    ctx.fillStyle=PAL.light?PAL.tint:"#150b04";ctx.strokeStyle=C("#ff7a1a");ctx.lineWidth=2/k;
    ctx.beginPath();ctx.arc(root.x,root.y,root.r*.7,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle=C("#ff7a1a");ctx.fillRect(root.x-3,root.y-3,6,6);
  })();

  // text in screen space
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.textAlign="center";ctx.textBaseline="alphabetic";
  // a label keeps inside the stage, and a soft one (a ring name) gives way to any label already drawn
  const placed=[];
  function label(txt,wx,wy,color,size,dy,al,soft){
    let x=view.x+wx*k,y=view.y+wy*k+dy;if(x<-80||x>W+80||y<-20||y>H+20)return;
    ctx.font=size+"px ui-monospace,monospace";
    const w=ctx.measureText(txt).width;
    x=Math.max(w/2+6,Math.min(W-w/2-6,x));
    if(soft){ // it steps up or down a line to find a free place, and is left out when there is none
      const hit=function(yy){for(let p=0;p<placed.length;p++){const o=placed[p];if(x-w/2<o[2]&&x+w/2>o[0]&&yy-size<o[3]&&yy>o[1])return true}return false};
      if(hit(y)){const alt=[y+size+4,y-size-4,y+2*(size+4),y-2*(size+4)];let q=0;while(q<alt.length&&hit(alt[q]))q++;if(q===alt.length)return;y=alt[q]}
    }
    placed.push([x-w/2-4,y-size-2,x+w/2+4,y+2]);
    ctx.globalAlpha=PAL.light?1:al; // Calm text is always full strength, so it keeps its contrast; only the shapes dim
    ctx.fillStyle=color;ctx.fillText(txt,x,y);
  }
  label(root.label,root.x,root.y,PAL.ink,11,root.r*k+16,flagMode&&!flags[root.i]?.25:1);
  hubs.forEach(function(h){
    const R=rooms[h.room];
    // the name and how many it holds; a long name loses its bracket on the map (the tree and the card keep it whole)
    label(R.label.split(" (")[0].toUpperCase()+"  "+R.count,h.x,h.y,T(h.color),10,-h.r*k-8,flagMode?(flags[h.i]?1:.3):.95,true);
  });
  // on a narrow stage the ring names show only while a node is hovered or picked
  if(guideA>.05&&(W>=520||S.hover||S.sel))L.guides.forEach(function(gd){label(gd.label,0,gd.ly,T(gd.lc),12,0,guideA*(flagMode?.4:.9),true)});
  if(S.hover&&S.hover.type!=="dot"&&S.hover.type!=="hub"&&S.hover.type!=="root")label(S.hover.label,S.hover.x,S.hover.y,PAL.ink,11,-S.hover.r*k-8,1);
  else if(S.sel&&S.sel!==S.hover&&S.sel.type!=="dot"&&S.sel.type!=="hub"&&S.sel.type!=="root")label(S.sel.label+(S.here?" · you are here":""),S.sel.x,S.sel.y,PAL.ink,11,-S.sel.r*k-8,1);
  if(S.names||(S.q&&matchCount>0&&matchCount<=40)){
    let cnt=0;
    for(let i2=0;i2<nodes.length&&cnt<260;i2++){
      const d=nodes[i2];if(d.type!=="dot"||!d.name||d.vis<.5)continue;
      if(S.q&&!flags[i2])continue;
      if(k<.45&&!S.q)continue;
      label(d.name,d.x,d.y,PAL.mute,9,-6,flagMode&&!flags[i2]?.2:.8);cnt++;
    }
  }
  if(S.view==="folders"){
    rooms.forEach(function(R){
      if(R.collapsed||k<.5)return;
      let idx=0;R.folders.forEach(function(f,fi){
        let sx=0,sy=0,c=0;
        for(let j=idx;j<idx+f.count;j++){sx+=R.dots[j].x;sy+=R.dots[j].y;c++}
        idx+=f.count;if(c)label(f.name,sx/c,sy/c,PAL.light?T(R.color):shade(R.color,0,fi),9,3,.9,true);
      });
    });
  }
  ctx.globalAlpha=1;
}

boot();
return API;
};
