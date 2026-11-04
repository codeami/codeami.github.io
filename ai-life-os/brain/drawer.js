/* AIO right-side drawer: a node's card, or a page's text from the reading order.
   It keeps the map visible to the left and never navigates away: reading pages
   open inside it, other pages open in a new tab.
   var d=AIODrawer({reading:AIO_READING,onClose:fn});
   d.card({title,line,status,statusCls,body:Node|string,links:[{label,href}],related:[{label,go:fn}],read:i})
   d.read(i) opens reading item i; d.doc(link) opens a document in a frame; d.close().
   From the AIO prototype; this public copy has no private hub links. */
(function(){
"use strict";
var CSS=
"#drawer{position:fixed;z-index:6;top:0;right:0;bottom:0;width:min(520px,100vw);display:flex;flex-direction:column;background:var(--panel,#0c0e11);border-left:1px solid var(--accent,#ff7a1a);box-shadow:-12px 0 32px rgba(0,0,0,.5);color:var(--ink,#e9e6e0)}"+
"#drawer[hidden]{display:none}#drawer:focus{outline:none}"+
"#drawer .dh{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid var(--line,#23262b)}"+
"#drawer .dh .pos{flex:1;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--mute,#7d7a74)}"+
"#drawer .db{flex:1;overflow:auto;padding:16px 18px 28px;overscroll-behavior:contain}"+
"#drawer h2.t{margin:0 0 4px;font-size:16px;font-weight:600;letter-spacing:.04em}"+
"#drawer .ln{color:var(--mute,#7d7a74);font-size:11px;margin-bottom:8px}"+
"#drawer .stt{font-size:11px;margin-bottom:10px;color:var(--mute,#7d7a74)}#drawer .stt::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;vertical-align:1px}"+
"#drawer .stt.ok{color:var(--ok,#5ec27a)}#drawer .stt.warn{color:var(--warn,#e0554a)}#drawer .stt.a{color:var(--accent,#ff7a1a)}"+
"#drawer h3.s{margin:16px 0 6px;font-size:10px;font-weight:400;letter-spacing:.3em;text-transform:uppercase;color:var(--mute,#7d7a74)}"+
"#drawer h3.s::before{content:'';display:inline-block;width:6px;height:6px;background:var(--accent,#ff7a1a);margin-right:8px}"+
"#drawer .rel{display:flex;flex-wrap:wrap;gap:6px}"+
"#drawer .rel button,#drawer .lnk a,#drawer .lnk button{background:#07080a;color:var(--ink,#e9e6e0);border:1px solid var(--line,#23262b);font:inherit;font-size:11px;padding:4px 10px;cursor:pointer;text-decoration:none;display:inline-block}"+
"#drawer .rel button{max-width:min(100%,28ch);height:26px;box-sizing:border-box;padding-top:0;padding-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
"#drawer .rel button:hover,#drawer .rel button:focus-visible,#drawer .lnk a:hover,#drawer .lnk a:focus-visible,#drawer .lnk button:hover,#drawer .lnk button:focus-visible{border-color:var(--accent,#ff7a1a);color:var(--accent,#ff7a1a);outline:none}"+
"#drawer .lnk{display:flex;flex-direction:column;align-items:flex-start;gap:6px}"+
"#drawer .none{color:var(--mute,#7d7a74);font-style:italic}"+
"#drawer .lnk .lg{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute,#7d7a74);margin-top:6px}"+
"#drawer .art{margin-top:14px;border-top:1px solid var(--line,#23262b);padding-top:6px;font-size:13px;line-height:1.6}"+
"#drawer .art h1{font-size:15px;letter-spacing:.06em;margin:14px 0 8px}"+
"#drawer .art h2{font-size:11px;font-weight:400;letter-spacing:.3em;text-transform:uppercase;color:var(--accent,#ff7a1a);margin:22px 0 8px}"+
"#drawer .art h3,#drawer .art h4{font-size:13px;margin:16px 0 6px}"+
"#drawer .art p{margin:0 0 10px}#drawer .art ul,#drawer .art ol{margin:0 0 10px;padding-left:18px}#drawer .art li{margin:0 0 4px}"+
"#drawer .art a{color:var(--accent,#ff7a1a)}"+
"#drawer .art blockquote{margin:0 0 10px;padding-left:10px;border-left:2px solid var(--accent,#ff7a1a);color:var(--mute,#7d7a74)}"+
"#drawer .art details{border:1px solid var(--line,#23262b);padding:6px 10px;margin:0 0 8px}#drawer .art summary{cursor:pointer}"+
"#drawer .art table{border-collapse:collapse;display:block;overflow:auto}#drawer .art td,#drawer .art th{border:1px solid var(--line,#23262b);padding:3px 6px}"+
"#drawer .art pre{overflow:auto;background:#07080a;padding:8px}"+
"#drawer .art iframe{width:100%;height:70vh;border:1px solid var(--line,#23262b)}"+
"#drawer .df{display:flex;gap:6px;padding:10px 12px;border-top:1px solid var(--line,#23262b)}#drawer .df[hidden]{display:none}"+
"#drawer .df .btn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:none;letter-spacing:.02em}"+
"#drawer .df .btn[disabled]{opacity:.35;cursor:default}"+
"#drawer .tabs{display:flex;gap:2px;margin:12px 0 6px;border-bottom:1px solid var(--line,#23262b)}"+
"#drawer .tab{background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;color:var(--mute,#7d7a74);font:inherit;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:8px 10px;cursor:pointer}"+
"#drawer .tab[aria-selected=true]{color:var(--ink,#e9e6e0);border-bottom-color:var(--accent,#ff7a1a)}"+
"#drawer .tab:focus-visible{outline:1px solid var(--accent,#ff7a1a)}#drawer .pane[hidden]{display:none}#drawer .pane p{margin:0 0 10px}";

function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function abs(u,base){try{return new URL(u,base||location.href).href}catch(e){return""}}
function bare(u){return u.split("#")[0]}

window.AIODrawer=function(o){
  var R=o.reading||[],st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
  var d=el("aside");d.id="drawer";d.hidden=true;d.setAttribute("aria-label","Details");d.tabIndex=-1;
  var head=el("div","dh"),pos=el("span","pos"),x=el("button","btn","✕");x.type="button";x.setAttribute("aria-label","Close");
  head.appendChild(pos);head.appendChild(x);
  var body=el("div","db"),foot=el("div","df");
  d.appendChild(head);d.appendChild(body);d.appendChild(foot);document.body.appendChild(d);
  x.addEventListener("click",close);
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!d.hidden)close()});
  var token=0;

  function readIndex(href){var h=bare(abs(href));for(var i=0;i<R.length;i++)if(bare(abs(R[i].url))===h)return i;return-1}
  function linkEl(l){
    if(l.none)return el("span","none",l.none);
    if(l.doc){var bd=el("button",null,l.label);bd.type="button";bd.addEventListener("click",function(){doc(l)});return bd}
    var i=l.newTab?-1:readIndex(l.href);
    if(i>=0){var b=el("button",null,"Read: "+l.label);b.type="button";b.addEventListener("click",function(){read(i)});return b}
    var ext=l.newTab||/^https?:/.test(l.href),a=el("a",null,l.label+(ext?" ↗":""));a.href=l.href;
    if(ext){a.target="_blank";a.rel="noopener noreferrer"}
    return a;
  }
  var last=null; // the node card a document was opened from, for Back
  function card(c){
    token++;body.textContent="";foot.textContent="";foot.hidden=true;
    if(c.read==null&&!c.doc)last=c;
    pos.textContent=c.read!=null?"Reading "+(c.read+1)+" of "+R.length:(c.kind||"Details");
    body.appendChild(el("h2","t",c.title));
    if(c.line)body.appendChild(el("div","ln",c.line));
    if(c.status)body.appendChild(el("div","stt "+(c.statusCls||""),c.status));
    // a node card is tabbed (What it is / Links / Related); a reading page keeps one column above its text
    var tabbed=c.read==null&&!c.doc,panes=[];
    function section(name){var p=el("div","pane");if(!tabbed)p.appendChild(el("h3","s",name));panes.push([name,p]);return p}
    if(tabbed){
      var dp=section("What it is");
      if(c.body&&c.body.nodeType)dp.appendChild(c.body);
      else dp.appendChild(c.body?el("p",null,c.body):el("p","none","Details coming."));
    }
    if(c.links&&c.links.length){
      var L=el("div","lnk"),grp=null;section("Links").appendChild(L);
      c.links.forEach(function(l){
        if(l.group&&l.group!==grp){grp=l.group;L.appendChild(el("div","lg",grp))}
        L.appendChild(linkEl(l));
      });
    }
    if(c.related&&c.related.length){
      var rel=el("div","rel");section("Related").appendChild(rel);
      c.related.forEach(function(r){var b=el("button",null,r.label);b.type="button";b.title=r.label;b.addEventListener("click",r.go);rel.appendChild(b)});
    }
    if(tabbed&&panes.length>1){
      var tl=el("div","tabs");tl.setAttribute("role","tablist");body.appendChild(tl);
      var pick=function(i){panes.forEach(function(q,j){q[2].setAttribute("aria-selected",String(i===j));q[1].hidden=i!==j})};
      panes.forEach(function(q,i){var b=el("button","tab",q[0]+(q[0]==="What it is"?"":" ("+q[1].firstChild.children.length+")"));b.type="button";b.setAttribute("role","tab");q[1].setAttribute("role","tabpanel");
        b.addEventListener("click",function(){pick(i)});tl.appendChild(b);q.push(b)});
      pick(0);
    }
    panes.forEach(function(q){body.appendChild(q[1])});
    d.hidden=false;body.scrollTop=0;d.focus({preventScroll:true});
  }
  function read(i,extra){
    var it=R[i];if(!it)return;
    // the full-page link opens a new tab, never this one
    var c={title:it.title,line:it.line,read:i,links:[{label:"Open the full page",href:abs(it.url),newTab:true}]};
    if(extra)for(var k in extra)c[k]=extra[k];
    card(c);
    var art=el("div","art");art.appendChild(el("p","none","Loading…"));body.appendChild(art);
    foot.hidden=false;
    function nav(label,j){var b=el("button","btn",label);b.type="button";if(j<0||j>=R.length)b.disabled=true;else{b.title=R[j].title;b.addEventListener("click",function(){read(j)})}foot.appendChild(b)}
    nav("◀ "+(i>0?R[i-1].title:"Start"),i-1);nav((i<R.length-1?R[i+1].title:"End")+" ▶",i+1);
    var my=++token,url=abs(it.url);
    if(it.frame)return frame(art,url);
    fetch(url).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(html){
      if(my!==token)return;fill(art,html,url,it);
    }).catch(function(){if(my!==token)return;frame(art,url)});
  }
  // keep the article's words and structure; drop its scripts, styles, nav and look
  function fill(art,html,url,it){
    var doc=new DOMParser().parseFromString(html,"text/html");
    var m=doc.querySelector("main")||doc.body;
    m.querySelectorAll("script,style,link,noscript,nav,header,footer,form,button,input,iframe,canvas,.back,.sw,.go").forEach(function(n){n.remove()});
    var pics=m.querySelectorAll("svg,img,video");pics.forEach(function(n){n.remove()});
    if(m.textContent.replace(/\s+/g,"").length<200)return frame(art,url);
    m.querySelectorAll("*").forEach(function(n){
      for(var a=n.attributes.length-1;a>=0;a--){var nm=n.attributes[a].name;
        if(/^on|^style$|^class$/i.test(nm))n.removeAttribute(nm);
        else if(nm==="id")n.id="rd-"+n.id;}
      if(n.hasAttribute("href")){
        var h=n.getAttribute("href");
        if(/^\s*javascript:/i.test(h))n.removeAttribute("href");
        else if(h.charAt(0)==="#")n.setAttribute("href","#rd-"+h.slice(1));
        else{n.setAttribute("href",abs(h,url));n.target="_blank";n.rel="noopener noreferrer"}
      }
    });
    art.textContent="";
    if(pics.length)art.appendChild(el("p","none","This page has "+(pics.length===1?"a picture":pics.length+" pictures")+". Open the full page to see "+(pics.length===1?"it":"them")+"."));
    while(m.firstChild)art.appendChild(document.importNode(m.firstChild,true)),m.removeChild(m.firstChild);
    art.querySelectorAll("span+span").forEach(function(s){s.before(" · ")}); // badges lost their own spacing with their classes
    // a link to another page in the reading order stays in the drawer
    art.querySelectorAll("a[href]").forEach(function(a){
      var j=readIndex(a.href);
      if(j>=0)a.addEventListener("click",function(e){e.preventDefault();read(j)});
      else if(a.getAttribute("href").charAt(0)==="#")a.removeAttribute("target");
    });
  }
  // pages drawn by script (or blocked from fetch) show live in a frame
  function frame(art,url){
    art.textContent="";var f=el("iframe");f.src=url;f.title="Page";f.loading="lazy";art.appendChild(f);
  }
  // a source file from the hub, live in a frame here; Back returns to its node's card
  function doc(l){
    var from=last;
    card({doc:true,kind:"Document",title:l.title||l.label,line:l.line,links:[{label:"Open the full page",href:l.href,newTab:true}]});
    var art=el("div","art");body.appendChild(art);frame(art,l.href);
    if(from){foot.hidden=false;var b=el("button","btn","◀ Back to "+from.title);b.type="button";
      b.addEventListener("click",function(){card(from)});foot.appendChild(b)}
  }
  function close(){if(d.hidden)return;token++;d.hidden=true;if(o.onClose)o.onClose()}
  return{card:card,read:read,doc:doc,close:close,el:d,readIndex:readIndex};
};
})();
