// ---- Xarita: keskin burilishli ho'l asfalt yo'l, ko'lmaklar, binolar ----
let HW=8,LINE=153;   // let: xarita almashganda Maps.js o'zgartiradi
const CITY=new T.Group();scene.add(CITY);   // eski shahar xaritasining BARCHA obyektlari shu guruhda (boshqa xarita tanlansa butunlay yashiriladi)
const GAR_S=60,GAR_HW=7;   // garaj: yo'l bo'ylab joyi (s, metr) va yarim kengligi — Garage.js shuni ishlatadi
const CP=[[0,-100],[0,100],[0,300],[40,380],[200,400],[330,470],[340,620],[250,700],[120,690],[60,780],[90,900],[230,950],[330,1050],[320,1200],[200,1270],[60,1260],[-30,1350],[-20,1480],[100,1560],[260,1580]].map(a=>new T.Vector3(a[0],0,a[1]));
const curve=new T.CatmullRomCurve3(CP,false,"centripetal"),n0=Math.round(curve.getLength()/3);let STEP=curve.getLength()/n0;
const P=curve.getSpacedPoints(n0).map((v,i,a)=>{const q=a[Math.min(i+1,a.length-1)],p=a[Math.max(i-1,0)];let tx=q.x-p.x,tz=q.z-p.z;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;return{x:v.x,z:v.z,tx,tz,nx:tz,nz:-tx,s:i*STEP,h:Math.atan2(tx,tz)}});
let FIN=P[P.length-1].s-30;
function at(s,off){const f=Math.max(0,Math.min(P.length-1.001,s/STEP)),i=f|0,t=f-i,a=P[i],b=P[i+1],nx=a.nx+(b.nx-a.nx)*t,nz=a.nz+(b.nz-a.nz)*t;
  return{x:a.x+(b.x-a.x)*t+nx*off,z:a.z+(b.z-a.z)*t+nz*off,h:Math.atan2(a.tx+(b.tx-a.tx)*t,a.tz+(b.tz-a.tz)*t)}}
function nearIdx(i,x,z){let b=1e12,r=i;for(let k=Math.max(0,i-10);k<=Math.min(P.length-1,i+14);k++){const d=(P[k].x-x)**2+(P[k].z-z)**2;if(d<b){b=d;r=k}}return r}
const RCH=[],CH=40;   // yo'l lentalari ~120 m li bo'laklarga bo'lingan: kamera ko'rmagan (frustum) va uzoq/ortda qolgan bo'laklar chizilmaydi (game.js cull)
function chunkMesh(a,b,mat,fill){const pos=[],uv=[],nm=[],idx=[];
  for(let i=a;i<=b;i++){fill(P[i],pos,uv,nm);if(i>a){const k=2*(i-a);idx.push(k-2,k,k-1,k-1,k,k+1)}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.setAttribute("normal",new T.Float32BufferAttribute(nm,3));g.setIndex(idx);
  const m=new T.Mesh(g,mat);m.receiveShadow=true;RCH.push({m,x:(P[a].x+P[b].x)/2,z:(P[a].z+P[b].z)/2});CITY.add(m);return m}
function ribbon(o1,o2,y,mat,uk){
  for(let a=0;a<P.length-1;a+=CH)chunkMesh(a,Math.min(P.length-1,a+CH),mat,(p,pos,uv,nm)=>{pos.push(p.x+p.nx*o1,y,p.z+p.nz*o1,p.x+p.nx*o2,y,p.z+p.nz*o2);uv.push(0,p.s*uk,1,p.s*uk);nm.push(0,1,0,0,1,0)})}
// yo'lning faqat bir qismi (i0..i1) uchun lenta — zebra kabi belgilar (decal)
function strip(i0,i1,o1,o2,y,mat,vlen){const pos=[],uv=[],nm=[],idx=[];
  for(let i=i0;i<=i1;i++){const p=P[i],v=(p.s-P[i0].s)/vlen;pos.push(p.x+p.nx*o1,y,p.z+p.nz*o1,p.x+p.nx*o2,y,p.z+p.nz*o2);uv.push(0,v,1,v);nm.push(0,1,0,0,1,0);if(i>i0){const k=2*(i-i0);idx.push(k-2,k,k-1,k-1,k,k+1)}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.setAttribute("normal",new T.Float32BufferAttribute(nm,3));g.setIndex(idx);
  const m=new T.Mesh(g,mat);m.receiveShadow=true;m.renderOrder=1;CITY.add(m);return m}
// vertikal devor (bordyur yuzi): y0..y1 balandlikda, yo'l o'qidan off masofada
function wall(off,y0,y1,mat,uk){
  for(let a=0;a<P.length-1;a+=CH)chunkMesh(a,Math.min(P.length-1,a+CH),mat,(p,pos,uv,nm)=>{pos.push(p.x+p.nx*off,y0,p.z+p.nz*off,p.x+p.nx*off,y1,p.z+p.nz*off);uv.push(p.s*uk,0,p.s*uk,1);nm.push(p.nx,0,p.nz,p.nx,0,p.nz)})}
const cnv=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
const tex=(c,rep)=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=ANISO;if(rep)t.encoding=T.sRGBEncoding;return t};
const angD=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
const turn=i=>angD(P[Math.max(0,i-6)].h,P[Math.min(P.length-1,i+6)].h);   // yo'lning burilish burchagi (rad, ±6 nuqta oralig'ida)

// ===== ASFALT: donadorlik, yoriqlar, yamoqlar, g'ildirak izlari, moy dog'lari, chang, kanalizatsiya lyuklari, so'nggan chiziqlar =====
// Tekstura 1024x2048 (64 px/m, 16x32 m), tekis takrorlanadi (hamma shakl chetdan o'tsa qarama-qarshi tomonda davom etadi)
const ROAD=(function(){const W=1024,H=2048,c=cnv(W,H),x=c.getContext("2d"),r=cnv(W,H),y=r.getContext("2d"),PX=W/16,U=o=>(.5+o/16)*W;
  const wr=(px,py,ex,fn)=>{for(const ox of[-W,0,W])for(const oy of[-H,0,H]){const X=px+ox,Y=py+oy;if(X>-ex&&X<W+ex&&Y>-ex&&Y<H+ex)fn(X,Y)}};
  x.fillStyle="rgb(54,55,60)";x.fillRect(0,0,W,H);y.fillStyle="rgb(0,150,0)";y.fillRect(0,0,W,H);
  // turli partiya asfalt: katta yumshoq ohang farqlari
  for(let i=0;i<70;i++){const px=rnd()*W,py=rnd()*H,rr=60+rnd()*220,lt=rnd()<.5;
    wr(px,py,rr,(X,Y)=>{const g=x.createRadialGradient(X,Y,0,X,Y,rr);g.addColorStop(0,lt?"rgba(120,120,128,.10)":"rgba(0,0,0,.14)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.fillRect(X-rr,Y-rr,rr*2,rr*2)})}
  // mayda tosh (shag'al) donalari
  for(let i=0;i<90000;i++){const v=rnd(),sz=1+rnd()*2.2;
    x.fillStyle=v<.45?"rgba(0,0,0,"+(.12+rnd()*.35)+")":v<.9?"rgba("+(150+rnd()*60|0)+","+(150+rnd()*60|0)+","+(155+rnd()*60|0)+","+(.08+rnd()*.3)+")":"rgba(170,150,130,"+(.1+rnd()*.25)+")";
    x.fillRect(rnd()*W,rnd()*H,sz,sz)}
  // ta'mirlangan yamoqlar (to'rtburchak, chetida kesim chizig'i)
  for(let i=0;i<7;i++){const px=rnd()*(W-300)+80,py=rnd()*H,w=90+rnd()*220,hh=120+rnd()*320;
    wr(px,py,400,(X,Y)=>{x.fillStyle="rgba(14,14,18,"+(.25+rnd()*.15)+")";x.fillRect(X,Y,w,hh);y.fillStyle="rgb(0,188,0)";y.fillRect(X,Y,w,hh);
      x.strokeStyle="rgba(2,2,3,.75)";x.lineWidth=2.5;x.strokeRect(X,Y,w,hh);y.strokeStyle="rgb(0,55,0)";y.lineWidth=3;y.strokeRect(X,Y,w,hh)})}
  // g'ildirak izlari (har yo'lakda ikki g'ildirak): sayqallangan, qoraygan, silliqroq
  for(const o of[-4.15,-2.45,2.45,4.15]){const cx=U(o),hw=.45*PX;
    let g=x.createLinearGradient(cx-hw,0,cx+hw,0);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(.5,"rgba(0,0,0,.28)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.fillRect(cx-hw,0,hw*2,H);
    g=y.createLinearGradient(cx-hw,0,cx+hw,0);g.addColorStop(0,"rgba(0,60,0,0)");g.addColorStop(.5,"rgba(0,60,0,.75)");g.addColorStop(1,"rgba(0,60,0,0)");y.fillStyle=g;y.fillRect(cx-hw,0,hw*2,H)}
  // moy va rezina dog'lari
  for(let i=0;i<44;i++){const px=U((rnd()<.5?-1:1)*(3.3+(rnd()-.5)*2.4)),py=rnd()*H,rx=14+rnd()*30,ry=rx*(1.5+rnd()*3);
    wr(px,py,ry*2,(X,Y)=>{x.save();x.translate(X,Y);x.scale(1,ry/rx);const g=x.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,"rgba(4,4,6,.42)");g.addColorStop(1,"rgba(4,4,6,0)");x.fillStyle=g;x.fillRect(-rx,-rx,rx*2,rx*2);
      y.save();y.translate(X,Y);y.scale(1,ry/rx);const q=y.createRadialGradient(0,0,0,0,0,rx);q.addColorStop(0,"rgba(0,80,0,.7)");q.addColorStop(1,"rgba(0,80,0,0)");y.fillStyle=q;y.fillRect(-rx,-rx,rx*2,rx*2);y.restore();x.restore()})}
  // yoriqlar (shoxlanadi); jilolangan kesim chiziqlari (glossy tar)
  function crack(px,py,a,len,w,al,gl){const pts=[[px,py]],br=[];let qx=px,qy=py,qa=a;
    for(let i=0;i<len;i++){qa+=(rnd()-.5)*.35;qx+=Math.cos(qa)*2.5;qy+=Math.sin(qa)*2.5;pts.push([qx,qy]);if(w>.6&&i>8&&rnd()<.03)br.push([qx,qy,qa+(rnd()<.5?1:-1)*(.4+rnd()*.6),len*.4|0,w*.6])}
    for(const ox of[-W,0,W])for(const oy of[-H,0,H]){
      for(const pass of[0,1]){x.lineCap="round";x.lineWidth=pass?w:w+2;x.strokeStyle=pass?"rgba(6,6,8,"+al+")":"rgba(140,142,150,"+al*.12+")";x.beginPath();pts.forEach((q,k)=>k?x.lineTo(q[0]+ox,q[1]+oy):x.moveTo(q[0]+ox,q[1]+oy));x.stroke()}
      y.lineCap="round";y.lineWidth=w+1;y.strokeStyle=gl?"rgb(0,60,0)":"rgb(0,205,0)";y.beginPath();pts.forEach((q,k)=>k?y.lineTo(q[0]+ox,q[1]+oy):y.moveTo(q[0]+ox,q[1]+oy));y.stroke()}
    br.forEach(b=>crack(b[0],b[1],b[2],b[3],b[4],al,gl))}
  for(let i=0;i<16;i++)crack(rnd()*W,rnd()*H,1.57+(rnd()-.5)*1.3,70+rnd()*150|0,.8+rnd()*1.1,.5+rnd()*.3,false);
  for(let i=0;i<70;i++)crack(rnd()*W,rnd()*H,rnd()*6.28,12+rnd()*34|0,.6,.4,false);
  for(let i=0;i<5;i++)crack(rnd()*W,rnd()*H,1.57+(rnd()-.5)*.2,150+rnd()*160|0,2.6,.7,true);
  // ko'ndalang kengayish choklari (yo'lni kesib o'tadi)
  for(let k=0;k<3;k++){const yy=rnd()*H;x.strokeStyle="rgba(4,4,6,.65)";x.lineWidth=3;y.strokeStyle="rgb(0,70,0)";y.lineWidth=4;x.beginPath();y.beginPath();x.moveTo(0,yy);y.moveTo(0,yy);
    for(let xx=20;xx<=W;xx+=20){const j=yy+(rnd()-.5)*3;x.lineTo(xx,j);y.lineTo(xx,j)}x.stroke();y.stroke()}
  // yomg'irdan keyingi ko'lmaklar: g'ildirak izlari chuqurligida cho'ziq, oyna kabi silliq
  const pud=(px,py,rx,ry,rot)=>wr(px,py,Math.max(rx,ry)+4,(X,Y)=>{x.fillStyle="rgba(8,9,14,.5)";x.beginPath();x.ellipse(X,Y,rx,ry,rot,0,6.2832);x.fill();y.fillStyle="rgb(0,12,0)";y.beginPath();y.ellipse(X,Y,rx,ry,rot,0,6.2832);y.fill()});
  for(let i=0;i<20;i++){const o=[-4.15,-2.45,2.45,4.15][rnd()*4|0],px=U(o),py=rnd()*H,n=3+(rnd()*4|0);
    for(let k=0;k<n;k++)pud(px+(rnd()-.5)*6,py+k*(30+rnd()*30),9+rnd()*11,24+rnd()*34,(rnd()-.5)*.14)}
  for(let i=0;i<12;i++)pud(rnd()*W,rnd()*H,16+rnd()*36,12+rnd()*28,rnd()*3.14);
  // chiziqlar: chetki yaxlit oq, markaziy uzuq sariq; eskirgan (bo'yoq uvalangan)
  const lineX=[U(-7.45),U(7.45),U(0)],paint=(px,py,w,hh,col)=>{x.fillStyle=col;x.fillRect(px,py,w,hh);y.fillStyle="rgb(0,175,0)";y.fillRect(px,py,w,hh)};
  paint(lineX[0]-6,0,12,H,"rgba(228,228,224,.88)");paint(lineX[1]-6,0,12,H,"rgba(228,228,224,.88)");
  for(let yy=0;yy<H;yy+=512)paint(lineX[2]-6,yy,12,256,"rgba(224,172,36,.9)");
  for(let i=0;i<900;i++){const lx=lineX[rnd()*3|0];x.fillStyle="rgba(54,55,60,"+(.35+rnd()*.55)+")";x.fillRect(lx-6.5,rnd()*H,13,3+rnd()*46)}
  for(let i=0;i<260;i++){const lx=lineX[rnd()*3|0];x.fillStyle="rgba(8,8,10,"+(.1+rnd()*.18)+")";x.fillRect(lx-7,rnd()*H,14,10+rnd()*80)}
  // kanalizatsiya lyuklari (yo'lak markazida) va yomg'ir suv qabul qilgichlari (bordyur yonida)
  for(let i=0;i<3;i++){const px=U((i%2?-1:1)*3.3)+(rnd()-.5)*50,py=rnd()*H;
    wr(px,py,40,(X,Y)=>{x.fillStyle="rgb(36,36,40)";x.beginPath();x.arc(X,Y,24,0,6.2832);x.fill();x.strokeStyle="rgba(10,10,12,.9)";x.lineWidth=4;x.stroke();
      x.strokeStyle="rgba(110,112,118,.35)";x.lineWidth=2;x.beginPath();x.arc(X,Y,17,0,6.2832);x.stroke();
      for(let k=-3;k<=3;k++){x.beginPath();x.moveTo(X-14,Y+k*4.5);x.lineTo(X+14,Y+k*4.5);x.stroke()}
      y.fillStyle="rgb(0,95,0)";y.beginPath();y.arc(X,Y,24,0,6.2832);y.fill()})}
  for(const sd of[-1,1])for(let i=0;i<3;i++){const px=U(sd*7.78),py=rnd()*H;
    wr(px,py,70,(X,Y)=>{x.fillStyle="rgb(18,18,20)";x.fillRect(X-14,Y-55,28,110);x.fillStyle="rgba(100,102,108,.5)";for(let k=0;k<9;k++)x.fillRect(X-14,Y-52+k*12,28,3.5);y.fillStyle="rgb(0,120,0)";y.fillRect(X-14,Y-55,28,110)})}
  // yo'l chetida to'plangan chang va mayda shag'al
  for(const [x0,x1] of[[0,30],[W,W-30]]){let g=x.createLinearGradient(x0,0,x1,0);g.addColorStop(0,"rgba(150,138,118,.4)");g.addColorStop(1,"rgba(150,138,118,0)");x.fillStyle=g;x.fillRect(Math.min(x0,x1),0,30,H);
    g=y.createLinearGradient(x0,0,x1,0);g.addColorStop(0,"rgba(0,215,0,.9)");g.addColorStop(1,"rgba(0,215,0,0)");y.fillStyle=g;y.fillRect(Math.min(x0,x1),0,30,H)}
  const dn=k=>{if(!MOBILE)return k;const d=cnv(512,1024),q=d.getContext("2d");q.imageSmoothingQuality="high";q.drawImage(k,0,0,512,1024);return d};   // mobil: GPU xotirasi 4x kam (RNG ketma-ketligi o'zgarmaydi)
  const ct=tex(dn(c),1),m=new T.MeshStandardMaterial({map:ct,roughnessMap:tex(dn(r)),roughness:1,metalness:0,envMapIntensity:1.5,bumpMap:ct,bumpScale:.7});
  // yaqin masofada: dunyo koordinatasidagi mayda donadorlik — rang, g'adir-budurlik va normal (bump) ga ta'sir qiladi
  if(!MOBILE)m.onBeforeCompile=sh=>{
    sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vRW;").replace("#include <begin_vertex>","#include <begin_vertex>\nvRW=(modelMatrix*vec4(transformed,1.0)).xyz;");
    sh.fragmentShader=sh.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vRW;
float rh(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float rn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(rh(i),rh(i+vec2(1.0,0.0)),f.x),mix(rh(i+vec2(0.0,1.0)),rh(i+vec2(1.0,1.0)),f.x),f.y);}
float grain(vec2 p){return rn(p*38.0)*0.5+rn(p*91.0)*0.3+rn(p*213.0)*0.2;}
vec3 perturbN(vec3 sp,vec3 sn,vec2 dH){vec3 sx=dFdx(sp),sy=dFdy(sp);vec3 R1=cross(sy,sn),R2=cross(sn,sx);float fDet=dot(sx,R1);vec3 g=sign(fDet)*(dH.x*R1+dH.y*R2);return normalize(abs(fDet)*sn-g);}`)
    .replace("#include <map_fragment>",`#include <map_fragment>
float gw=clamp(1.0-length(vViewPosition)/22.0,0.0,1.0);float gv=0.5;if(gw>0.0)gv=grain(mod(vRW.xz,64.0));
diffuseColor.rgb*=1.0+(gv-0.5)*0.9*gw;`)
    .replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor+(gv-0.5)*0.3*gw,0.03,1.0);`)
    .replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
float gh=gv*gw;
normal=perturbN(-vViewPosition,normal,vec2(dFdx(gh),dFdy(gh))*0.004);`)};
  return m})();
ribbon(-HW,HW,.03,ROAD,1/32);

// ===== BORDYUR (beton), TROTUAR (plitka), MAYSAZOR, YER =====
const CURB=(function(){const c=cnv(128,128),x=c.getContext("2d");x.fillStyle="rgb(150,148,142)";x.fillRect(0,0,128,128);
  for(let i=0;i<2500;i++){x.fillStyle=rnd()<.5?"rgba(0,0,0,"+rnd()*.14+")":"rgba(255,255,255,"+rnd()*.12+")";x.fillRect(rnd()*128,rnd()*128,1+rnd()*2,1+rnd()*2)}
  x.fillStyle="rgba(0,0,0,.35)";x.fillRect(0,0,2,128);x.fillRect(126,0,2,128);   // bordyur bo'laklari tutashuvi
  for(let i=0;i<30;i++){x.fillStyle="rgba(30,28,24,"+rnd()*.25+")";x.fillRect(rnd()*128,rnd()*128,2+rnd()*10,1+rnd()*3)}
  const t=tex(c,1);return new T.MeshStandardMaterial({map:t,bumpMap:MOBILE?null:t,bumpScale:1,roughness:.9,side:T.DoubleSide,envMapIntensity:.5})})();
const SIDE=(function(){const W=256,H=512,c=cnv(W,H),x=c.getContext("2d");x.fillStyle="rgb(58,56,54)";x.fillRect(0,0,W,H);
  for(let r=0;r<8;r++)for(let q=0;q<4;q++){const v=(rnd()-.5)*26;x.fillStyle="rgb("+(122+v+(rnd()<.3?8:0)|0)+","+(119+v|0)+","+(114+v-(rnd()<.3?6:0)|0)+")";x.fillRect(q*64+2,r*64+2,60,60)}
  for(let i=0;i<9000;i++){x.fillStyle=rnd()<.5?"rgba(0,0,0,"+rnd()*.16+")":"rgba(255,255,255,"+rnd()*.12+")";x.fillRect(rnd()*W,rnd()*H,1+rnd()*2,1+rnd()*2)}
  for(let i=0;i<26;i++){x.fillStyle="rgba(20,18,16,"+(.15+rnd()*.25)+")";x.beginPath();x.arc(rnd()*W,rnd()*H,1+rnd()*3,0,6.28);x.fill()}   // saqich/dog'lar
  for(let i=0;i<10;i++){x.strokeStyle="rgba(20,20,22,.55)";x.lineWidth=1;x.beginPath();let qx=rnd()*W,qy=rnd()*H;x.moveTo(qx,qy);for(let k=0;k<14;k++){qx+=(rnd()-.5)*8;qy+=rnd()*7;x.lineTo(qx,qy)}x.stroke()}
  const t=tex(c,1);return new T.MeshStandardMaterial({map:t,bumpMap:MOBILE?null:t,bumpScale:1.2,roughness:.85,envMapIntensity:.6})})();
const GRASS=(function(){const S=256,c=cnv(S,S),x=c.getContext("2d");x.fillStyle="rgb(56,64,32)";x.fillRect(0,0,S,S);
  for(let i=0;i<40;i++){const px=rnd()*S,py=rnd()*S,rr=20+rnd()*50,dirt=rnd()<.3;
    for(const ox of[-S,0,S])for(const oy of[-S,0,S]){const X=px+ox,Y=py+oy;if(X<-rr||X>S+rr||Y<-rr||Y>S+rr)continue;const g=x.createRadialGradient(X,Y,0,X,Y,rr);g.addColorStop(0,dirt?"rgba(96,80,52,.35)":rnd()<.5?"rgba(90,100,40,.25)":"rgba(30,44,22,.28)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.fillRect(X-rr,Y-rr,rr*2,rr*2)}}
  for(let i=0;i<11000;i++){const px=rnd()*S,py=rnd()*S,a=rnd()*6.28,l=2+rnd()*5;x.strokeStyle="rgba("+(40+rnd()*60|0)+","+(60+rnd()*70|0)+","+(20+rnd()*30|0)+","+(.35+rnd()*.5)+")";x.lineWidth=1;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
  for(let i=0;i<120;i++){x.fillStyle="rgba("+(200+rnd()*50|0)+","+(190+rnd()*50|0)+",90,.75)";x.fillRect(rnd()*S,rnd()*S,1.5,1.5)}   // mayda gullar
  const t=tex(c,1);return new T.MeshStandardMaterial({map:t,bumpMap:MOBILE?null:t,bumpScale:1.5,roughness:1,envMapIntensity:.35})})();
const FIELD=(function(){const S=512,c=cnv(S,S),x=c.getContext("2d");x.fillStyle="rgb(62,62,38)";x.fillRect(0,0,S,S);
  for(let i=0;i<60;i++){const px=rnd()*S,py=rnd()*S,rr=30+rnd()*90;for(const ox of[-S,0,S])for(const oy of[-S,0,S]){const X=px+ox,Y=py+oy;if(X<-rr||X>S+rr||Y<-rr||Y>S+rr)continue;const g=x.createRadialGradient(X,Y,0,X,Y,rr);g.addColorStop(0,rnd()<.5?"rgba(86,76,46,.22)":"rgba(40,52,28,.22)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.fillRect(X-rr,Y-rr,rr*2,rr*2)}}
  for(let i=0;i<14000;i++){x.fillStyle="rgba("+(50+rnd()*50|0)+","+(55+rnd()*45|0)+","+(25+rnd()*25|0)+","+(.2+rnd()*.4)+")";x.fillRect(rnd()*S,rnd()*S,1+rnd()*2,1+rnd()*3)}
  const t=tex(c,1);t.repeat.set(250,250);return MOBILE?new T.MeshLambertMaterial({map:t}):new T.MeshStandardMaterial({map:t,roughness:1,envMapIntensity:.3})})();
// bordyur yuzlari + trotuar + maysazor (ikkala tomonda)
wall(HW,.03,.14,CURB,1/4);wall(-HW,.03,.14,CURB,1/4);wall(HW+3.2,0,.14,CURB,1/4);wall(-HW-3.2,0,.14,CURB,1/4);
ribbon(HW,HW+3.2,.14,SIDE,1/6.4);ribbon(-HW-3.2,-HW,.14,SIDE,1/6.4);
ribbon(HW+3.2,HW+11,.02,GRASS,1/8);ribbon(-HW-11,-HW-3.2,.02,GRASS,1/8);
const ground=new T.Mesh(new T.PlaneGeometry(8000,8000),FIELD);ground.rotation.x=-Math.PI/2;ground.position.y=-.35;ground.receiveShadow=true;CITY.add(ground);
const LAMPS=[];   // game.js to'qnashuvni shu ro'yxatdan tekshiradi
// haqiqiy ko'cha chiroqlari: egilgan qo'l, korpus, linza, yorug' halo va yo'ldagi yorug' dog'
(function(){const n=Math.floor(P.length/8)*2,dm=new T.Object3D(),mt=new T.MeshStandardMaterial({color:0x3a3d46,metalness:.7,roughness:.45}),
  poleI=new T.InstancedMesh(new T.CylinderGeometry(.09,.15,9,8),mt,n),armI=new T.InstancedMesh(new T.BoxGeometry(3.2,.14,.14),mt,n),headI=new T.InstancedMesh(new T.BoxGeometry(1.3,.22,.55),mt,n);
  const lg=new T.PlaneGeometry(1.1,.4);lg.rotateX(Math.PI/2);const lensI=new T.InstancedMesh(lg,new T.MeshBasicMaterial({color:0xffc678,side:T.DoubleSide}),n);
  const c=cnv(128,128),x=c.getContext("2d"),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,"rgba(255,185,90,.5)");g.addColorStop(1,"rgba(255,185,90,0)");x.fillStyle=g;x.fillRect(0,0,128,128);
  const gt=new T.CanvasTexture(c),pg=new T.PlaneGeometry(18,12);pg.rotateX(-Math.PI/2);const poolI=new T.InstancedMesh(pg,new T.MeshBasicMaterial({map:gt,opacity:.7,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),n);
  const hp=[];let k=0;
  for(let i=4;i<P.length-4&&k<n;i+=8){const p=P[i];for(const sd of[-1,1]){if(k>=n)break;const bx=p.x+p.nx*sd*(HW+2.4),bz=p.z+p.nz*sd*(HW+2.4),ry=p.h+(sd>0?Math.PI:0),dx=Math.cos(ry),dz=-Math.sin(ry);
    const put=(im,ox,y,oy)=>{dm.position.set(bx+dx*ox,y,bz+dz*ox);dm.rotation.set(0,ry,0);dm.updateMatrix();im.setMatrixAt(k,dm.matrix)};
    dm.position.set(bx,4.5,bz);dm.rotation.set(0,0,0);dm.updateMatrix();poleI.setMatrixAt(k,dm.matrix);
    put(armI,1.6,9.0);put(headI,3.1,8.95);put(lensI,3.1,8.8);put(poolI,3.1,.09);hp.push(bx+dx*3.1,8.7,bz+dz*3.1);LAMPS.push({bx,bz,ry,dx,dz,k,i,st:0,ang:0,om:0,fx:0,fz:1,bn:0});k++}}
  [poleI,armI,headI,lensI,poolI].forEach(m=>{m.count=k;m.frustumCulled=false;CITY.add(m)});
  const IMS=[poleI,armI,headI,lensI,poolI],MAS=IMS.map(m=>m.instanceMatrix.array.slice()),NL=k;   // MAS: har chiroq uchun asosiy matritsalar (faqat oynadagilari GPU ga yoziladi)
  let w0=-1,w1=-1,lDirty=true;
  const hg=new T.BufferGeometry();hg.setAttribute("position",new T.Float32BufferAttribute(hp,3));
  const HPM=new Float32Array(hp);
  const halo=new T.Points(hg,new T.PointsMaterial({size:MOBILE?6:9,map:gt,opacity:.6,transparent:true,blending:T.AdditiveBlending,depthWrite:false,color:0xffd29a}));halo.frustumCulled=false;CITY.add(halo);
  // --- yiqilish animatsiyasi: chiroq butun holda taglik atrofida aylanib yiqiladi, linza/halo/yorug' dog' o'chadi ---
  const AX=new T.Vector3(),B=new T.Matrix4(),M=new T.Matrix4(),Z=new T.Matrix4().makeScale(0,0,0),hpA=hg.attributes.position,fall=[];
  function pose(l){AX.set(l.fz,0,-l.fx);B.makeRotationAxis(AX,l.ang);B.setPosition(l.bx,.1*Math.sin(Math.min(l.ang,1.5)),l.bz);
    const put=(ii,ox,y,rot)=>{dm.position.set(rot?l.dx*ox:0,y,rot?l.dz*ox:0);dm.rotation.set(0,rot?l.ry:0,0);dm.updateMatrix();M.multiplyMatrices(B,dm.matrix);M.toArray(MAS[ii],l.k*16)};
    put(0,0,4.5,0);put(1,1.6,9.0,1);put(2,3.1,8.95,1);lDirty=true}
  globalThis.lampKnock=(l,fx,fz,om)=>{l.st=1;l.fx=fx;l.fz=fz;l.om=om;l.ang=.001;l.bn=0;
    Z.toArray(MAS[3],l.k*16);Z.toArray(MAS[4],l.k*16);HPM[l.k*3]=0;HPM[l.k*3+1]=-500;HPM[l.k*3+2]=0;lDirty=true;fall.push(l)};
  // CHIROQLAR OYNASI: faqat mashina ortida `behind` va oldida `ahead` yo'l nuqtasi ichidagi chiroqlar chiziladi (ortda qolgan va juda uzoqdagilar umuman chizilmaydi).
  // Chiroqlar yo'l indeksi bo'yicha tartiblangan (k -> i = 4 + 8*(k>>1)), shuning uchun oyna doim bitta uzluksiz oraliq.
  globalThis.lampWindow=(ci,behind,ahead)=>{
    const lo=Math.min(NL,Math.max(0,2*Math.ceil((ci-behind-4)/8))),hi=Math.max(lo,Math.min(NL,2*(Math.floor((ci+ahead-4)/8)+1)));
    if(lo===w0&&hi===w1&&!lDirty)return;
    w0=lo;w1=hi;lDirty=false;const c=hi-lo;
    for(let q=0;q<5;q++){const im=IMS[q];im.instanceMatrix.array.set(MAS[q].subarray(lo*16,hi*16));im.count=c;im.instanceMatrix.needsUpdate=true}
    hpA.array.set(HPM.subarray(lo*3,hi*3));hpA.needsUpdate=true;hg.setDrawRange(0,c)};
  globalThis.lampUpdate=dt=>{for(let i=fall.length-1;i>=0;i--){const l=fall[i];
    l.om+=3.0*(Math.sin(l.ang)+.12)*dt;l.ang+=l.om*dt;
    if(l.ang>=1.5){l.ang=1.5;if(l.om>.8&&typeof lampLand==="function")lampLand(Math.min(1,l.om/4));l.om=-l.om*.28;l.bn++;
      if(l.bn>=3||Math.abs(l.om)<.35){l.st=2;pose(l);fall.splice(i,1);continue}}
    pose(l)}}
})();
function arch(s,txt,col){const a=at(s,0),g=new T.Group();g.position.set(a.x,0,a.z);g.rotation.y=a.h;
  for(const sd of[-1,1]){const p=new T.Mesh(new T.CylinderGeometry(.35,.35,9,8),roofM);p.position.set(sd*(HW+1.2),4.5,0);g.add(p)}
  const b=new T.Mesh(new T.BoxGeometry(2*HW+3,2.6,.5),sign(txt,col));b.position.y=9.6;g.add(b);
  const cc=cnv(128,16),cx=cc.getContext("2d");for(let i=0;i<16;i++)for(let j=0;j<2;j++){cx.fillStyle=(i+j)%2?"#fff":"#111";cx.fillRect(i*8,j*8,8,8)}
  const pg=new T.PlaneGeometry(2*HW,2);pg.rotateX(-Math.PI/2);const l=new T.Mesh(pg,new T.MeshBasicMaterial({map:new T.CanvasTexture(cc)}));l.position.y=.06;g.add(l);CITY.add(g)}
arch(LINE,"START","#19e3ff");arch(FIN,"FINISH","#ff2e88");
const ZEBRAS=[];   // zebra o'tish joylarining yo'l bo'ylab joyi (s, metr) — Peds.js shu yerdan odamlarni o'tkazadi
// ===== ZEBRA o'tish joylari (faqat to'g'ri qismlarda, eskirgan bo'yoq) =====
(function(){const c=cnv(512,64),x=c.getContext("2d");x.fillStyle="rgba(235,235,230,.92)";for(let i=0;i<15;i++)x.fillRect(i*34+1,0,17,64);
  for(let i=0;i<420;i++)x.clearRect(rnd()*512,rnd()*64,2+rnd()*10,2+rnd()*12);
  for(let i=0;i<300;i++){x.fillStyle="rgba(60,60,64,"+rnd()*.25+")";x.fillRect(rnd()*512,rnd()*64,3+rnd()*14,2+rnd()*8)}
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=ANISO;
  const zm=new T.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:.7,envMapIntensity:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  let next=150+rnd()*60;
  for(let i=20;i<P.length-12;i++){const s0=P[i].s;if(s0<next)continue;
    if(Math.abs(s0-LINE)<30||Math.abs(s0-FIN)<30||Math.abs(turn(i))>.03||Math.abs(turn(i+3))>.03)continue;
    strip(i,i+1,-HW+.6,HW-.6,.045,zm,P[i+1].s-P[i].s);ZEBRAS.push(s0);next=s0+170+rnd()*130}})();

// ===== KESKIN BURILISHLARDA CHEVRON (strelka) BELGILARI — burilishning tashqi tomonida =====
(function(){const mkT=flip=>{const c=cnv(256,128),x=c.getContext("2d");x.fillStyle="#101010";x.fillRect(0,0,256,128);x.fillStyle="#f3c20f";x.fillRect(6,6,244,116);
    if(flip){x.translate(256,0);x.scale(-1,1)}
    x.strokeStyle="#101010";x.lineWidth=18;x.lineJoin="miter";x.lineCap="butt";
    for(let k=0;k<2;k++){x.beginPath();x.moveTo(62+k*70,26);x.lineTo(112+k*70,64);x.lineTo(62+k*70,102);x.stroke()}
    const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=ANISO;
    return new T.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.18,roughness:.5,envMapIntensity:.8})};
  const MR=mkT(false),ML=mkT(true),plate=new T.PlaneGeometry(2.0,1.0),pole=new T.CylinderGeometry(.05,.05,2.4,6),pm=new T.MeshStandardMaterial({color:0x777a82,metalness:.6,roughness:.5});
  for(let i=10;i<P.length-10;i++){if(i%6!==2)continue;const t=turn(i);if(Math.abs(t)<.38)continue;
    const p=P[i],sd=t>0?-1:1,off=sd*(HW+4.6),g=new T.Group();g.position.set(p.x+p.nx*off,0,p.z+p.nz*off);g.rotation.y=p.h+Math.PI;
    const pl=new T.Mesh(plate,t>0?ML:MR);pl.position.y=1.9;pl.castShadow=false;const po=new T.Mesh(pole,pm);po.position.set(0,1.2,-.06);po.castShadow=false;
    g.add(pl,po);CITY.add(g)}})();

// (daraxtlar olib tashlandi)

// binolar: kam, yo'l bo'ylab, pastki qavatda yoritilgan do'konlar
const SF=[0,1,2,3].map(()=>{const c=cnv(256,64),x=c.getContext("2d");x.fillStyle="#0c0d12";x.fillRect(0,0,256,64);
  for(let i=0;i<5;i++){const w=36+rnd()*14,xx=i*50+4;x.fillStyle=pick(["#ffd27a","#bfe6ff","#ff9a5a","#c8ffd9"]);x.globalAlpha=.55+rnd()*.4;x.fillRect(xx,12,w,40);x.globalAlpha=1;x.fillStyle="#0c0d12";x.fillRect(xx+w/2-1,12,2,40)}
  x.fillStyle=pick(["#ff2e88","#19e3ff","#ffa63d"]);x.fillRect(0,2,256,5);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return new T.MeshBasicMaterial({map:t})});
function freeSpot(x,z,i){for(let k=0;k<P.length;k+=2){if(Math.abs(k-i)<40)continue;if((P[k].x-x)**2+(P[k].z-z)**2<900)return false}return true}
const blocks=[];
for(let i=12;i<P.length-8;i+=18){const p=P[i];
  for(const sd of[-1,1]){if(rnd()<.2)continue;const w=17+rnd()*6,d=17+rnd()*4,off=sd*(HW+10+w/2+rnd()*3);
    if(sd===-1&&Math.abs(p.s-GAR_S)<32)continue;   // garaj turgan joyda bino qurilmaydi
    if(!freeSpot(p.x+p.nx*off,p.z+p.nz*off,i))continue;
    let bh=16+Math.pow(rnd(),2)*85;if(rnd()<.08)bh=110+rnd()*40;const g=new T.Group();g.position.set(p.x,0,p.z);g.rotation.y=p.h;
    // oddiy (chizilgan) bino faqat zaxira: .glb binolar bo'lsa umuman yaratilmaydi — o'yin yengil bo'ladi
    const mk=()=>{lot(g,off,0,w,d,bh);g.traverse(o=>{o.castShadow=false;o.receiveShadow=false});
      const sf=new T.Mesh(new T.PlaneGeometry(d,3.8),pick(SF));sf.position.set(off-sd*(w/2+.06),2.2,0);sf.rotation.y=-sd*Math.PI/2;g.add(sf)};
    if(typeof BUILDING_MODELS==="undefined"||!BUILDING_MODELS.length)mk();
    CITY.add(g);blocks.push({g,i,r:300,lot:{sd,w,d,off},mk,s:new T.Sphere(new T.Vector3(p.x+p.nx*off,70,p.z+p.nz*off),120)})}}

// uzoq qator: shahar panoramasi uchun balandroq binolar (tuman ichida ko'rinadi)
function freeFar(x,z,i){for(let k=0;k<P.length;k+=2){if(Math.abs(k-i)<30)continue;if((P[k].x-x)**2+(P[k].z-z)**2<2500)return false}return true}
for(let i=20;i<P.length-8;i+=26){const p=P[i];
  for(const sd of[-1,1]){if(rnd()<.25)continue;const w=22+rnd()*18,d=22+rnd()*14,off=sd*(HW+48+w/2+rnd()*60);
    if(!freeFar(p.x+p.nx*off,p.z+p.nz*off,i))continue;
    const bh=30+Math.pow(rnd(),1.5)*115,g=new T.Group();g.position.set(p.x,0,p.z);g.rotation.y=p.h;
    const mk=()=>{lot(g,off,0,w,d,bh);g.traverse(o=>{o.castShadow=false;o.receiveShadow=false})};
    if(typeof BUILDING_MODELS==="undefined"||!BUILDING_MODELS.length)mk();
    CITY.add(g);blocks.push({g,i,r:520,far:1,mk,s:new T.Sphere(new T.Vector3(p.x+p.nx*off,70,p.z+p.nz*off),170)})}}
