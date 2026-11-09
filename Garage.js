/* Garage.js — garaj binosi (yo'lning chap chetida), start maydoni (ko'k yo'lak) va darvoza.
 * O'yin garajdan boshlanadi: o'yinchi mashinani haydab start maydoniga boradi, "Chaqiriqni qabul qilish" tugmasi chiqadi.
 * Bog'liqliklar: T, HW, LINE, GAR_S, GAR_HW, at, strip, cnv, sign, roofM, P, STEP (map.js / engine.js).
 */
const GARAGE=(function(){
  const GS=GAR_S,HWd=GAR_HW,D=15,X0=HW+3.2,X1=HW+3.4+D,XC=-(X0+X1)/2;   // X0/X1: yo'l o'qidan garaj boshi/oxirigacha masofa
  const a=at(GS,0),g=new T.Group();g.position.set(a.x,0,a.z);g.rotation.y=a.h;     // lokal x = yo'lga ko'ndalang (garaj manfiy tomonda), z = yo'l bo'ylab
  const std=(c,r,m)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m||0,envMapIntensity:.4});
  const wallM=std(0x8c8f98,.92),floorM=std(0x35373f,.6,.1),topM=std(0x23252d,.9),metalM=std(0x555a66,.5,.7),redM=std(0xb3262b,.6,.2),tireM=std(0x0e0e10,.95);
  const bas=c=>new T.MeshBasicMaterial({color:c});
  const box=(w,h,d,x,y,z,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o};
  // pol (yo'l chetidan garaj ichigacha, chetlik bilan bir balandlikda) + sariq belgilar
  box(X1-X0+.4,.16,2*HWd,XC,.07,0,floorM).receiveShadow=true;
  [-1,1].forEach(sd=>box(X1-X0-3,.01,.12,XC-1,.16,sd*(HWd-1.2),bas(0xe0ac24)));
  box(.12,.01,2*HWd-2.4,-(X0+1.2),.16,0,bas(0xe0ac24));
  // devorlar va tom
  box(.5,5.6,2*HWd+.5,-(X1+.25),2.8,0,wallM);
  [-1,1].forEach(sd=>box(X1-X0+.5,5.6,.5,XC,2.8,sd*(HWd+.25),wallM));
  box(X1-X0+1.2,.4,2*HWd+1.2,XC,5.8,0,topM);
  // old tomon: to'sin (header) va "GARAJ" yozuvi, ko'tarilgan rolstavni
  box(.6,1.3,2*HWd+1.2,-X0+.1,5.15,0,wallM);
  const sg=new T.Mesh(new T.PlaneGeometry(HWd*1.7,.95),sign("GARAJ","#19e3ff"));sg.position.set(-X0+.42,5.15,0);sg.rotation.y=Math.PI/2;g.add(sg);
  box(.5,.55,2*HWd-.4,-X0-.5,4.2,0,metalM);
  // ichki yoritish va neon
  [3.5,8,12.5].forEach(d=>box(.25,.06,2*HWd-1.2,-(X0+d),5.55,0,bas(0xfff0d0)));
  box(.06,.14,HWd*1.7,-X1+.05,3.3,0,bas(0xff2e88));
  // jihozlar: shinalar, asboblar qutisi, ish stoli
  [-1,1].forEach(sd=>{for(let i=0;i<4;i++){const t=new T.Mesh(new T.CylinderGeometry(.36,.36,.24,14),tireM);t.position.set(-(X1-.9),.28+i*.24,sd*(HWd-.9));g.add(t)}});
  box(1.6,.9,.7,-(X1-.8),.6,-1.3,metalM);box(.8,.5,.5,-(X1-.8),1.3,-1.3,redM);
  // start maydoni: ko'k chevron yo'lak (animatsiyali) + darvoza
  const PAD0=LINE-44,PAD1=LINE-14;
  const c=cnv(128,128),x=c.getContext("2d");x.clearRect(0,0,128,128);
  x.fillStyle="rgba(25,227,255,.95)";x.fillRect(0,0,6,128);x.fillRect(122,0,6,128);
  x.strokeStyle="rgba(25,227,255,.95)";x.lineWidth=14;x.lineJoin="miter";x.beginPath();x.moveTo(22,100);x.lineTo(64,44);x.lineTo(106,100);x.stroke();
  const pt=new T.CanvasTexture(c);pt.wrapS=pt.wrapT=T.RepeatWrapping;pt.encoding=T.sRGBEncoding;
  const padM=new T.MeshBasicMaterial({map:pt,transparent:true,depthWrite:false,opacity:.8,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  strip(Math.round(PAD0/STEP),Math.round(PAD1/STEP),-HW+.3,HW-.3,.05,padM,6);
  const ga=at(PAD0,0),gg=new T.Group();gg.position.set(ga.x,0,ga.z);gg.rotation.y=ga.h;
  for(const sd of[-1,1]){const p=new T.Mesh(new T.CylinderGeometry(.35,.35,9,8),roofM);p.position.set(sd*(HW+1.2),4.5,0);gg.add(p)}
  const gb=new T.Mesh(new T.BoxGeometry(2*HW+3,2.6,.5),sign("POYGA MAYDONI","#19e3ff"));gb.position.y=9.6;gg.add(gb);
  scene.add(g,gg);
  const sp=at(GS,-18.5);
  return{s:GS,hw:HWd,depth:X1-2.6,PAD0,PAD1,spawn:{x:sp.x,z:sp.z,h:a.h+Math.PI/2},
    tick(now){pt.offset.y=-(now*.45)%1;padM.opacity=.55+.3*Math.sin(now*3)}};
})();
