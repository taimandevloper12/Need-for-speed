// input
const key={},map={KeyW:"gas",ArrowUp:"gas",KeyS:"brake",ArrowDown:"brake",KeyA:"left",ArrowLeft:"left",KeyD:"right",ArrowRight:"right",Space:"hand"};
addEventListener("keydown",e=>{if(map[e.code]){key[map[e.code]]=1;e.preventDefault()}});
addEventListener("keyup",e=>{if(map[e.code])key[map[e.code]]=0});

function roadHit(){ci=nearIdx(ci,px,pz);const q=P[ci],off=(px-q.x)*q.nx+(pz-q.z)*q.nz,ML=HW+3.5;
  if(Math.abs(off)>ML){const s=Math.sign(off),ex=off-s*ML;px-=q.nx*ex;pz-=q.nz*ex;const vn=vx*q.nx+vz*q.nz;if(vn*s>0){vx-=1.5*vn*q.nx;vz-=1.5*vn*q.nz}vx*=.985;vz*=.985}
  else if(Math.abs(off)>HW){vx*=.995;vz*=.995}}
// physics
let px=40,pz=-60,h=0,vx=0,vz=0,steer=0,camH=0;
const kmh=document.getElementById("kmh"),clock=new T.Clock();
function step(dt){
  const fx=Math.sin(h),fz=Math.cos(h);let fs=vx*fx+vz*fz,lx=vx-fx*fs,lz=vz-fz*fs;
  if(key.gas)fs+=30*dt*(1-Math.max(0,fs)/85);
  if(key.brake)fs-=(fs>1?55:22)*dt;
  fs*=Math.exp(-.12*dt);
  const k=Math.exp(-(key.hand?1.4:6.5)*dt);lx*=k;lz*=k;
  steer+=((wheelOn?wheelVal:((key.left?1:0)-(key.right?1:0)))-steer)*Math.min(1,dt*7);
  h+=steer*dt*1.5*Math.max(-1,Math.min(1,fs/12))*(key.hand?1.6:1);
  vx=fx*fs+lx;vz=fz*fs+lz;px+=vx*dt;pz+=vz*dt;
  roadHit();
  return Math.hypot(vx,vz)}
// qat'iy qadamli fizika (120 Hz): to'qnashuvlar FPS ga bog'liq emas
const PH=1/120;let phAcc=0,phSp=0;
function physics(dt){phAcc+=dt;let n=0;
  while(phAcc>=PH&&n<8){phSp=step(PH);if(st==="race"||st==="count")carHit(PH);lampHit(PH);if(st==="race")Peds.hit();phAcc-=PH;n++}
  if(n===8)phAcc=0;return phSp}

// culling: blocks outside the camera view are switched off
const fr=new T.Frustum(),pj=new T.Matrix4();
function cull(){if(!CITY.visible)return;   // boshqa xarita tanlangan: shahar umuman chizilmaydi
  camera.updateMatrixWorld();pj.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);fr.setFromProjectionMatrix(pj);
  for(const b of blocks){const dx=b.s.center.x-px,dz=b.s.center.z-pz,R=b.r||300,v=b.i>ci-8&&dx*dx+dz*dz<R*R&&fr.intersectsSphere(b.s);b.g.visible=v;b.vis=v}
  for(const c of RCH){const dx=c.x-px,dz=c.z-pz;c.m.visible=dx*dx+dz*dz<620*620}   // yo'l/trotuar/maysazor bo'laklari: uzoqdagilari chizilmaydi, qolganini frustum o'zi kesadi
  Buildings.flush();
  // chiroqlar: ortda qolganlari va juda uzoqdagilari chizilmaydi (poygada ortda ~15 m, oldinda ~300 m)
  lampWindow(ci,st==="race"||st==="done"||st==="count"?LAMP_VIEW.behind:LAMP_VIEW.behindIntro,LAMP_VIEW.ahead)}
// camera, sound, interface
let camMode=0,AC=null,eng=null,muted=false,wasGas=0,prevSp=0,fpsN=0,fpsT=0;
const CAMS=[{d:4.4,v:.008,h:1.75,l:4,ly:.95,f:56,n:"Yaqin"},{d:8.5,v:.015,h:3.4,l:8,ly:1.3,f:62,n:"Uzoq"},{d:-1,v:0,h:1.05,l:30,ly:.7,f:74,n:"Bamper"}];
const _dc={};const $=id=>_dc[id]||(_dc[id]=document.getElementById(id));
const txt=(e,v)=>{v=""+v;if(e._t!==v){e._t=v;e.textContent=v}};   // faqat o'zgarsa DOM ga yozadi
function setCam(){camMode=(camMode+1)%3;$("camName").textContent=CAMS[camMode].n}
function toggleSnd(){muted=!muted;$("btnSnd").textContent=muted?"Ovoz: oʻchiq":"Ovoz: yoqiq"}
function fullscreen(){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}catch(e){}}
function initAudio(){loadScreams();if(AC)return;
  AC=new(window.AudioContext||window.webkitAudioContext)();AC.resume();
  const comp=AC.createDynamicsCompressor(),mst=AC.createGain();mst.gain.value=.7;comp.connect(mst);mst.connect(AC.destination);
  const sh=AC.createWaveShaper(),cv=new Float32Array(256);for(let i=0;i<256;i++)cv[i]=Math.tanh((i/128-1)*3);sh.curve=cv;
  const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=600;lp.Q.value=2;
  const eg=AC.createGain();eg.gain.value=0;sh.connect(lp);lp.connect(eg);eg.connect(comp);
  const oscs=[["sawtooth",1,.35],["square",.5,.5],["sawtooth",2.003,.25],["triangle",.25,.9]].map(a=>{const o=AC.createOscillator(),g=AC.createGain();o.type=a[0];g.gain.value=a[2];o.connect(g);g.connect(sh);o.start();return{o,m:a[1]}});
  const nb=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  const noise=(ty,f,q)=>{const s=AC.createBufferSource();s.buffer=nb;s.loop=true;const b=AC.createBiquadFilter();b.type=ty;b.frequency.value=f;b.Q.value=q;const g=AC.createGain();g.gain.value=0;s.connect(b);b.connect(g);g.connect(comp);s.start();return{g,b}};
  eng={oscs,lp,eg,nb,comp,intake:noise("bandpass",900,.8),wind:noise("highpass",500,.3),skid:noise("bandpass",1700,6),rpm:900,gear:1,shift:0}}

// ===== MASHINALAR TO'QNASHUVI: fizika + haqiqiy urilish tovushi (sintez: zarba + metall g'archillash + jarangdor shovqin + oynalar) =====
let hitCd=0;
function crashSnd(p){if(!eng||muted)return;const t=AC.currentTime,v=Math.min(1,.25+p*.75),o=eng.comp;
  // 1) past chastotali zarba (kuzov "gumbur")
  const th=AC.createOscillator(),tg=AC.createGain();th.type="sine";th.frequency.setValueAtTime(150,t);th.frequency.exponentialRampToValueAtTime(38,t+.28);
  tg.gain.setValueAtTime(.9*v,t);tg.gain.exponentialRampToValueAtTime(.001,t+.35);th.connect(tg);tg.connect(o);th.start(t);th.stop(t+.4);
  // 2) yirtilgan metall g'archillashi: bir nechta qisqa shovqin bo'laklari, har xil filtr
  for(let k=0;k<7;k++){const dt=k*(.018+Math.random()*.03),s=AC.createBufferSource();s.buffer=eng.nb;
    const b=AC.createBiquadFilter();b.type="bandpass";b.frequency.value=500+Math.random()*3800;b.Q.value=.8+Math.random()*2.5;
    const g=AC.createGain(),d=.07+Math.random()*.16;g.gain.setValueAtTime(.001,t+dt);g.gain.linearRampToValueAtTime((.75-k*.07)*v,t+dt+.006);g.gain.exponentialRampToValueAtTime(.001,t+dt+d);
    s.connect(b);b.connect(g);g.connect(o);s.start(t+dt,Math.random()*1.5,d+.02)}
  // 3) metall qismlarning jarangi (nomuvofiq tonlar tez so'nadi)
  [310,587,1130,1870,2760].forEach((f,i)=>{const os=AC.createOscillator(),og=AC.createGain();os.type=i%2?"square":"triangle";os.frequency.value=f*(.96+Math.random()*.08);
    og.gain.setValueAtTime(.16*v/(1+i*.5),t);og.gain.exponentialRampToValueAtTime(.001,t+.12+Math.random()*.25);os.connect(og);og.connect(o);os.start(t);os.stop(t+.45)});
  // 4) sinuvchi plastik / oyna parchalari (yuqori chastotali sepilish)
  if(p>.35)for(let k=0;k<9;k++){const dt=.04+Math.random()*.35,s=AC.createBufferSource();s.buffer=eng.nb;const b=AC.createBiquadFilter();b.type="highpass";b.frequency.value=4500+Math.random()*3000;
    const g=AC.createGain();g.gain.setValueAtTime(.18*v,t+dt);g.gain.exponentialRampToValueAtTime(.001,t+dt+.05);s.connect(b);b.connect(g);g.connect(o);s.start(t+dt,Math.random()*1.5,.06)}}
function aiLane(e){return e.l0+.35*Math.sin(e.s*.006+e.ph)}   // har raqib o'z yo'lagida (ozgina tebranib) yuradi
function carHit(dt){hitCd-=dt;
  for(const e of ais){
    const a=e.a||at(e.s,aiLane(e)),af=Math.sin(a.h),ac_=Math.cos(a.h),pf=Math.sin(h),pc_=Math.cos(h),R=1.05,O=1.25;
    if(Math.abs(a.x-px)>9||Math.abs(a.z-pz)>9)continue;
    let best=null;
    for(const i of[-1,0,1])for(const j of[-1,0,1]){   // har mashina 3 ta aylana: old, o'rta, orqa
      const dx=px+pf*O*i-(a.x+af*O*j),dz=pz+pc_*O*i-(a.z+ac_*O*j),d=Math.hypot(dx,dz);
      if(d<2*R&&(!best||d<best.d))best={d,dx,dz}}
    if(!best)continue;
    const d=Math.max(best.d,.01),nx=best.dx/d,nz=best.dz/d,pen=2*R-d;
    px+=nx*pen*.6;pz+=nz*pen*.6;
    const avx=e.v*af,avz=e.v*ac_,vn=(vx-avx)*nx+(vz-avz)*nz;
    if(vn<0){const j=-(1+.35)*vn;vx+=nx*j*.65;vz+=nz*j*.65;
      e.v=Math.max(0,e.v+(nx*af+nz*ac_)*j*-.35);
      const sd=Math.min(1,-vn/14);h+=(Math.random()-.5)*.05*sd;
      if(hitCd<=0&&-vn>1.2){crashSnd(sd);hitCd=.45}}}}

// ===== CHIROQ BILAN TO'QNASHUV =====
function clangSnd(p){if(!eng||muted)return;const t=AC.currentTime,v=Math.min(1,.3+p*.7),o=eng.comp;   // metall ustun yerga tushganda "dong" + yerga zarba
  [[135,1],[262,.8],[418,.6],[870,.4],[1650,.25]].forEach(([f,a],i)=>{const os=AC.createOscillator(),og=AC.createGain();os.type=i<2?"sine":"triangle";os.frequency.value=f*(.985+Math.random()*.03);
    og.gain.setValueAtTime(.5*a*v,t);og.gain.exponentialRampToValueAtTime(.001,t+.9-i*.1);os.connect(og);og.connect(o);os.start(t);os.stop(t+1)});
  const th=AC.createOscillator(),tg=AC.createGain();th.type="sine";th.frequency.setValueAtTime(90,t);th.frequency.exponentialRampToValueAtTime(35,t+.2);tg.gain.setValueAtTime(.7*v,t);tg.gain.exponentialRampToValueAtTime(.001,t+.25);th.connect(tg);tg.connect(o);th.start(t);th.stop(t+.3);
  burst(.25*v,3000,.12)}
// odam bilan urilish: tana "gup" + kiyim/go'sht shapaloqlashi + kapot/oyna metall "tum" + (kuchli urilsa) suyak qarsillashi. p: 0..1
function thudSnd(p){if(!eng||muted)return;const t=AC.currentTime,v=Math.min(1,.35+p*.65),o=eng.comp;
  const th=AC.createOscillator(),tg=AC.createGain();th.type="sine";th.frequency.setValueAtTime(120,t);th.frequency.exponentialRampToValueAtTime(38,t+.18);
  tg.gain.setValueAtTime(1.0*v,t);tg.gain.exponentialRampToValueAtTime(.001,t+.26);th.connect(tg);tg.connect(o);th.start(t);th.stop(t+.3);
  burst(.55*v,700,.09);burst(.25*v,2200,.05);
  const mo=AC.createOscillator(),mg=AC.createGain();mo.type="triangle";mo.frequency.setValueAtTime(240*(.9+Math.random()*.2),t);mo.frequency.exponentialRampToValueAtTime(95,t+.14);
  mg.gain.setValueAtTime(.35*v,t);mg.gain.exponentialRampToValueAtTime(.001,t+.2);mo.connect(mg);mg.connect(o);mo.start(t);mo.stop(t+.24);
  if(p>.45)for(let k=0;k<3;k++){const dt=k*.022+Math.random()*.015,s=AC.createBufferSource();s.buffer=eng.nb;const b=AC.createBiquadFilter();b.type="bandpass";b.frequency.value=1800+Math.random()*1800;b.Q.value=3;
    const g=AC.createGain();g.gain.setValueAtTime(.001,t+dt);g.gain.linearRampToValueAtTime(.7*v,t+dt+.002);g.gain.exponentialRampToValueAtTime(.001,t+dt+.03);s.connect(b);b.connect(g);g.connect(o);s.start(t+dt,Math.random()*1.5,.05)}}
// odam yerga tushganda: past "gup" + sirpanish shovqini
function bodyLandSnd(p){if(!eng||muted)return;const t=AC.currentTime,v=Math.min(1,.3+p*.7),o=eng.comp,th=AC.createOscillator(),tg=AC.createGain();
  th.type="sine";th.frequency.setValueAtTime(90,t);th.frequency.exponentialRampToValueAtTime(34,t+.2);tg.gain.setValueAtTime(.8*v,t);tg.gain.exponentialRampToValueAtTime(.001,t+.24);
  th.connect(tg);tg.connect(o);th.start(t);th.stop(t+.28);burst(.4*v,450,.16)}
// odam qichqirig'i: girl.glb -> girl_scream.mp3, man.glb -> man_scream.mp3 (mashina urganda). Birinchi chaqirilganda yuklanadi, so'ng nusxa bilan ijro etiladi
const SCREAMS={girl:"girl_scream.mp3",man:"man_scream.mp3"},scrA={};
function loadScreams(){for(const k in SCREAMS)if(!scrA[k]){const a=new Audio(SCREAMS[k]);a.preload="auto";scrA[k]=a}}
function screamSnd(kind,p){if(muted)return;loadScreams();const src=scrA[kind]||scrA.man;if(!src)return;
  const a=src.cloneNode();a.volume=Math.min(1,.55+(p||0)*.45);const r=a.play();if(r&&r.catch)r.catch(()=>{})}
function lampLand(p){clangSnd(p)}
let lampCd=0;
function lampHit(dt){lampCd-=dt;const R=1.05,O=1.25,pr=.22,pf=Math.sin(h),pc_=Math.cos(h);
  const lo=Math.max(0,((ci-12)>>3)*2),hi=Math.min(LAMPS.length,((ci+12)>>3)*2+4);   // chiroqlar yo'l indeksi bo'yicha tartiblangan (2 tadan, har 8 nuqtada)
  for(let q=lo;q<hi;q++){const l=LAMPS[q];if(l.st!==0||Math.abs(l.bx-px)>5||Math.abs(l.bz-pz)>5)continue;
    let best=null;
    for(const i of[-1,0,1]){const dx=px+pf*O*i-l.bx,dz=pz+pc_*O*i-l.bz,d=Math.hypot(dx,dz);if(d<R+pr&&(!best||d<best.d))best={d,dx,dz}}
    if(!best)continue;
    const d=Math.max(best.d,.01),nx=best.dx/d,nz=best.dz/d;px+=nx*(R+pr-d);pz+=nz*(R+pr-d);
    const vn=vx*nx+vz*nz;if(vn>=0)continue;
    if(-vn>3.5){   // yetarli tezlik: chiroq yiqiladi
      const sp=Math.hypot(vx,vz)||1,fx=vx/sp*.7-nx*.3,fz=vz/sp*.7-nz*.3,fl=Math.hypot(fx,fz)||1;
      lampKnock(l,fx/fl,fz/fl,Math.min(1.6,.25-vn*.08));
      const j=-vn*.55;vx+=nx*j;vz+=nz*j;vx*=.88;vz*=.88;    // mashina tezligi pasayadi
      crashSnd(Math.min(1,-vn/14));clangSnd(.35);lampCd=.4}
    else{const j=-(1+.3)*vn;vx+=nx*j;vz+=nz*j;if(-vn>1&&lampCd<=0){crashSnd(.2);lampCd=.4}}}}
function burst(vol,f,dur){if(!eng||muted)return;const t=AC.currentTime,s=AC.createBufferSource();s.buffer=eng.nb;const b=AC.createBiquadFilter();b.type="lowpass";b.frequency.value=f;
  const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(b);b.connect(g);g.connect(eng.comp);s.start(t,Math.random(),dur)}
let audAcc=0;
function audio(sp,dt){if(!eng)return;const e=eng,t=AC.currentTime,thr=key.gas?1:0,MG=[0,22,38,55,72,92];
  if(e.gear<5&&sp>MG[e.gear]*.94){e.gear++;e.shift=.18;if(thr)burst(.12,1200,.08)}else if(e.gear>1&&sp<MG[e.gear-1]*.72)e.gear--;
  let tg=900+Math.min(1,sp/MG[e.gear])*6300;if(sp<3&&thr)tg=3800;if(e.shift>0){e.shift-=dt;tg-=1800}
  e.rpm+=(tg-e.rpm)*Math.min(1,dt*(thr?6:4));
  const f=e.rpm/60*3,r01=(e.rpm-900)/6300;
  if((audAcc+=dt)>=.033){audAcc=0;   // AudioParam yangilanishi ~30 Hz
  e.oscs.forEach(o=>o.o.frequency.setTargetAtTime(f*o.m,t,.03));
  e.lp.frequency.setTargetAtTime(400+r01*2400+thr*900,t,.05);
  e.eg.gain.setTargetAtTime(muted?0:.12+thr*.16+r01*.1,t,.05);
  e.intake.g.gain.setTargetAtTime(muted?0:thr*.05*(.3+r01),t,.08);e.intake.b.frequency.setTargetAtTime(500+r01*2200,t,.1);
  e.wind.g.gain.setTargetAtTime(muted?0:Math.min(.09,sp/85*.09),t,.1);
  const fw=vx*Math.sin(h)+vz*Math.cos(h),slip=Math.sqrt(Math.max(0,sp*sp-fw*fw));
  e.skid.g.gain.setTargetAtTime(muted?0:Math.min(.12,Math.max(0,slip-3)*.02),t,.05);
  }
  if(wasGas&&!thr&&e.rpm>4000&&Math.random()<.7)burst(.35,900,.12);wasGas=thr;
  if(prevSp-sp>7)burst(.8,200,.45)}
const tx=$("tach").getContext("2d"),mx=$("mini").getContext("2d");
// statik siferblat (orqa yoy + chiziqlar) bir marta offscreen canvasga chiziladi
const dialC=(function(){const c=document.createElement("canvas");c.width=c.height=220;const d=c.getContext("2d"),a0=Math.PI*.75,a1=Math.PI*2.25;
  d.lineCap="round";d.lineWidth=12;d.strokeStyle="rgba(255,255,255,.12)";d.beginPath();d.arc(110,110,94,a0,a1);d.stroke();
  d.lineWidth=2;d.strokeStyle="rgba(255,255,255,.5)";for(let i=0;i<=8;i++){const a=a0+(a1-a0)*i/8;d.beginPath();d.moveTo(110+Math.cos(a)*78,110+Math.sin(a)*78);d.lineTo(110+Math.cos(a)*86,110+Math.sin(a)*86);d.stroke()}
  return c})();
const tachG=(function(){const g=tx.createLinearGradient(20,200,200,20);g.addColorStop(0,"#19e3ff");g.addColorStop(.7,"#ff2e88");g.addColorStop(1,"#ff2020");return g})();
const elKmh=$("kmh"),elGear=$("gear"),elPos=$("pos"),elFps=$("fps");
function hud(sp,dt){
  audio(sp,dt);prevSp=sp;
  const rpm=eng?eng.rpm:900,gear=eng?eng.gear:1;
  txt(elKmh,Math.round(sp*3.6));txt(elGear,sp<.5&&!key.gas?"N":gear);
  hf=(hf+1)%6;
  if(hf%2===0){const a0=Math.PI*.75,a1=Math.PI*2.25,v=Math.min(1,rpm/8000);   // tachometr: har 2-kadrda
    tx.clearRect(0,0,220,220);tx.drawImage(dialC,0,0);tx.lineCap="round";tx.lineWidth=12;tx.strokeStyle=tachG;tx.beginPath();tx.arc(110,110,94,a0,a0+(a1-a0)*v);tx.stroke()}
  if(hf%3===0){   // minixarita: har 3-kadrda
    const sc=1.1;mx.clearRect(0,0,132,132);mx.save();mx.beginPath();mx.arc(66,66,66,0,6.3);mx.clip();mx.fillStyle="#0d0b1a";mx.fillRect(0,0,132,132);
    mx.translate(66,66);mx.rotate(h-Math.PI);mx.fillStyle="#2a2c3a";
    const b0=Math.max(0,ci-30),b1=Math.min(P.length,ci+40);mx.strokeStyle="#5a5d78";mx.lineWidth=7;mx.beginPath();
    for(let i=b0;i<b1;i++){const X=(P[i].x-px)*sc,Z=(P[i].z-pz)*sc;i===b0?mx.moveTo(X,Z):mx.lineTo(X,Z)}mx.stroke();
    mx.restore();mx.fillStyle="#ff2e88";mx.beginPath();mx.moveTo(66,54);mx.lineTo(72,74);mx.lineTo(66,70);mx.lineTo(60,74);mx.closePath();mx.fill()}
  fpsN++;fpsT+=dt;if(fpsT>.5){const f=Math.round(fpsN/fpsT);txt(elFps,f+" FPS");adaptRes(f);fpsN=0;fpsT=0}}
$("btnCam").onclick=setCam;$("btnSnd").onclick=toggleSnd;$("btnFs").onclick=fullscreen;
function go(){if(st!=="select"||LD.done<LD.total||mapBusy)return;initAudio();$("start").style.display="none";document.body.classList.add("play");st="intro";pl.s=0;pl.v=0;ais.forEach(e=>{e.s=4;e.v=0;e.fin=0})}
$("go").onclick=go;
// BAMPER kamerasini jonli sozlash (faqat Bamper rejimida): T/G oldinga-orqaga, Y/H balandlik, U/J chapga-o'ngga, I/K pastga-tepaga qarash
const TUNE={KeyT:["d",-.05],KeyG:["d",.05],KeyY:["h",.03],KeyH:["h",-.03],KeyU:["x",.03],KeyJ:["x",-.03],KeyI:["ly",.4],KeyK:["ly",-.4]};
function tuneCam(code){const t=TUNE[code],k=camMode===2&&CAR_MODELS[sel].bumper;if(!t||!k)return false;
  k[t[0]]=Math.round((k[t[0]]+t[1])*1000)/1000;
  const s="bumper:{d:"+k.d+",h:"+k.h+",ly:"+k.ly+",x:"+k.x+"}";$("camName").textContent="Bamper "+s;console.log(CAR_MODELS[sel].name,s);return true}
addEventListener("keydown",e=>{if(tuneCam(e.code))return;if(e.code==="KeyC")setCam();else if(e.code==="KeyM")toggleSnd();else if(e.code==="KeyF")fullscreen();else if(e.code==="KeyR"&&st==="done")again();else if(st==="select"&&(e.code==="ArrowLeft"||e.code==="ArrowRight"))setSel(sel+(e.code==="ArrowRight"?1:-1));else if(e.code==="Enter"&&$("start").style.display!=="none")go()});
addEventListener("pointerdown",()=>{if(AC&&AC.state==="suspended")AC.resume();if(st==="done"&&clock.elapsedTime-doneAt>1.2)again()});   // finishdan keyin ekranni bosish = qayta boshlash
let camBlend=1;const camFrom={p:new T.Vector3(),q:new T.Quaternion()};
let st="select",sel=0,aiIdx=1,hf=0,oy=.7,op=.18,RR=7.5,drag=0,lx0=0,ly0=0,ci=0,tc=0,t0=0,pfin=0,afin=0,doneAt=0,mapBusy=false;let TG=LINE-3.5;const pl={s:0,v:0};
// 4 ta raqib: [yo'lak (start joyi), tezlik m/s, faza]. O'yinchi -3.4 da turadi, hammasi bir qatorda
const ais=[[-6.3,48,0],[0,45,1.7],[3.4,42,3.1],[6.3,39,4.6]].map(([l0,spd,ph],k)=>({s:0,v:0,l0,spd,ph,fin:0,k}));
const cloneCache={};
function getAiCar(k){const n=CAR_MODELS.length,m=(sel+1+k)%n;let used=(m===sel?1:0);for(let j=0;j<k;j++)if((sel+1+j)%n===m)used++;
  if(used===0)return getCar(m);                                   // bu model hali band emas
  const key=m+"_"+used;let c=cloneCache[key];if(!c){c=cloneCache[key]=new T.Group();c.visible=false;scene.add(c)}
  const src=getCar(m);if(!c.children.length&&src.children.length)c.add(src.children[0].clone(true));   // band bo'lsa — nusxa
  return c}
function hideClones(){for(const k in cloneCache)cloneCache[k].visible=false}
function setSel(i){const n=CAR_MODELS.length;sel=(i+n)%n;aiIdx=(sel+1)%n;$("cname").textContent=CAR_MODELS[sel].name}
function again(){StartGirl.reset();Peds.reset();camBlend=1;document.body.classList.remove("play");st="select";pfin=afin=0;$("cd").textContent="";$("start").style.display="flex"}
$("prev").onclick=()=>setSel(sel-1);$("next").onclick=()=>setSel(sel+1);
// xarita tanlash: "Shahar" yoki .glb xarita (sky.glb). Tanlangach poyga shu yerda bo'ladi; yuklanguncha "Poygani boshlash" o'chiq turadi
function setMap(i){const n=Maps.count;i=(i+n)%n;if(mapBusy||st!=="select"||i===Maps.cur)return;
  const prev=Maps.cur,goB=$("go"),goTxt="Poygani boshlash";mapBusy=true;goB.disabled=true;$("mname").textContent=Maps.name(i);
  const fin=ok=>{mapBusy=false;TG=LINE-3.5;goB.textContent=goTxt;goB.disabled=LD.done<LD.total;if(!ok)$("mname").textContent=Maps.name(Maps.cur)};
  Maps.select(i,p=>{goB.textContent="Xarita "+Math.round(p*100)+"%"},(ok,msg)=>{
    if(!ok){console.warn(msg);goB.textContent="Yuklanmadi: "+Maps.file(i);setTimeout(()=>fin(false),2200)}else fin(true)});
  if(!mapBusy)return;goB.textContent="Xarita yuklanmoqda…"}
$("mprev").onclick=()=>setMap(Maps.cur-1);$("mnext").onclick=()=>setMap(Maps.cur+1);
const cv=renderer.domElement;cv.addEventListener("pointerdown",e=>{drag=1;lx0=e.clientX;ly0=e.clientY});addEventListener("pointerup",()=>drag=0);
addEventListener("pointermove",e=>{if(drag&&st==="select"){oy-=(e.clientX-lx0)*.009;op=Math.max(-.05,Math.min(1.2,op+(e.clientY-ly0)*.006));lx0=e.clientX;ly0=e.clientY}});
cv.addEventListener("wheel",e=>{RR=Math.max(4.5,Math.min(14,RR+e.deltaY*.01))});
// Barcha mashinalar BIR VAQTDA shu yerdan start oladi (qiz qo'lini tushirgan zahoti yoki zaxira sanoq tugaganda)
function startRace(){if(st==="race"||st==="done")return;
  if(st==="girl"){camFrom.p.copy(camera.position);camFrom.q.copy(camera.quaternion);camBlend=0}
  st="race";t0=clock.elapsedTime;$("cd").textContent="START!"}
function put2(o,s,off){const a=at(s,off);o.position.set(a.x,0,a.z);o.rotation.set(0,a.h,0);return a}
function arrive(e,dt){const d=TG-e.s;if(d>.05){e.v=Math.min(60,Math.max(5,Math.sqrt(40*d)));e.s+=Math.min(d,e.v*dt)}else{e.v=0;e.s=TG}}
const ACS=[];function fillAcs(){for(let k=0;k<ais.length;k++)ACS[k]=getAiCar(k);return ACS}   // har kadrda yangi massiv yaratilmaydi
function setFov(f){if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix()}}
function setCd(v){const e=$("cd");if(e.textContent!==v)e.textContent=v}
// soya kamerasi texel to'riga yopishadi -> soya chetlari titramaydi
const _sf=SUN_DIR.clone().negate(),_sr=new T.Vector3().crossVectors(_sf,new T.Vector3(0,1,0)).normalize(),_su=new T.Vector3().crossVectors(_sr,_sf).normalize(),SH_TEXEL=140/SHM;
function sunSnap(){const a=px*_sr.x+pz*_sr.z,b=px*_su.x+pz*_su.z,da=Math.round(a/SH_TEXEL)*SH_TEXEL-a,db=Math.round(b/SH_TEXEL)*SH_TEXEL-b,
  cx=px+_sr.x*da+_su.x*db,cy=_sr.y*da+_su.y*db,cz=pz+_sr.z*da+_su.z*db;
  sunL.target.position.set(cx,cy,cz);sunL.position.set(cx+SUN_DIR.x*400,cy+SUN_DIR.y*400,cz+SUN_DIR.z*400)}
function frame(){
  const dt=Math.min(clock.getDelta(),.05),now=clock.elapsedTime,pc=getCar(sel),acs=fillAcs();let sp=0,free=true;
  if(st!=="race")key.gas=key.brake=key.left=key.right=key.hand=0;if(st==="done")key.brake=1;
  {const nn=camMode===2&&(st==="count"||st==="race"||st==="done")?.1:.3;if(camera.near!==nn){camera.near=nn;camera.updateProjectionMatrix()}}   // salon kamerasi: rul va panel kesilib ketmasin
  if(st==="select"){
    hideCars();hideClones();pc.visible=true;const a=put2(pc,TG,0);px=a.x;pz=a.z;h=a.h;ci=Math.round(TG/STEP);if(!drag)oy+=dt*.35;
    camera.position.set(a.x+Math.sin(oy)*Math.cos(op)*RR,.8+Math.sin(op)*RR,a.z+Math.cos(oy)*Math.cos(op)*RR);camera.lookAt(a.x,.3,a.z);setFov(45)}
  else if(st==="intro"){
    pc.visible=true;acs.forEach(c=>c.visible=true);arrive(pl,dt);ais.forEach(e=>arrive(e,dt));const a=put2(pc,pl.s,-3.4);px=a.x;pz=a.z;h=a.h;vx=vz=0;ci=Math.round(pl.s/STEP);ais.forEach((e,k)=>{e.a=put2(acs[k],e.s,aiLane(e))});
    const c=at(TG+16,Math.sin(now*.5)*4),m=at(pl.s,0);camera.position.set(c.x,1.5+Math.sin(now*.3)*.3,c.z);camera.lookAt(m.x,.9,m.z);setFov(50);
    if(pl.v===0&&ais.every(e=>e.v===0)){if(StartGirl.ready&&StartGirl.begin(startRace))st="girl";else{st="count";tc=0}camH=h}}
  else if(st==="girl"){
    pc.visible=true;acs.forEach(c=>c.visible=true);pl.v=0;ais.forEach(e=>e.v=0);const a=put2(pc,pl.s,-3.4);px=a.x;pz=a.z;h=a.h;vx=vz=0;ci=Math.round(pl.s/STEP);ais.forEach((e,k)=>{e.a=put2(acs[k],e.s,aiLane(e))});
    StartGirl.update(dt,0)}
  else{
    free=false;pc.visible=true;acs.forEach(c=>c.visible=true);
    if(st==="count"){tc+=dt;setCd(tc<1?"3":tc<2?"2":tc<3?"1":"START!");if(tc>=3)startRace()}
    else{sp=physics(dt);pc.position.set(px,0,pz);pc.rotation.y=h;pc.rotation.z=-steer*Math.min(sp/80,1)*.05;
      if(now-t0>1.2&&st==="race"){const c=$("cd");if(c.firstChild)c.textContent=""}
      ais.forEach((e,k)=>{const gap=e.s-P[ci].s;e.v+=((e.spd-Math.max(-8,Math.min(8,gap*.05)))-e.v)*Math.min(1,dt*.6);e.s=Math.min(e.s+e.v*dt,P[P.length-1].s-6);e.a=put2(acs[k],e.s,aiLane(e));if(e.s>=FIN&&!e.fin)e.fin=now-t0});
      if(st==="race"&&P[ci].s>=FIN){st="done";pfin=now-t0;doneAt=now;const rank=1+ais.filter(e=>e.fin&&e.fin<pfin).length;
        $("cd").innerHTML=rank+"-oʻrin · "+pfin.toFixed(1)+" s<br><small>Qayta boshlash uchun ekranni bosing</small>"}}
    StartGirl.update(dt,P[ci].s);
    tailM.color.setHex(key.brake?0xff3a3a:0x8a0e18);
    camH+=(h-camH)*Math.min(1,dt*4);
    const CM=CAMS[camMode],bo=camMode===2&&CAR_MODELS[sel].bumper,hh=camMode===2?h:camH,dist=(bo?bo.d:CM.d)+sp*CM.v,cfx=Math.sin(hh),cfz=Math.cos(hh),
      ox=bo?Math.cos(h)*bo.x:0,oz=bo?-Math.sin(h)*bo.x:0;   // chap tomon = (cos h, -sin h)
    camera.position.set(px-cfx*dist+ox,(bo?bo.h:CM.h+sp*.004),pz-cfz*dist+oz);   // salon: tezlikda balandlik o'zgarmaydi
    camera.lookAt(px+cfx*CM.l+ox,bo?bo.ly:CM.ly,pz+cfz*CM.l+oz);
    if(camBlend<1){camBlend=Math.min(1,camBlend+dt/1.3);const bw=1-camBlend*camBlend*(3-2*camBlend);camera.position.lerp(camFrom.p,bw);camera.quaternion.slerp(camFrom.q,bw)}  // intro kamerasidan gameplay kamerasiga silliq qaytish
    const nf=camera.fov+((CM.f+(bo?Math.min(sp,85)*.015:Math.min(sp,85)*.1))-camera.fov)*Math.min(1,dt*3);if(Math.abs(nf-camera.fov)>.004){camera.fov=nf;camera.updateProjectionMatrix()}}
  if(!free){const pp=P[ci].s;let c=1;for(let k=0;k<ais.length;k++)if(ais[k].s>pp)c++;txt(elPos,c+"/"+(ais.length+1)+" · "+Math.min(100,Math.round(pp/FIN*100))+"%")}
  sunSnap();skyTick(now);if(CITY.visible){GARAGE.tick(now);lampUpdate(dt);Peds.update(dt,now)}
  spotP.position.set(px+Math.sin(h)*2,.9,pz+Math.cos(h)*2);spotT.position.set(px+Math.sin(h)*30,0,pz+Math.cos(h)*30);uiTick(dt);cull();hud(sp,dt);
  renderer.render(scene,camera);requestAnimationFrame(frame)}
CAR_MODELS.forEach((_,i)=>getCar(i));StartGirl.load(CAR_MODELS.length,lp);Folks.load(CAR_MODELS.length+1,lp);Buildings.load(CAR_MODELS.length+2,lp);setSel(0);applySize();frame();

