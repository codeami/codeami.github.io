/* AIO chat bar and guided tour. Scripted only: no model calls, no network.
   A page calls AIOTour({steps,chips,onStart,onEnd}).
   step:  {title, text, sel:"#css" | fn()->element | rect:fn()->{x,y,w,h[,round]}, before:fn()}
   (a function sel reaches into a shadow root, where a selector cannot)
   chip:  {q, from:i} runs the tour from step i to the end,
          {q, only:i} shows that one step, {q, href:"page.html"} opens a page. */
(function(){
"use strict";
var CSS=
"#askBar{position:fixed;z-index:3;bottom:calc(var(--ob,0px) + 16px);left:calc(var(--lw,0px) + 132px);right:calc(var(--rw,0px) + 16px);display:flex;align-items:center;gap:8px;"+
"background:rgba(12,14,17,.9);border:1px solid var(--line,#23262b);padding:5px 6px 5px 10px}"+
"#askBar>b{flex:none;font-size:10px;font-weight:400;letter-spacing:.3em;color:var(--accent,#ff7a1a)}"+
"#askBar .chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;min-width:0}"+
"#askBar .chips::-webkit-scrollbar{display:none}"+
"#askBar .chip{flex:none;background:#07080a;color:var(--ink,#e9e6e0);border:1px solid var(--line,#23262b);border-radius:12px;font:inherit;font-size:11px;padding:4px 10px;cursor:pointer;white-space:nowrap;text-decoration:none}"+
"#askBar .chip:hover,#askBar .chip:focus-visible{border-color:var(--accent,#ff7a1a);color:var(--accent,#ff7a1a);outline:none}"+
"#askBar .chip.first{border-color:var(--accent,#ff7a1a)}"+
"@media (max-width:760px){#askBar{left:16px;right:16px}#legendBtn{bottom:64px!important}#legend{bottom:104px!important}}"+
"#tourBlock{position:fixed;inset:0;z-index:20}"+
"#tourHole{position:fixed;z-index:21;pointer-events:none;border:2px solid var(--accent,#ff7a1a);box-shadow:0 0 0 200vmax rgba(2,3,6,.72),0 0 18px rgba(255,122,26,.45)}"+
"#tourHole.anim{transition:left .25s,top .25s,width .25s,height .25s,border-radius .25s}"+
"#tourCap{position:fixed;z-index:22;width:min(320px,calc(100vw - 32px));background:var(--panel,#0c0e11);border:1px solid var(--accent,#ff7a1a);padding:12px;color:var(--ink,#e9e6e0)}"+
"#tourCap .n{font-size:10px;letter-spacing:.3em;color:var(--mute,#7d7a74);text-transform:uppercase}"+
"#tourCap h4{margin:4px 0 6px;font-size:13px;font-weight:600;letter-spacing:.04em}"+
"#tourCap p{margin:0 0 10px}"+
"#tourCap .nav{display:flex;gap:6px;justify-content:flex-end}";

function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function find(sel){return typeof sel==="function"?sel():sel?document.querySelector(sel):null}
var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

window.AIOTour=function(o){
  var st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
  var bar=el("div");bar.id="askBar";bar.setAttribute("role","group");bar.setAttribute("aria-label","Ask about this screen");
  bar.appendChild(el("b",null,"ASK"));
  var row=el("div","chips");bar.appendChild(row);
  o.chips.forEach(function(c,i){
    var b=el(c.href?"a":"button","chip"+(i?"":" first"),c.q);
    if(c.href)b.href=c.href;else{b.type="button";b.addEventListener("click",function(){run(c)})}
    row.appendChild(b);
  });
  document.body.appendChild(bar);

  var block,hole,cap,list=[],at=0,opener=null;
  function run(c){
    opener=document.activeElement;
    list=c.only!=null?[o.steps[c.only]]:o.steps.slice(c.from||0);
    if(!block){
      block=el("div");block.id="tourBlock";
      hole=el("div");hole.id="tourHole";if(!reduce)hole.className="anim";
      cap=el("div");cap.id="tourCap";cap.setAttribute("role","dialog");cap.setAttribute("aria-live","polite");
      document.body.appendChild(block);document.body.appendChild(hole);document.body.appendChild(cap);
      document.addEventListener("keydown",key,true);
      window.addEventListener("resize",place);
    }
    if(o.onStart)o.onStart();
    show(0);
  }
  function key(e){
    if(!block)return;
    if(e.key==="Escape"){e.stopPropagation();end()}
    else if(e.key==="ArrowRight"&&at<list.length-1)show(at+1);
    else if(e.key==="ArrowLeft"&&at>0)show(at-1);
  }
  function show(i){
    at=i;var s=list[i];
    if(s.before)s.before();
    var t=find(s.sel);
    if(t&&t.scrollIntoView)t.scrollIntoView({block:"nearest"});
    cap.textContent="";
    cap.appendChild(el("div","n",list.length>1?"Step "+(i+1)+" of "+list.length:"Answer"));
    cap.appendChild(el("h4",null,s.title));cap.appendChild(el("p",null,s.text));
    var nav=el("div","nav");
    function btn(t,fn){var b=el("button","btn",t);b.type="button";b.addEventListener("click",fn);nav.appendChild(b);return b}
    if(i>0)btn("Back",function(){show(at-1)});
    var main=i<list.length-1?btn("Next",function(){show(at+1)}):btn("Done",end);
    cap.appendChild(nav);
    // let the page settle (drawers, cards, layout) before measuring
    requestAnimationFrame(function(){requestAnimationFrame(function(){place();main.focus()})});
  }
  function place(){
    if(!block)return;
    var s=list[at],r,round=false,vw=window.innerWidth,vh=window.innerHeight,pad=6;
    if(s.rect){r=s.rect();round=!!r.round}
    else{var t=find(s.sel);r=t?t.getBoundingClientRect():null;
      if(r&&!r.width&&!r.height)r=null}
    if(!r)r={x:vw/2,y:vh/2,w:0,h:0};
    else r={x:r.x!=null?r.x:r.left,y:r.y!=null?r.y:r.top,w:r.w!=null?r.w:r.width,h:r.h!=null?r.h:r.height};
    var x=Math.max(2,r.x-pad),y=Math.max(2,r.y-pad),w=Math.min(vw-4,r.x+r.w+pad)-x,h=Math.min(vh-4,r.y+r.h+pad)-y;
    hole.style.left=x+"px";hole.style.top=y+"px";hole.style.width=Math.max(0,w)+"px";hole.style.height=Math.max(0,h)+"px";
    hole.style.borderRadius=round?"50%":"0";hole.style.display=w>0?"block":"none";
    // caption: below the section, else above, else over its lower edge (headings sit at the top)
    var cw=cap.offsetWidth,ch=cap.offsetHeight,cy;
    if(y+h+10+ch<=vh-8)cy=y+h+10;else if(y-10-ch>=8)cy=y-10-ch;
    else cy=vh-ch-8;
    var cx=Math.min(Math.max(8,x+w/2-cw/2),vw-cw-8);
    cap.style.left=cx+"px";cap.style.top=Math.max(8,cy)+"px";
  }
  function end(){
    if(!block)return;
    document.removeEventListener("keydown",key,true);window.removeEventListener("resize",place);
    [block,hole,cap].forEach(function(n){n.remove()});block=hole=cap=null;
    if(o.onEnd)o.onEnd();
    if(opener&&opener.focus)opener.focus();
  }
};
})();
