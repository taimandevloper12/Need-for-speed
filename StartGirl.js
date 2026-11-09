/* StartGirl.js — poyga boshidagi "start girl" cinematic introsi.
 *
 * Ketma-ketlik: qiz start chizig'i yoniga paydo bo'ladi -> WALK klipi bilan yurib keladi -> to'xtaydi ->
 * qo'lini ko'taradi -> ushlab turadi -> qo'lini tushiradi -> onStart() (game.js: startRace()).
 *
 * Texnika:
 *  - GLTFLoader + AnimationMixer: modeldagi HAQIQIY walk (va bo'lsa idle) klipi ishlatiladi.
 *  - Suyaklar (yelka / qo'l / tirsak / kaft, oyoq, barmoq uchi) NOMLARI TAXMIN QILINMAYDI: yuklangandan keyin
 *    skeletdan qidiriladi (nom + ierarxiya tekshiruvi). Topilmasa console.warn qiladi va intro oddiy sanoqqa tushadi.
 *  - Qo'l ko'tarish/tushirish: procedural, quaternion slerp bilan. Suyak o'qlariga bog'liq emas: har bir suyak
 *    dunyo fazosida "bolasiga qarab" yo'nalishi bo'yicha kerakli yo'nalishga buriladi (setFromUnitVectors),
 *    so'ng klip pozasi bilan slerp(w) qilib aralashtiriladi.
 *  - Root-motion bo'lsa (Mixamo "with skin" klipi) chiziqli siljish bekor qilinadi, qadam tezligi klipdan o'lchanadi.
 *  - To'xtash paytida klip oyoqlar yaqin turgan fazada muzlatiladi (tezlik silliq kamayadi, sirpanish bo'lmaydi).
 *
 * Bog'liqliklar (global): T, scene, renderer, camera (engine.js), at, LINE (map.js), STARTGIRL (models.js, ixtiyoriy).
 */
const StartGirl=(function(){
"use strict";
const CFG=Object.assign({
  file:"girl.glb",
  height:1.7,        // modelning o'yindagi bo'yi (metr)
  walkClip:"",       // klip nomi (bo'sh bo'lsa nomida "walk" bo'lgani qidiriladi)
  idleClip:"",       // ixtiyoriy; bo'sh bo'lsa nomida idle/stand/breath bo'lgani (bo'lsa) ishlatiladi
  arm:"right",       // "right" yoki "left"
  walkSpeed:0,       // m/s. 0 = klipdan o'lchanadi (root-motion bo'lmasa 1.3)
  spawnOff:6.8, spawnS:4.5, standS:.6,   // paydo bo'lish / to'xtash joyi (chiziqqa nisbatan, yo'l koordinatasida)
  settle:.35, raise:1.1, hold:2.4, drop:.9,  // soniyalar
  hideAfter:30       // o'yinchi chiziqdan shuncha metr o'tgach qiz yashiriladi
},typeof STARTGIRL!=="undefined"?STARTGIRL:{});

const group=new T.Group(),inner=new T.Group();group.add(inner);group.visible=false;
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const _a=V(),_b=V(),_c=V(),_side=V(),_fwd=V(),_dn=V(),_tg=V(),_up=new T.Vector3(0,1,0);
const _q1=Q(),_q2=Q(),_q3=Q();
const ease=x=>x*x*x*(x*(6*x-15)+10),clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),lerp=(a,b,t)=>a+(b-a)*t;
const angLerp=(a,b,t)=>{let d=(b-a)%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;return a+d*t};
const nm=b=>b.name.toLowerCase().replace(/[^a-z]/g,"");   // "mixamorig:RightArm" / "mixamorigRightArm" -> "mixamorigrightarm"
const coarse=MOBILE;

let ready=false,failed=false,played=false,state="idle",stT=0,tAll=0,tTotal=1;
let root=null,mixer=null,walkA=null,idleA=null,walkClip=null,dur=1,bones=[],hips=null,rig=null,oppUpper=null;
let speed=1.3,drift=V(),rest=[0,0],base=V(),P=null,poseA=null;   // P != null: procedural yurish rejimi (modelda haqiqiy walk klipi yo'q)
let dist=0,L=1,pathYaw=0,finalYaw=0,stopI=null,w0=null,w1=null,onStart=null,armW=0,swayT=0;
const camA=V(),camB=V(),look=V(),fromP=V(),fromQ=Q();let fromFov=60;

function boneBy(side,re,not){return bones.find(b=>{const n=nm(b);return n.indexOf(side)>=0&&re.test(n)&&!(not&&not.test(n))})||null}
function findArm(side){
  const hand=boneBy(side,/hand$/);let fore=boneBy(side,/forearm$/),upper=boneBy(side,/arm$/,/forearm|shoulder/),sh=boneBy(side,/(shoulder|clavicle)$/);
  if(hand){ // nom topilmasa ierarxiyadan: kaft -> tirsak -> yelka -> o'mrov
    if(!fore&&hand.parent&&hand.parent.isBone)fore=hand.parent;
    if(fore&&!upper&&fore.parent&&fore.parent.isBone)upper=fore.parent;
    if(upper&&!sh&&upper.parent&&upper.parent.isBone)sh=upper.parent}
  if(!(upper&&fore&&hand)||fore.parent!==upper||hand.parent!==fore)return null;   // zanjir haqiqatan bog'langanini tekshiramiz
  return{side,sh:sh&&upper.parent===sh?sh:null,upper,fore,hand}}

// modelning old tomoni: oyoq -> barmoq uchi vektoridan o'lchanadi (topilmasa glTF standarti: +Z)
function detectForward(){
  let fx=0,fz=0;
  for(const s of["left","right"]){const f=boneBy(s,/foot$/),t=boneBy(s,/toe(base)?$/);
    if(f&&t){f.getWorldPosition(_a);t.getWorldPosition(_b);fx+=_b.x-_a.x;fz+=_b.z-_a.z}}
  if(Math.hypot(fx,fz)<1e-6)return 0;
  let th=-Math.atan2(fx,fz);const q=Math.round(th/(Math.PI/2))*(Math.PI/2);if(Math.abs(th-q)<.35)th=q;return th}

// klipni namunalab: root-motion siljishi va oyoqlar yaqin turgan (to'xtashga qulay) fazalar
function analyse(){
  const tmp=new T.AnimationMixer(root),a=tmp.clipAction(walkClip);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();
  const fl=boneBy("left",/foot$/),fr=boneBy("right",/foot$/),N=48,S=[];
  for(let i=0;i<=N;i++){tmp.setTime(dur*i/N);group.updateMatrixWorld(true);hips.getWorldPosition(_a);
    const s={x:_a.x,z:_a.z,sc:1e9,fd:0};
    if(fl&&fr){fl.getWorldPosition(_b);fr.getWorldPosition(_c);s.fd=Math.hypot(_b.x-_c.x,_b.z-_c.z);s.sc=s.fd+2*Math.abs(_b.y-_c.y)}
    S.push(s)}
  tmp.stopAllAction();tmp.uncacheRoot(root);
  const dx=S[N].x-S[0].x,dz=S[N].z-S[0].z,d=Math.hypot(dx,dz);
  if(d>.12){drift.set(dx/dur,0,dz/dur);speed=d/dur}else{drift.set(0,0,0);speed=CFG.walkSpeed>0?CFG.walkSpeed:1.3}
  const best=(a,b)=>{let k=a;for(let i=a;i<b;i++)if(S[i].sc<S[k].sc)k=i;return k};
  rest=fl&&fr?[dur*best(0,N/2)/N,dur*best(N/2,N)/N]:[0,dur/2];
  if(fl&&fr){const fds=S.map(x=>x.fd),sp=Math.max(...fds)-Math.min(...fds);   // yurishda oyoqlar oralig'i davriy o'zgaradi
    if(sp<CFG.height*.08)console.warn("[StartGirl] klip yurishga o'xshamaydi (oyoqlar deyarli qimirlamaydi, o'zgarish "+sp.toFixed(2)+" m). To'g'ri klip tanlanganini tekshiring: STARTGIRL.walkClip")}
  if(CFG.debug)console.log("[StartGirl] rootMotion:",d>.12,"speed",speed.toFixed(2),"m/s, rest",rest)}
// klip vaqtidan keyingi "oyoqlar yaqin" faza gacha qolgan vaqt (kamida .35 s)
function toRest(t){let m=1e9;for(const r of rest){let d=((r-t)%dur+dur)%dur;if(d<.35)d+=dur/2;if(d<.35)d+=dur/2;m=Math.min(m,d)}return m}


// Haqiqiy (skelet bilan deformatsiyalangan) o'lcham: Box3.setFromObject skinned meshda suyaklarni hisobga olmaydi,
// shuning uchun model juda katta/kichik chiqardi. Bu yerda har bir uchi suyak transformasi bilan hisoblanadi.
const _sv=new T.Vector3();
function skBox(o){
  o.updateMatrixWorld(true);const b=new T.Box3();let n=0;
  o.traverse(m=>{
    if(m.isSkinnedMesh&&m.skeleton&&typeof m.boneTransform==="function"&&m.geometry.attributes.position){
      m.skeleton.update();const p=m.geometry.attributes.position;
      for(let i=0;i<p.count;i++){m.boneTransform(i,_sv);_sv.applyMatrix4(m.matrixWorld);b.expandByPoint(_sv);n++}}
    else if(m.isMesh&&!m.isSkinnedMesh){b.union(new T.Box3().setFromObject(m));n++}});
  if(!n||b.isEmpty()){ // zaxira: suyaklar bo'yicha
    const bb=new T.Box3();o.traverse(x=>{if(x.isBone){x.getWorldPosition(_sv);bb.expandByPoint(_sv)}});
    const h=bb.max.y-bb.min.y;bb.max.y+=h*.08;bb.min.y-=h*.02;return bb}
  return b}
function build(gl){
  root=gl.scene;inner.add(root);scene.add(group);
  root.traverse(o=>{if(o.isBone)bones.push(o)});
  if(!bones.length)throw new Error("modelda skelet (Bone) topilmadi");
  hips=bones.find(b=>!(b.parent&&b.parent.isBone));
  // 1) yo'nalish (dam olish pozasida), 2) o'lcham, 3) oyoq ostiga va pelvis markaziga qo'yish
  group.updateMatrixWorld(true);inner.rotation.y=detectForward();
  group.updateMatrixWorld(true);let bx=skBox(root);const h=bx.max.y-bx.min.y;
  if(!(h>1e-4))throw new Error("model o'lchami noto'g'ri");
  root.scale.multiplyScalar(CFG.height/h);group.updateMatrixWorld(true);
  bx=skBox(root);hips.getWorldPosition(_a);
  inner.position.set(-_a.x,-bx.min.y,-_a.z);base.copy(inner.position);
  // suyaklar
  const other=CFG.arm==="left"?"right":"left";
  rig=findArm(CFG.arm)||findArm(other);
  if(!rig)console.warn("[StartGirl] qo'l suyaklari topilmadi — qo'l ko'tarilmaydi. Suyaklar:",bones.map(b=>b.name).join(", "));
  else{const o=findArm(rig.side==="left"?"right":"left");oppUpper=o?o.upper:null;if(CFG.debug)console.log("[StartGirl] qo'l:",rig.side,rig.sh&&rig.sh.name,rig.upper.name,rig.fore.name,rig.hand.name)}
  // klip(lar): faqat mavjudlari
  const clips=gl.animations||[],names=clips.map((c,i)=>i+": \""+c.name+"\" "+c.duration.toFixed(3)+"s, "+c.tracks.length+" track");
  console.log("[StartGirl] modeldagi klip nomlari:\n"+(names.join("\n")||"(yo'q)"));
  const longest=a=>a.slice().sort((x,y)=>y.duration-x.duration)[0]||null;
  const pick=(n,re)=>(n&&clips.find(c=>c.name===n))||longest(clips.filter(c=>re.test(c.name)))||null;
  walkClip=pick(CFG.walkClip,/walk/i);
  // nomi mos kelmasa yoki juda qisqa (bitta kadrli poza/T-pose klipi) bo'lsa: haqiqiy harakat klipi — eng uzuni
  let useProc=false;
  if(!walkClip||walkClip.duration<=.3){const alt=longest(clips);
    if(alt&&alt.duration>.3&&alt.tracks.length>0){console.warn("[StartGirl] 'walk' klipi topilmadi/juda qisqa, eng uzun klip ishlatildi:",alt.name,alt.duration.toFixed(2)+"s");walkClip=alt}
    else useProc=true}
  let idleClip=pick(CFG.idleClip,/idle|stand|breath/i);if(idleClip&&idleClip.duration<=.3)idleClip=null;
  mixer=new T.AnimationMixer(root);
  if(useProc)setupProc(clips);
  else{dur=walkClip.duration;analyse();walkA=mixer.clipAction(walkClip);walkA.setLoop(T.LoopRepeat,Infinity)}
  if(idleClip&&idleClip!==walkClip){idleA=mixer.clipAction(idleClip);idleA.setLoop(T.LoopRepeat,Infinity)}
  // yuz/kiyim materiallariga tegmaymiz; faqat render sozlamalari
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=!coarse;o.receiveShadow=false}});
  prewarm()}

// ---- procedural yurish: modelda haqiqiy walk klipi bo'lmasa (klip 0 s = bitta poza) ----
class ProcClock{constructor(){this.time=0;this.timeScale=1;this.paused=false}reset(){this.time=0;this.paused=false;return this}setEffectiveWeight(){return this}play(){return this}stop(){return this}}
function findLeg(side){
  const foot=boneBy(side,/foot$/),toe=boneBy(side,/toe(base)?$/);let shin=boneBy(side,/leg$/,/upleg|thigh/),thigh=boneBy(side,/(upleg|thigh)$/);
  if(foot){if(!shin&&foot.parent&&foot.parent.isBone)shin=foot.parent;if(shin&&!thigh&&shin.parent&&shin.parent.isBone)thigh=shin.parent}
  if(!(thigh&&shin&&foot)||shin.parent!==thigh||foot.parent!==shin)return null;
  return{thigh,shin,foot,toe:toe&&toe.parent===foot?toe:null}}
function setupProc(clips){
  const arms=["left","right"].map(findArm),legs=["left","right"].map(findLeg);
  if(arms.some(x=>!x)||legs.some(x=>!x))throw new Error("modelda yurish klipi yo'q va procedural yurish uchun qo'l/oyoq suyaklari to'liq topilmadi. Suyaklar: "+bones.map(b=>b.name).join(", "));
  const pose=clips.slice().sort((a,b)=>b.tracks.length-a.tracks.length)[0];   // bitta kadrli poza klipi (bo'lsa) — boshlang'ich poza
  if(pose&&pose.tracks.length){poseA=mixer.clipAction(pose);poseA.setLoop(T.LoopOnce,1);poseA.clampWhenFinished=true}
  dur=1.2;speed=CFG.walkSpeed>0?CFG.walkSpeed:1.3;drift.set(0,0,0);rest=[0,dur/2];walkA=new ProcClock();
  group.updateMatrixWorld(true);const l=arms&&legs[0];l.thigh.getWorldPosition(_a);l.shin.getWorldPosition(_b);l.foot.getWorldPosition(_c);
  const Ll=_a.distanceTo(_b)+_b.distanceTo(_c);   // oyoq uzunligi -> qadam kengligi qadam tezligiga mos
  P={arms,legs,A:Math.asin(clamp(speed*dur/(4*Math.max(Ll,.3)),.12,.6)),B:.9,AA:.35};
  console.warn("[StartGirl] modelda haqiqiy walk animatsiyasi yo'q (klip uzunligi 0 s) — procedural yurish ishlatildi. Haqiqiy yurish uchun Mixamo'dan 'Walking' (With Skin) bilan qayta yuklab oling.")}
function applyLoco(lw){
  const ph=walkA.time/dur*2*Math.PI;_fwd.set(Math.sin(group.rotation.y),0,Math.cos(group.rotation.y));
  const down=(s,out)=>out.set(0,-1,0).multiplyScalar(Math.cos(s)).addScaledVector(_fwd,Math.sin(s));
  for(let i=0;i<2;i++){
    const a=P.arms[i],o=P.arms[1-i],lg=P.legs[i],lo=P.legs[1-i],pi=ph+(i?Math.PI:0);
    // qo'l: oyoqqa qarama-qarshi tebranadi, tirsak biroz bukiladi
    a.upper.getWorldPosition(_a);o.upper.getWorldPosition(_b);_side.set(_a.x-_b.x,0,_a.z-_b.z);if(_side.lengthSq()<1e-8)_side.set(1,0,0);_side.normalize();
    const sa=-P.AA*Math.sin(pi)*lw,bend=.22+.45*Math.max(0,Math.sin(sa*2.5+.6))*lw;
    dirOf(a.upper,a.fore,_dn);down(sa,_tg).addScaledVector(_side,.10).normalize();aim(a.upper,_dn,_tg,1);
    dirOf(a.fore,a.hand,_dn);down(sa+bend,_tg).addScaledVector(_side,.04).normalize();aim(a.fore,_dn,_tg,1);
    // oyoq: son oldinga/orqaga, tizza oldinga olib o'tishda buklanadi, tovon yerga parallel
    lg.thigh.getWorldPosition(_a);lo.thigh.getWorldPosition(_b);_side.set(_a.x-_b.x,0,_a.z-_b.z);if(_side.lengthSq()<1e-8)_side.set(1,0,0);_side.normalize();
    const sw=P.A*Math.sin(pi)*lw,kb=P.B*lw*Math.max(0,Math.cos(pi));
    dirOf(lg.thigh,lg.shin,_dn);down(sw,_tg).addScaledVector(_side,.04).normalize();aim(lg.thigh,_dn,_tg,1);
    dirOf(lg.shin,lg.foot,_dn);down(sw-kb,_tg).addScaledVector(_side,.04).normalize();aim(lg.shin,_dn,_tg,1);
    if(lg.toe){dirOf(lg.foot,lg.toe,_dn);_tg.copy(_fwd).addScaledVector(_up,-.15).normalize();aim(lg.foot,_dn,_tg,1)}}}

// birinchi kadrda qotib qolmasligi uchun shader va teksturalar yuklash vaqtida tayyorlanadi
function prewarm(){try{group.visible=true;renderer.compile(scene,camera);
  root.traverse(o=>{if(o.isMesh&&o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const k in m){const v=m[k];if(v&&v.isTexture&&renderer.initTexture)renderer.initTexture(v)}})})}
  catch(e){console.warn("[StartGirl] prewarm:",e)}group.visible=false}

function load(idx,report){
  failed=false;let settled=false;const fail=why=>{if(settled)return;settled=true;failed=true;ready=false;console.warn("[StartGirl] "+why);report(idx,0,0,why)};
  if(!T.GLTFLoader){fail("GLTFLoader yo'q");return}
  const paths=[CFG.file,"girl.glb"];   // mashina .glb lari turgan papkadan (HTML yonidan); asosiy nom topilmasa girl.glb
  const tryLoad=i=>new T.GLTFLoader().load(paths[i],gl=>{try{build(gl);if(settled)return;settled=true;ready=true;report(idx,1,1)}catch(e){console.error(e);fail("model tayyorlanmadi: "+e.message)}},
    xhr=>{if(xhr.total)report(idx,xhr.loaded/xhr.total*.95)},err=>{console.warn("[StartGirl] "+paths[i]+" yuklanmadi:",err&&(err.message||err.target&&err.target.status||err));if(i+1<paths.length)tryLoad(i+1);else fail(paths.join(" va ")+" yuklanmadi")});
  tryLoad(0);
  setTimeout(()=>fail("yuklash 90 soniyada tugamadi"),90000)}   // loading ekranida qotib qolmaslik uchun

// ---- qo'l: kerakli yo'nalishga burish (suyak o'qlaridan mustaqil) ----
function dirOf(b,c,out){b.getWorldPosition(_a);c.getWorldPosition(out);out.sub(_a);return out.lengthSq()>1e-12?out.normalize():out.set(0,1,0)}
function aim(bone,dirNow,dirTarget,w){
  _q1.setFromUnitVectors(dirNow,dirTarget);
  bone.getWorldQuaternion(_q2);_q2.premultiply(_q1);
  bone.parent.getWorldQuaternion(_q3);_q3.invert().multiply(_q2);
  bone.quaternion.slerp(_q3,w)}
let armSnap=null;
function armBones(){const r=rig;return[r.sh,r.upper,r.fore,r.hand].filter(Boolean)}
// qo'l suyaklarining dam olish pozasi saqlanadi va har kadrda tiklanadi: mixer pauzada bo'lsa ham qo'l qaytib tushadi
function restoreArm(){if(!armSnap)return;armBones().forEach((b,i)=>b.quaternion.copy(armSnap[i]));rig.upper.updateMatrixWorld(true)}
function applyArm(w){
  const r=rig;if(!armSnap)armSnap=armBones().map(b=>b.quaternion.clone());else restoreArm();r.upper.getWorldPosition(_a);
  if(oppUpper)oppUpper.getWorldPosition(_b);else group.getWorldPosition(_b);
  _side.set(_a.x-_b.x,0,_a.z-_b.z);if(_side.lengthSq()<1e-8)_side.set(1,0,0);_side.normalize();
  _fwd.set(Math.sin(group.rotation.y),0,Math.cos(group.rotation.y));
  const sw=Math.sin(swayT*1.9)*.035*w;
  if(r.sh){dirOf(r.sh,r.upper,_dn);_tg.copy(_dn).addScaledVector(_up,.35).normalize();aim(r.sh,_dn,_tg,w)}
  dirOf(r.upper,r.fore,_dn);_tg.set(0,0,0).addScaledVector(_side,.40+sw).addScaledVector(_up,1).addScaledVector(_fwd,.08).normalize();aim(r.upper,_dn,_tg,w);
  dirOf(r.fore,r.hand,_dn);_tg.set(0,0,0).addScaledVector(_side,.12).addScaledVector(_up,1).addScaledVector(_fwd,.16).normalize();aim(r.fore,_dn,_tg,w)}

// ---- kinematografik kamera: keng plan -> qahramon plan (sekin yaqinlashish) ----
function cam(dt){
  const u=clamp(tAll/tTotal,0,1),e=ease(u);
  group.getWorldPosition(_a);
  _tg.set(_a.x,_a.y+lerp(1.0,1.4,e),_a.z);look.lerp(_tg,Math.min(1,dt*3.5));
  camera.position.set(lerp(camA.x,camB.x,e),lerp(2.1,1.3,e),lerp(camA.z,camB.z,e));
  camera.lookAt(look);
  let fov=lerp(55,34,e);
  const bw=1-ease(clamp(tAll/1.0,0,1));   // oldingi kameradan silliq o'tish
  if(bw>0){camera.position.lerp(fromP,bw);camera.quaternion.slerp(fromQ,bw);fov=lerp(fov,fromFov,bw)}
  camera.fov=fov;camera.updateProjectionMatrix()}

function begin(cb){
  if(!ready||played||state!=="idle")return false;   // intro ikki marta ishga tushmaydi
  played=true;onStart=cb||null;
  w0=at(LINE+CFG.spawnS,CFG.spawnOff);w1=at(LINE+CFG.standS,0);
  L=Math.hypot(w1.x-w0.x,w1.z-w0.z);pathYaw=Math.atan2(w1.x-w0.x,w1.z-w0.z);finalYaw=w1.h+Math.PI;   // oxirida mashinalarga qaraydi
  const ca=at(LINE-12,-1.5),cb2=at(LINE-4.2,-.4);camA.set(ca.x,0,ca.z);camB.set(cb2.x,0,cb2.z);
  look.set(w1.x,1.0,w1.z);fromP.copy(camera.position);fromQ.copy(camera.quaternion);fromFov=camera.fov;
  mixer.stopAllAction();if(idleA)idleA.stop();
  walkA.reset();walkA.setEffectiveWeight(1);walkA.timeScale=.45;walkA.paused=false;walkA.play();if(poseA){poseA.reset();poseA.play()}
  dist=0;armW=0;swayT=0;stopI=null;state="walk";stT=tAll=0;
  tTotal=L/speed+.9+CFG.settle+CFG.raise+CFG.hold+CFG.drop;
  inner.position.copy(base);group.position.set(w0.x,0,w0.z);group.rotation.y=pathYaw;group.visible=true;
  return true}

function toState(s){state=s;stT=0}
function update(dt,playerS){
  if(state==="idle"||state==="finished")return;
  if(state==="done"){if(playerS>LINE+CFG.hideAfter){group.visible=false;state="finished"}return}
  dt=Math.min(dt,.05);tAll+=dt;stT+=dt;swayT+=dt;
  let pf=1,yaw=finalYaw,fire=false,lw=0;
  switch(state){
  case"walk":{
    lw=1;walkA.timeScale=lerp(.45,1,ease(Math.min(1,stT/.45)));dist+=speed*walkA.timeScale*dt;
    const rem=L-dist,dr=toRest(walkA.time);
    if(rem<=speed*dr){stopI={rem0:Math.max(0,rem),d0:dist,dr,Ts:2*dr,restT:(walkA.time+dr)%dur};toState("stop")}
    pf=clamp(dist/L,0,1);yaw=pathYaw;break}
  case"stop":{
    const k=Math.min(1,stT/stopI.Ts),p=1-(1-k)*(1-k);
    lw=1-ease(k);walkA.timeScale=1-k;dist=stopI.d0+stopI.rem0*p;pf=clamp(dist/L,0,1);yaw=angLerp(pathYaw,finalYaw,ease(p));
    if(k>=1){walkA.time=stopI.restT;walkA.timeScale=0;walkA.paused=true;pf=1;yaw=finalYaw;toState("settle");
      if(idleA){idleA.reset();idleA.setEffectiveWeight(1);idleA.play();idleA.crossFadeFrom(walkA,CFG.settle,false)}}
    break}
  case"settle":if(stT>=CFG.settle)toState("raise");break;
  case"raise":{const k=Math.min(1,stT/CFG.raise);armW=ease(k);if(k>=1)toState("hold");break}
  case"hold":armW=1;if(stT>=CFG.hold)toState("drop");break;
  case"drop":{const k=Math.min(1,stT/CFG.drop);armW=1-ease(k);if(k>=1){armW=0;fire=true}break}}
  group.position.set(lerp(w0.x,w1.x,pf),0,lerp(w0.z,w1.z,pf));group.rotation.y=yaw;
  mixer.update(dt);
  if(P){if(!walkA.paused)walkA.time=((walkA.time+dt*walkA.timeScale)%dur+dur)%dur;applyLoco(lw)}   // procedural yurish (poza ustiga)
  inner.position.set(base.x-drift.x*walkA.time,base.y,base.z-drift.z*walkA.time);   // root-motion siljishini bekor qilish
  if(rig){if(armW>.001)applyArm(armW);else restoreArm()}
  cam(dt);
  if(fire){state="done";if(onStart){const f=onStart;onStart=null;f()}}}   // qo'l tushdi -> startRace()

function reset(){state="idle";played=false;armW=0;armSnap=null;onStart=null;group.visible=false;if(mixer)mixer.stopAllAction()}

return{load,begin,update,reset,
  get ready(){return ready},get failed(){return failed},
  get active(){return state!=="idle"&&state!=="done"&&state!=="finished"},get state(){return state}}
})();
