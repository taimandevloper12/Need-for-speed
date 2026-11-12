/* Peds.js — shahar piyodalari (man.glb / girl.glb), zebradan o'tish, mashina bilan urilish va qon.
 * - Odamlar trotuar bo'ylab yuradi; bir qismi zebra (ZEBRAS, map.js) oldida turib, mashina yaqinlashganda yo'lni kesib o'tadi.
 * - Katta tezlikda urilsa (>= hardSpeed, m/s): odam bukilgan (ragdoll) holatda havoga uchadi, aylanadi, yerga tushib yotib qoladi.
 * - Sekin urilsa: odam kapot/old oynaga yiqiladi, birozdan keyin sirpanib tushadi.
 * - Urilganda oynaga (ekranga) qon sachraydi, keyin asta so'nadi (Blood).
 * - Kamera ko'rmagan va uzoqdagi odamlar chizilmaydi (seeDist + frustum). Soni: PEDS.count (yozilmasa kompyuter 10, mobil 6).
 * Sozlamalar: models.js dagi PEDS (ixtiyoriy). Bog'liqliklar: T, CITY, P, HW, GAR_S, ZEBRAS, STEP, at (map.js), Folks (People.js),
 * game.js: px, pz, h, vx, vz, ci, fr, camMode, thudSnd, bodyLandSnd. */

// ---- Oynadagi qon sachrashi: ekran ustidagi yarim shaffof canvas, sekin so'nadi ----
const Blood=(function(){
"use strict";
// Yengil: dog'lar oldindan tayyorlangan 4 ta sprite dan chiziladi (gradient yo'q), canvas past o'lchamda (0.4x),
// so'nish JS bilan har kadrda emas, CSS transition (GPU) bilan bajariladi.
let cv=null,cx=null,hold=0,fade=0;const SP=[];
function fit(){if(!cv)return;cv.width=Math.max(2,innerWidth*.4|0);cv.height=Math.max(2,innerHeight*.4|0);cx=cv.getContext("2d")}
function init(){
  cv=document.createElement("canvas");cv.style.cssText="position:fixed;left:0;top:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:0;display:none;will-change:opacity";
  document.body.appendChild(cv);fit();addEventListener("resize",fit);
  for(let k=0;k<4;k++){const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d"),g=x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,"rgba(150,8,12,.95)");g.addColorStop(.7,"rgba(105,4,8,.85)");g.addColorStop(1,"rgba(80,2,6,0)");
    x.fillStyle=g;x.beginPath();x.ellipse(32,32,31,20+k*3,k*.8,0,6.283);x.fill();SP.push(c)}}
function drop(x,y,r,len){
  cx.drawImage(SP[(Math.random()*4)|0],x-r,y-r,r*2,r*2);
  if(len>0){cx.strokeStyle="rgba(110,5,9,.75)";cx.lineWidth=Math.max(1,r*.4);cx.lineCap="round";cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+(Math.random()-.5)*r,y+len);cx.stroke()}}
function splat(p){
  if(!cv)init();if(!cx)return;
  const W=cv.width,H=cv.height,m=Math.min(W,H),n=5+(p*10|0),bx=W*(.3+Math.random()*.4),by=H*(.18+Math.random()*.3);
  drop(bx,by,m*(.06+.12*p),H*.05*p);   // asosiy zarba dog'i
  for(let i=0;i<n;i++){
    const ang=Math.random()*6.283,d=Math.pow(Math.random(),.7)*m*(.15+.35*p);
    drop(bx+Math.cos(ang)*d*1.7,by+Math.sin(ang)*d*.9,3+Math.random()*(5+14*p),Math.random()<.4?H*(.03+Math.random()*.1)*p:0)}
  cv.style.display="block";cv.style.transition="none";cv.style.opacity=typeof camMode!=="undefined"&&camMode===2?1:.8;
  hold=3+3*p;fade=0}
function update(dt){
  if(!cv)return;
  if(hold>0){hold-=dt;if(hold<=0){cv.style.transition="opacity 6s linear";cv.style.opacity=0;fade=6.2}}
  else if(fade>0){fade-=dt;if(fade<=0){fade=0;cx.clearRect(0,0,cv.width,cv.height);cv.style.display="none"}}}
function clear(){hold=0;fade=0;if(cv&&cx){cx.clearRect(0,0,cv.width,cv.height);cv.style.transition="none";cv.style.opacity=0;cv.style.display="none"}}
init();   // oldindan tayyorlanadi: birinchi urilishda hech narsa yaratilmaydi
return{splat,update,clear}
})();

const Peds=(function(){
"use strict";
const C=Object.assign({
  count:MOBILE?6:10,    // bir vaqtda nechta odam
  hardSpeed:13,         // m/s: shundan tez urilsa uchib ketadi, sekin bo'lsa oynaga yiqiladi (13 m/s ~ 47 km/h)
  aheadMin:60,aheadMax:220,behind:30,   // mashina oldida/ortida odamlar qo'yiladigan masofa (m)
  seeDist:130,          // shundan uzoqdagi odamlar chizilmaydi (m)
  crossChance:.6,       // odam zebrada turib yo'l kesib o'tishi ehtimoli
  crossTrig:110,        // mashina shu masofaga (m) yaqinlashganda zebradagi odam yo'lga chiqadi
  speed:[1.1,1.7],      // yurish tezligi (m/s)
  offset:[.4,1.5],      // bordyurdan trotuar bo'ylab masofa (m); trotuar eni 3.2 m
  radius:.3,            // odam "qalinligi" (m)
  hoodY:1.15,hoodZ:.6,hoodTilt:65,hoodHold:1.6   // oynaga yiqilgan odam: tana markazi balandligi, oldinga masofa, qiyalik (gradus), ushlab turish vaqti (s)
},typeof PEDS!=="undefined"?PEDS:{});
const list=[],UP=new T.Vector3(0,1,0),AX=new T.Vector3(1,0,0),_a=new T.Quaternion(),_b=new T.Quaternion(),_s=new T.Sphere(new T.Vector3(),1.4);
let needInit=true;
const rr=(a,b)=>a+Math.random()*(b-a),ease=k=>k*k*(3-2*k),HALF=.87,SIDEY=.14,ROADY=.04;

function mk(i){
  const m=Folks.make(i%2?"girl":"man");if(!m)return null;
  const pv=new T.Group(),sc=rr(.95,1.05);m.group.position.y=-HALF;pv.add(m.group);pv.scale.setScalar(sc);pv.visible=false;CITY.add(pv);   // pv — tana markazi (aylanish shu nuqta atrofida)
  return{kind:i%2?"girl":"man",m,pv,half:HALF*sc,st:0,s:0,side:1,off:1,dir:1,spd:1.3,yaw:0,vx:0,vy:0,vz:0,w:new T.Vector3(),qs:new T.Quaternion(),ql:new T.Quaternion(),ps:new T.Vector3(),t:0,bn:0,l:0,
    ft:0,hit:0,cr:0,cs:0,lat:0,tlat:0}}
// st: 0 yuryapti/turibdi | 1 havoda | 2 oynada | 3 yerga yotyapti | 4 yotibdi
// cr: 0 trotuarda yuradi | 1 zebra oldida kutyapti | 2 yo'lni kesib o'tyapti
function walkPose(p){const a=at(p.s,p.side*(HW+p.off));p.pv.position.set(a.x,SIDEY+p.half,a.z);p.yaw=a.h+(p.dir>0?0:Math.PI);p.pv.quaternion.setFromAxisAngle(UP,p.yaw)}
function crossPose(p){const a=at(p.cs,p.lat),y=Math.abs(p.lat)<HW?ROADY:SIDEY;
  p.pv.position.set(a.x,y+p.half,a.z);p.yaw=a.h+(p.tlat>p.lat?Math.PI/2:-Math.PI/2);p.pv.quaternion.setFromAxisAngle(UP,p.yaw)}
// mashinadan oldingi (aheadMin..aheadMax+60) zebra: har birida ko'pi bilan 2 kishi
function pickZebra(sR,sMax,self){
  if(typeof ZEBRAS==="undefined")return null;
  for(const z of ZEBRAS){const c=z+STEP/2;if(c<sR+C.aheadMin)continue;if(c>sR+C.aheadMax+60||c>sMax)return null;
    let n=0;for(const q of list)if(q!==self&&q.cr&&Math.abs(q.cs-c)<4)n++;if(n<2)return c}
  return null}
function place(p,s,sR){
  const sMax=P[P.length-1].s-30;p.st=0;p.bn=0;p.t=0;p.ft=0;p.cr=0;
  if(p.hit){p.hit=0;p.m.pose0()}   // ragdoll holatidan tik poza
  const c=Math.random()<C.crossChance?pickZebra(sR,sMax,p):null;
  if(c!==null){   // zebra oldida bordyurda turadi, mashina yaqinlashganda o'tadi
    const sd=Math.random()<.5?-1:1;p.cr=1;p.cs=c+rr(-.7,.7);p.s=p.cs;p.spd=rr(1.25,1.7);
    p.lat=sd*(HW+rr(C.offset[0],C.offset[1]));p.tlat=-sd*(HW+rr(C.offset[0],C.offset[1]));
    p.m.walk(false);crossPose(p);return}
  p.s=Math.min(Math.max(s,25),sMax);
  p.side=Math.random()<.5?-1:1;if(p.side<0&&Math.abs(p.s-GAR_S)<38)p.side=1;   // garaj oldida emas
  p.off=rr(C.offset[0],C.offset[1]);p.dir=Math.random()<.5?-1:1;p.spd=rr(C.speed[0],C.speed[1]);
  p.m.walk(true);walkPose(p)}

function release(p){   // oynadan sirpanib tushadi
  const pf=Math.sin(h),pc=Math.cos(h),sd=Math.sign(p.l)||(Math.random()<.5?-1:1);
  p.st=1;p.bn=0;p.vx=vx*.85+pc*sd*2.2;p.vz=vz*.85-pf*sd*2.2;p.vy=1.5;p.w.set(rr(-2,2),rr(-1,1),rr(-2,2))}
function hoodStep(p,dt){
  p.t+=dt;const pf=Math.sin(h),pc=Math.cos(h),k=ease(Math.min(1,p.t/.3)),sp=Math.hypot(vx,vz),
    wx=px+pf*C.hoodZ+pc*p.l,wz=pz+pc*C.hoodZ-pf*p.l,bob=Math.sin(p.t*18)*.015*Math.min(1,sp/8),ps=p.ps;
  p.pv.position.set(ps.x+(wx-ps.x)*k,ps.y+(C.hoodY+bob-ps.y)*k,ps.z+(wz-ps.z)*k);
  _a.setFromAxisAngle(UP,h);_b.setFromAxisAngle(AX,-C.hoodTilt*Math.PI/180);_a.multiply(_b);   // chalqancha yotadi: bosh tomi tomga, yuzi tepaga
  p.pv.quaternion.copy(p.qs).slerp(_a,k);
  if(p.t>C.hoodHold&&(sp<4||p.t>C.hoodHold+1.8))release(p)}
function fly(p,dt){
  const pv=p.pv,pp=pv.position,dr=Math.exp(-.12*dt);
  p.vy-=11*dt;p.vx*=dr;p.vz*=dr;pp.x+=p.vx*dt;pp.y+=p.vy*dt;pp.z+=p.vz*dt;
  const wl=p.w.length();if(wl>1e-4){const _v=_s.center;_v.copy(p.w).multiplyScalar(1/wl);_a.setFromAxisAngle(_v,wl*dt);pv.quaternion.premultiply(_a)}
  if(pp.y<.3&&p.vy<0){
    pp.y=.3;p.bn++;
    if(p.bn===1&&typeof bodyLandSnd==="function")bodyLandSnd(Math.min(1,-p.vy/10));
    if(p.bn>=3||-p.vy<2.2){   // to'xtaydi: yotgan holatga o'tadi
      p.st=3;p.t=0;p.qs.copy(pv.quaternion);
      const yaw=Math.hypot(p.vx,p.vz)>.3?Math.atan2(p.vx,p.vz):p.yaw;
      _a.setFromAxisAngle(UP,yaw+rr(-.4,.4));_b.setFromAxisAngle(AX,(Math.random()<.5?-1:1)*Math.PI/2);p.ql.copy(_a).multiply(_b)}
    else{p.vy=-p.vy*.32;p.vx*=.6;p.vz*=.6;p.w.multiplyScalar(.6)}}}
function settle(p,dt){
  p.t+=dt;const pp=p.pv.position,f=Math.exp(-3.5*dt);
  p.pv.quaternion.copy(p.qs).slerp(p.ql,ease(Math.min(1,p.t/.4)));
  pp.y+=(.24-pp.y)*Math.min(1,dt*14);p.vx*=f;p.vz*=f;pp.x+=p.vx*dt;pp.z+=p.vz*dt;
  if(p.t>.6&&Math.hypot(p.vx,p.vz)<.15)p.st=4}

function knock(p,nx,nz,imp,sp){
  p.m.walk(false);p.hit=1;p.ft=0;p.cr=0;const pp=p.pv.position,snd=typeof thudSnd==="function"?thudSnd:()=>{};
  if(typeof screamSnd==="function")screamSnd(p.kind,Math.min(1,imp/25));   // girl.glb -> qiz, man.glb -> erkak qichqirig'i
  if(imp>=C.hardSpeed){   // QATTIQ URILISH: bukilgan, burilgan holatda uchib ketadi
    const dx=vx/sp,dz=vz/sp,lat=2+imp*.12,dir=Math.random()<.6?-1:1,mg=rr(3,5.5)+imp*.08;
    p.st=1;p.bn=0;p.vx=vx*.7+nx*lat+rr(-1,1);p.vz=vz*.7+nz*lat+rr(-1,1);p.vy=Math.min(11,4.5+imp*.12);
    p.w.set(dz*dir*mg+rr(-2.5,2.5),rr(-2.5,2.5),-dx*dir*mg+rr(-2.5,2.5));
    p.m.ragdoll(1.5);   // qo'l-oyoq, tana, bosh har xil tomonga buklanadi (simmetrik emas)
    vx*=.97;vz*=.97;snd(Math.min(1,imp/30));Blood.splat(Math.min(1,imp/28))}
  else{   // SEKIN URILISH: oynaga yiqiladi
    const pf=Math.sin(h),pc=Math.cos(h);
    p.l=Math.max(-.6,Math.min(.6,(pp.x-px)*pc-(pp.z-pz)*pf));
    p.st=2;p.t=0;p.ps.copy(pp);p.qs.copy(p.pv.quaternion);p.m.ragdoll(.7);
    vx*=.9;vz*=.9;snd(Math.min(1,imp/20));if(imp>6)Blood.splat(Math.min(.35,imp/40))}}

// har fizika qadamida (game.js: physics) — faqat poyga paytida
function hit(){
  const sp=Math.hypot(vx,vz);if(sp<2.5||!list.length)return;
  const pf=Math.sin(h),pc=Math.cos(h),R=C.radius+.95,O=1.25;   // mashina 3 ta aylana (old, o'rta, orqa) — carHit bilan bir xil
  for(const p of list){
    if(p.st!==0||!p.pv.visible)continue;const pp=p.pv.position;if(Math.abs(pp.x-px)>4||Math.abs(pp.z-pz)>4)continue;
    let bd=1e9,bx=0,bz=0;
    for(const i of[-1,0,1]){const dx=pp.x-(px+pf*O*i),dz=pp.z-(pz+pc*O*i),d=Math.hypot(dx,dz);if(d<bd){bd=d;bx=dx;bz=dz}}
    if(bd>=R)continue;
    const d=Math.max(bd,.01),nx=bx/d,nz=bz/d,imp=Math.max(vx*nx+vz*nz,sp*.45);
    if(imp<2)continue;knock(p,nx,nz,imp,sp)}}

// har kadrda (game.js: frame)
function update(dt,now){
  Blood.update(dt);
  if(!Folks.ready||!CITY.visible)return;
  if(!list.length){for(let i=0;i<C.count;i++){const p=mk(i);if(p)list.push(p)}needInit=true}
  const tp=P[ci],sR=tp.s,sMax=P[P.length-1].s-20,hasFr=typeof fr!=="undefined";
  if(needInit){needInit=false;list.forEach((p,i)=>place(p,sR+C.aheadMin+(C.aheadMax-C.aheadMin)*(i+Math.random()*.6)/list.length,sR))}
  for(const p of list){
    const pv=p.pv,pp=pv.position,ds=(pp.x-px)*tp.tx+(pp.z-pz)*tp.tz;
    if(p.st!==2&&(ds<-C.behind||ds>C.aheadMax+100)){place(p,sR+rr(C.aheadMin,C.aheadMax),sR);continue}   // ortda qoldi -> oldinga
    if(p.st===0){
      if(p.cr===1){if(ds<C.crossTrig&&ds>-6){p.cr=2;p.m.walk(true)}crossPose(p)}   // mashina yaqinlashdi — yo'lga chiqadi
      else if(p.cr===2){const sg=p.tlat>p.lat?1:-1;p.lat+=sg*p.spd*dt;
        if((p.tlat-p.lat)*sg<=0){p.lat=p.tlat;p.cr=0;p.side=sg;p.off=Math.max(.3,Math.abs(p.tlat)-HW);p.s=p.cs;p.dir=Math.random()<.5?-1:1;walkPose(p)}   // narigi trotuarga yetdi
        else crossPose(p)}
      else{p.s+=p.dir*p.spd*dt;if(p.s<25){p.s=25;p.dir=1}else if(p.s>sMax){p.s=sMax;p.dir=-1}walkPose(p)}}
    else if(p.st===1)fly(p,dt);else if(p.st===2)hoodStep(p,dt);else if(p.st===3)settle(p,dt);
    // kamera ko'rmagan yoki uzoqdagi odam chizilmaydi
    let vis=ds<C.seeDist&&ds>-C.behind;if(vis&&hasFr){_s.center.copy(pp);vis=fr.intersectsSphere(_s)}
    pv.visible=vis;
    if(p.st>0){p.ft+=dt;if(vis&&p.ft<3)p.m.limp(p.ft,1.4)}   // urilgan odam: bukilgan, so'nuvchi silkinish
    else if(vis)p.m.update(dt,now)}}

return{update,hit,reset(){needInit=true;Blood.clear()},get count(){return list.length}}
})();
