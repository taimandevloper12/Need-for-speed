addEventListener("error",e=>{if(!e.filename&&e.message==="Script error.")return;const d=document.getElementById("rotate");d.style.display="flex";d.textContent="Xato: "+e.message+(e.filename?" ("+e.filename.split("/").pop()+":"+e.lineno+")":"")});
const T=THREE;
const MOBILE=typeof matchMedia==="function"&&matchMedia("(pointer:coarse)").matches;   // bitta global: sensorli qurilma
let s=20260;function rnd(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const pick=a=>a[(rnd()*a.length)|0];
const renderer=new T.WebGLRenderer({antialias:!MOBILE,powerPreference:"high-performance"});
renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=MOBILE?T.PCFShadowMap:T.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const ANISO=renderer.capabilities.getMaxAnisotropy();
const scene=new T.Scene(),camera=new T.PerspectiveCamera(65,1,0.3,1800);
let quality="auto";
// dinamik piksel zichligi: FPS pasaysa pr kamayadi (1 s), barqaror yuqori bo'lsa sekin oshadi
const PR_MAX=Math.min(devicePixelRatio||1,MOBILE?1.75:1.5),PR_MIN=.75;let autoPR=PR_MAX,lowN=0,highN=0,drops=0;
function adaptRes(f){if(quality!=="auto")return;
  if(f<50){highN=0;if(++lowN>=2){lowN=0;if(autoPR>PR_MIN+.001){autoPR=Math.max(PR_MIN,autoPR-.1);drops++;applySize()}}}
  else if(f>58){lowN=0;if(++highN>=8*(1+drops)){highN=0;if(autoPR<PR_MAX-.001){autoPR=Math.min(PR_MAX,autoPR+.1);applySize()}}}
  else lowN=highN=0}
function applySize(){const w=innerWidth,h=innerHeight;let pr=autoPR;
  if(quality==="fhd")pr=1920/w;if(quality==="4k")pr=3840/w;
  renderer.setPixelRatio(pr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const c=renderer.domElement;document.getElementById("res").textContent=c.width+" × "+c.height+" piksel · "+(typeof GLINFO!=="undefined"?GLINFO:"")}
addEventListener("resize",applySize);
document.querySelectorAll("#q button").forEach(b=>b.onclick=()=>{quality=b.dataset.q;
  document.querySelectorAll("#q button").forEach(x=>x.classList.toggle("on",x===b));applySize()});

// osmon, quyosh va muhit akslari -> sky.js

// building materials: different facade types
function mk(o){const mkc=()=>{const c=document.createElement("canvas");c.width=128;c.height=256;return c};
  const c=mkc(),e=mkc(),bm=mkc(),x=c.getContext("2d"),y=e.getContext("2d"),z=bm.getContext("2d"),cw=128/o.c,ch=256/o.r;
  x.fillStyle=o.wall;x.fillRect(0,0,128,256);for(let i=0;i<1400;i++){x.fillStyle="rgba("+(rnd()<.5?"255,255,255":"0,0,0")+","+rnd()*.07+")";x.fillRect(rnd()*128,rnd()*256,1+rnd()*2,1+rnd()*2)}
  if(o.brick){x.fillStyle="rgba(200,180,170,.2)";for(let yy=0;yy<256;yy+=3){x.fillRect(0,yy,128,1);for(let xx=(yy/3%2)*4;xx<128;xx+=8)x.fillRect(xx,yy,1,3)}}
  z.fillStyle="#aaa";z.fillRect(0,0,128,256);y.fillStyle="#000";y.fillRect(0,0,128,256);
  for(let r=0;r<o.r;r++)for(let q=0;q<o.c;q++){const lit=rnd()<o.p,col=lit?pick(o.lit):o.dark,m=o.m;
    const wx=q*cw+m,wy=r*ch+m*1.2,ww=cw-2*m,wh=ch-2.4*m;x.fillStyle="rgba(0,0,0,.45)";x.fillRect(wx-1.5,wy-1.5,ww+3,wh+3);x.fillStyle=col;x.fillRect(wx,wy,ww,wh);const gr=x.createLinearGradient(0,wy,0,wy+wh);gr.addColorStop(0,"rgba(255,255,255,.14)");gr.addColorStop(1,"rgba(0,0,0,.18)");x.fillStyle=gr;x.fillRect(wx,wy,ww,wh);x.fillStyle="rgba(255,255,255,.22)";x.fillRect(wx-2,wy+wh+1.5,ww+4,1.6);z.fillStyle="#333";z.fillRect(wx,wy,ww,wh);
    if(lit){y.fillStyle=col;y.fillRect(q*cw+m,r*ch+m*1.2,cw-2*m,ch-2.4*m)}}
  for(let r=0;r<o.r;r++){x.fillStyle="rgba(0,0,0,.25)";x.fillRect(0,r*ch,128,2);z.fillStyle="#d0d0d0";z.fillRect(0,r*ch,128,2)}
  for(let i=0;i<900;i++){z.fillStyle="rgba("+(rnd()<.5?"255,255,255":"0,0,0")+",.12)";z.fillRect(rnd()*128,rnd()*256,1,1)}
  const dg=x.createLinearGradient(0,0,0,256);dg.addColorStop(0,"rgba(0,0,0,0)");dg.addColorStop(1,"rgba(0,0,0,.28)");x.fillStyle=dg;x.fillRect(0,0,128,256);
  const tx=a=>{const t=new T.CanvasTexture(a);t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.sRGBEncoding;t.anisotropy=ANISO;return t};
  const mat=new T.MeshStandardMaterial({map:tx(c),emissiveMap:tx(e),bumpMap:tx(bm),bumpScale:1.5,emissive:0xffffff,emissiveIntensity:.6,roughness:o.rg,metalness:o.mt});
  mat.userData={tw:o.tw,th:o.th};return mat}
const LIT=["#ffd27a","#ffe6a8","#bfe6ff","#ffb36b"];
const MATS={
 office:[0,1].map(()=>mk({wall:"#1d2230",dark:"#26334a",lit:LIT,p:.4,c:6,r:12,m:3,rg:.45,mt:.5,tw:14,th:26})),
 glass:[0,1].map(()=>mk({wall:"#0e1a2a",dark:"#2c4a6a",lit:["#9fd6ff","#d9f1ff"],p:.3,c:8,r:16,m:1,rg:.1,mt:.9,tw:16,th:32})),
 brick:[0,1].map(()=>mk({brick:true,wall:"#5a3028",dark:"#1b1d26",lit:LIT,p:.5,c:5,r:8,m:6,rg:.9,mt:0,tw:12,th:18})),
 resi:[0,1].map(()=>mk({wall:"#6c6a70",dark:"#262a34",lit:LIT,p:.45,c:6,r:12,m:5,rg:.8,mt:.05,tw:12,th:30})),
 deco:[0,1].map(()=>mk({wall:"#3a3347",dark:"#2a2c3e",lit:LIT,p:.35,c:5,r:14,m:3,rg:.5,mt:.3,tw:10,th:30}))};
const roofM=new T.MeshStandardMaterial({color:0x191b22,roughness:.9});
const NEON=[0xff2e88,0x19e3ff,0xffa63d,0x9b5cff].map(c=>new T.MeshBasicMaterial({color:c}));
const redM=new T.MeshBasicMaterial({color:0xff3030});
function sign(txt,col){const c=document.createElement("canvas");c.width=256;c.height=96;const x=c.getContext("2d");
  x.fillStyle="#0a0a12";x.fillRect(0,0,256,96);x.strokeStyle=col;x.lineWidth=5;x.strokeRect(6,6,244,84);
  x.fillStyle=col;x.shadowColor=col;x.shadowBlur=14;x.font="700 54px Rajdhani,Arial";x.textAlign="center";x.fillText(txt,128,66);
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return new T.MeshBasicMaterial({map:t})}
const SIGNS=[sign("NITRO","#19e3ff"),sign("RACE","#ff2e88"),sign("GARAGE","#ffa63d"),sign("TUNING","#9b5cff")];
const signG=new T.PlaneGeometry(7,2.6),antG=new T.CylinderGeometry(.2,.3,24,6),lampRG=new T.SphereGeometry(.8,8,8);
function fin(g,me){me.castShadow=me.receiveShadow=true;me.matrixAutoUpdate=false;me.updateMatrix();g.add(me);return me}
function tier(g,x,y,z,w,hh,d,m){const geo=new T.BoxGeometry(w,hh,d),uv=geo.attributes.uv,u=m.userData;
  for(let i=0;i<24;i++){const f=(i/4)|0;if(f===2||f===3)continue;uv.setXY(i,uv.getX(i)*(f<2?d:w)/u.tw,uv.getY(i)*hh/u.th)}
  const me=new T.Mesh(geo,[m,m,roofM,roofM,m,m]);me.position.set(x,y+hh/2,z);return fin(g,me)}
function cyl(g,x,z,r,h,m){const geo=new T.CylinderGeometry(r,r,h,24),uv=geo.attributes.uv,u=m.userData;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*6.28*r/u.tw,uv.getY(i)*h/u.th);
  const me=new T.Mesh(geo,[m,roofM,roofM]);me.position.set(x,h/2,z);return fin(g,me)}
function antenna(g,x,z,h){const a=new T.Mesh(antG,roofM);a.position.set(x,h+12,z);fin(g,a);
  const l=new T.Mesh(lampRG,redM);l.position.set(x,h+24,z);l.matrixAutoUpdate=false;l.updateMatrix();g.add(l)}
function lot(g,x,z,w,d,h){
  const k=h>110?pick(["glass","deco","office"]):h>55?pick(["office","glass","resi","deco"]):pick(["brick","resi","brick"]),m=pick(MATS[k]);
  if(k==="glass"&&rnd()<.4){cyl(g,x,z,Math.min(w,d)/2,h,m);antenna(g,x,z,h);return}
  if(k==="office"||k==="deco"||h>90){
    let y=0,ww=w,dd=d;const n=2+(rnd()*2|0);
    for(let i=0;i<n;i++){const hh=i<n-1?h*(.5-i*.1):h-y;tier(g,x,y,z,ww,hh,dd,m);y+=hh;ww*=.78;dd*=.78}
    antenna(g,x,z,h);return}
  tier(g,x,0,z,w,h,d,m);
  const b=new T.Mesh(new T.BoxGeometry(3,2,3),roofM);b.position.set(x+(rnd()-.5)*w*.4,h+1,z+(rnd()-.5)*d*.4);fin(g,b);
  if(rnd()<.4){const n=new T.Mesh(new T.BoxGeometry(w+.4,.5,d+.4),pick(NEON));n.position.set(x,h*(.2+rnd()*.6),z);n.matrixAutoUpdate=false;n.updateMatrix();g.add(n)}
  if(h<40&&rnd()<.6){const p=new T.Mesh(signG,pick(SIGNS)),f=rnd()<.5?1:-1;p.position.set(x,Math.min(h*.6,9),z+f*(d/2+.1));p.rotation.y=f>0?0:Math.PI;p.matrixAutoUpdate=false;p.updateMatrix();g.add(p)}}
