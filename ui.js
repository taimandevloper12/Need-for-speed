// Interfeys: rul (sudrab buring) va pedallar (gaz / tormoz)
const wheelEl=document.getElementById("wheel");let wA=0,wDrag=0,wLast=0,wheelOn=false,wheelVal=0,wShown=0;
function wAng(e){const r=wheelEl.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))}
wheelEl.addEventListener("pointerdown",e=>{wDrag=1;wLast=wAng(e);wheelEl.setPointerCapture(e.pointerId);e.preventDefault()});
wheelEl.addEventListener("pointermove",e=>{if(!wDrag)return;const a=wAng(e);let d=a-wLast;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;wLast=a;wA=Math.max(-2.4,Math.min(2.4,wA+d))});
["pointerup","pointercancel"].forEach(n=>wheelEl.addEventListener(n,()=>{wDrag=0}));
[["brk","brake"],["gas","gas"]].forEach(([id,k])=>{const e=document.getElementById(id),u=()=>{key[k]=0;e.classList.remove("p")};
  e.addEventListener("pointerdown",ev=>{key[k]=1;e.classList.add("p");e.setPointerCapture(ev.pointerId);ev.preventDefault()});e.addEventListener("pointerup",u);e.addEventListener("pointercancel",u)});
document.addEventListener("contextmenu",e=>e.preventDefault());
function uiTick(dt){if(!wDrag&&wA){wA*=Math.exp(-dt*7);if(Math.abs(wA)<.01)wA=0}
  wheelOn=!!wDrag||wA!==0;wheelVal=Math.max(-1,Math.min(1,-wA/1.2));
  if(wA!==wShown){wShown=wA;wheelEl.style.transform="rotate("+wA+"rad)"}}
document.getElementById("btnMenu").onclick=()=>document.getElementById("menuBox").classList.toggle("open");
