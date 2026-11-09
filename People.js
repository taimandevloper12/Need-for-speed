/* People.js — start maydonidagi personajlar (man.glb va girl.glb nusxalari).
 * - Har bir personaj SkeletonUtils.clone bilan nusxalanadi (bitta .glb dan istalgancha).
 * - Bo'yi skelet bilan deformatsiyalangan uchlardan o'lchanadi, oyoq yerga qo'yiladi, old tomoni oyoq/barmoq suyagidan topiladi.
 * - Tik turish: T-pozadan qo'llar pastga tushiriladi (suyak nomlari taxmin qilinmaydi: ierarxiya tekshiriladi).
 * - Yurish: modeldagi "walk" klipi (joyida yurish; harakatni o'yin o'zi beradi). Klip bo'lmasa — shunchaki siljiydi.
 * Bog'liqliklar: T (three), MAN, STARTGIRL (models.js).
 */
const Folks=(function(){
"use strict";
const CFG=Object.assign({file:"man.glb",height:1.78},typeof MAN!=="undefined"?MAN:{});
const GFILE=(typeof STARTGIRL!=="undefined"&&STARTGIRL.file)||"girl.glb",GH=(typeof STARTGIRL!=="undefined"&&STARTGIRL.height)||1.7;
const coarse=MOBILE;
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const _a=V(),_b=V(),_dn=V(),_tg=V(),_side=V(),_sv=V(),_q1=Q(),_q2=Q(),_q3=Q();
const nm=b=>b.name.toLowerCase().replace(/[^a-z]/g,"");
const src={};let ready=false;

function bb(bones,side,re,not){return bones.find(b=>{const n=nm(b);return n.indexOf(side)>=0&&re.test(n)&&!(not&&not.test(n))})||null}
function findArm(bones,side){
  const hand=bb(bones,side,/hand$/);let fore=bb(bones,side,/forearm$/),upper=bb(bones,side,/arm$/,/forearm|shoulder/);
  if(hand){if(!fore&&hand.parent&&hand.parent.isBone)fore=hand.parent;if(fore&&!upper&&fore.parent&&fore.parent.isBone)upper=fore.parent}
  if(!(upper&&fore&&hand)||fore.parent!==upper||hand.parent!==fore)return null;
  return{upper,fore,hand}}
function detectForward(bones){
  let fx=0,fz=0;
  for(const s of["left","right"]){const f=bb(bones,s,/foot$/),t=bb(bones,s,/toe(base)?$/);
    if(f&&t){f.getWorldPosition(_a);t.getWorldPosition(_b);fx+=_b.x-_a.x;fz+=_b.z-_a.z}}
  if(Math.hypot(fx,fz)<1e-6)return 0;
  let th=-Math.atan2(fx,fz);const q=Math.round(th/(Math.PI/2))*(Math.PI/2);if(Math.abs(th-q)<.35)th=q;return th}
// skelet bilan deformatsiyalangan haqiqiy o'lcham (Box3.setFromObject skinned meshda suyaklarni hisobga olmaydi)
function skBox(o){
  o.updateMatrixWorld(true);const b=new T.Box3();let n=0;
  o.traverse(m=>{
    if(m.isSkinnedMesh&&m.skeleton&&typeof m.boneTransform==="function"&&m.geometry.attributes.position){
      m.skeleton.update();const p=m.geometry.attributes.position;
      for(let i=0;i<p.count;i++){m.boneTransform(i,_sv);_sv.applyMatrix4(m.matrixWorld);b.expandByPoint(_sv);n++}}
    else if(m.isMesh&&!m.isSkinnedMesh){b.union(new T.Box3().setFromObject(m));n++}});
  if(!n||b.isEmpty()){const k=new T.Box3();o.traverse(x=>{if(x.isBone){x.getWorldPosition(_sv);k.expandByPoint(_sv)}});
    const h=k.max.y-k.min.y;k.max.y+=h*.08;k.min.y-=h*.02;return k}
  return b}
function dirOf(b,c,out){b.getWorldPosition(_a);c.getWorldPosition(out);out.sub(_a);return out.lengthSq()>1e-12?out.normalize():out.set(0,1,0)}
function aim(bone,dirNow,dirTarget){
  _q1.setFromUnitVectors(dirNow,dirTarget);bone.getWorldQuaternion(_q2);_q2.premultiply(_q1);
  bone.parent.getWorldQuaternion(_q3);_q3.invert().multiply(_q2);bone.quaternion.copy(_q3)}
// T-pozadagi qo'llar -> tanaga yaqin pastga
function armsDown(bones,group){
  group.updateMatrixWorld(true);
  const L=findArm(bones,"left"),R=findArm(bones,"right");if(!L||!R)return;
  for(const[a,o]of[[L,R],[R,L]]){
    a.upper.getWorldPosition(_a);o.upper.getWorldPosition(_b);_side.set(_a.x-_b.x,0,_a.z-_b.z);if(_side.lengthSq()<1e-8)_side.set(1,0,0);_side.normalize();
    dirOf(a.upper,a.fore,_dn);_tg.set(0,-1,0).addScaledVector(_side,.14).normalize();aim(a.upper,_dn,_tg);
    dirOf(a.fore,a.hand,_dn);_tg.set(0,-1,0).addScaledVector(_side,.06).normalize();aim(a.fore,_dn,_tg)}}

function make(kind){
  const s=src[kind]||src.man||src.girl;if(!s)return null;
  const root=T.SkeletonUtils?T.SkeletonUtils.clone(s.scene):s.scene.clone(true);
  const group=new T.Group(),inner=new T.Group();group.add(inner);inner.add(root);
  const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o);if(o.isMesh){o.frustumCulled=false;o.castShadow=!coarse;o.receiveShadow=false}});
  const hips=bones.find(b=>!(b.parent&&b.parent.isBone));
  const fit=s.fit;   // o'lchash natijasi manba modeli uchun bir marta hisoblanadi, nusxalar keshdan foydalanadi
  if(fit){inner.rotation.y=fit.rot;root.scale.multiplyScalar(fit.k);inner.position.set(fit.x,fit.y,fit.z);group.updateMatrixWorld(true)}
  else{
  group.updateMatrixWorld(true);inner.rotation.y=bones.length?detectForward(bones):0;group.updateMatrixWorld(true);
  let bx=skBox(root);const h0=bx.max.y-bx.min.y,k=h0>1e-4?s.height/h0:1;if(h0>1e-4)root.scale.multiplyScalar(k);
  group.updateMatrixWorld(true);bx=skBox(root);
  if(hips)hips.getWorldPosition(_a);else _a.set(0,0,0);
  inner.position.set(-_a.x,-bx.min.y,-_a.z);group.updateMatrixWorld(true);
  s.fit={rot:inner.rotation.y,k,x:inner.position.x,y:inner.position.y,z:inner.position.z}}
  armsDown(bones,group);
  const standQ=bones.map(b=>b.quaternion.clone());
  let mixer=null,act=null;
  const clip=s.anims.find(c=>/walk/i.test(c.name)&&c.duration>.3)||null;
  if(clip&&bones.length){const c=clip.clone();c.tracks=c.tracks.filter(t=>!/\.position$/.test(t.name));   // joyida yurish (siljishni o'yin beradi)
    mixer=new T.AnimationMixer(root);act=mixer.clipAction(c);act.setLoop(T.LoopRepeat,Infinity)}
  let walking=false;const ph=Math.random()*6.28;
  return{group,
    get walking(){return walking},
    walk(on){if(on===walking)return;walking=on;
      if(on){if(act){act.reset();act.play()}}
      else{if(mixer)mixer.stopAllAction();bones.forEach((b,i)=>b.quaternion.copy(standQ[i]))}},
    update(dt,t){if(walking&&mixer)mixer.update(dt);else if(!walking)root.rotation.z=Math.sin(t*1.4+ph)*.012}}}   // tik turganda ozgina tebranish

function load(idx,report){
  if(!T.GLTFLoader){report(idx,0,0,"GLTFLoader yo'q");return}
  const files=[["man",CFG.file,CFG.height],["girl",GFILE,GH]],prog=[0,0];let done=0,failed=false;
  files.forEach(([k,f,h],i)=>new T.GLTFLoader().load(f,gl=>{
      src[k]={scene:gl.scene,anims:gl.animations||[],height:h};prog[i]=1;done++;
      if(done===files.length&&!failed){ready=true;report(idx,1,1)}else if(!failed)report(idx,(prog[0]+prog[1])/2*.95)},
    xhr=>{if(xhr.total){prog[i]=xhr.loaded/xhr.total;report(idx,(prog[0]+prog[1])/2*.95)}},
    e=>{console.warn("[Folks] "+f+" yuklanmadi",e);failed=true;ready=false;report(idx,0,0,f+" topilmadi")}))}
return{load,make,get ready(){return ready}}
})();
