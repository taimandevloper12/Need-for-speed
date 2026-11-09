// sky.js — haqiqiy osmon: quyosh botishi (golden hour), harakatlanuvchi bulutlar, ufq tumani, tog' siluetlari,
// quyosh nuri + soyalar va butun sahnadagi akslar (PMREM muhit xaritasi) shu yerdan keladi.
// Tuman rangi = ufq rangi, shuning uchun uzoqdagi binolar/yer osmonga uzluksiz qo'shilib ketadi.
const SUN_DIR=new T.Vector3(-.75,.17,.62).normalize();      // quyosh yo'nalishi (ufqdan ~10° tepada)
const HAZE=[.70,.57,.62];                                    // ufq tumani rangi (ekranda ko'rinadigan rang)
const FOGC=new T.Color(HAZE[0],HAZE[1],HAZE[2]);
scene.fog=new T.FogExp2(FOGC,.0027);
renderer.setClearColor(FOGC);
renderer.toneMappingExposure=1.05;

const SKY_VS="varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);\n#ifdef SKYFAR\ngl_Position=gl_Position.xyww;\n#endif\n}";
const SKY_FS=`
uniform vec3 sunDir;uniform float time;varying vec3 vDir;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<${MOBILE?3:5};i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=0.5;}return s;}
float gD=0.0;
vec3 skyColor(vec3 d){
  vec3 hor=vec3(${HAZE.join(",")}),mid=vec3(0.36,0.44,0.70),zen=vec3(0.09,0.17,0.42);
  float e=d.y,sd=max(dot(d,sunDir),0.0);
  vec3 c=mix(hor,mid,smoothstep(0.0,0.3,e));
  c=mix(c,zen,smoothstep(0.18,0.9,e));
  float belt=smoothstep(0.0,0.05,e)*(1.0-smoothstep(0.05,0.3,e))*(1.0-sd);
  c=mix(c,vec3(0.86,0.60,0.72),belt*0.4);
  float warm=exp(-max(e,0.0)*6.0);
  c+=vec3(0.9,0.42,0.15)*warm*pow(sd,3.0)*0.85;
  c+=vec3(1.0,0.60,0.30)*pow(sd,12.0)*0.55;
  c+=vec3(1.0,0.78,0.50)*pow(sd,90.0)*0.9;
  if(e<0.0){c=mix(c,vec3(0.16,0.13,0.15),smoothstep(0.0,0.3,-e));}
  else{
    vec2 q=d.xz/(e+0.22)*vec2(0.5,1.8)+vec2(time*0.005,0.0);
    float ci=smoothstep(0.52,0.9,fbm(q*1.6))*smoothstep(0.02,0.35,e)*0.5;
    c=mix(c,vec3(1.0,0.70,0.58)*(0.65+0.5*sd)+vec3(0.1,0.08,0.12),ci);
    vec2 p=d.xz/(e+0.13)*1.1+vec2(time*0.012,time*0.004);
    float cv=fbm(p);
    float dens=smoothstep(0.5,0.8,cv)*smoothstep(0.02,0.2,e);
    vec2 so=normalize(sunDir.xz+vec2(0.0001))*0.06;
    ${MOBILE?"float lit=clamp(0.35+cv*0.6,0.0,1.0);":"float lit=clamp(0.5+(cv-fbm(p+so))*6.0,0.0,1.0);"}
    float face=0.35+0.65*pow(sd,2.0);
    vec3 cc=mix(vec3(0.30,0.27,0.40),vec3(1.0,0.64,0.44)*(0.55+0.7*face),lit*(0.5+0.5*face));
    cc=mix(cc,c,1.0-smoothstep(0.0,0.35,e));
    c=mix(c,cc,dens*0.94);
    gD=dens;
  }
  return c;
}
void main(){
  vec3 d=normalize(vDir);vec3 c=skyColor(d);float sd=dot(d,sunDir);
  float disc=smoothstep(0.99955,0.99978,sd)*(1.0-gD*0.92);
  #ifdef ENVPASS
    vec3 l=pow(max(c,vec3(0.0)),vec3(2.2))+vec3(1.0,0.8,0.55)*disc*45.0;
    gl_FragColor=vec4(l,1.0);
  #else
    c=mix(c,vec3(1.0,0.95,0.82),disc);
    gl_FragColor=vec4(min(c,vec3(1.0)),1.0);
  #endif
}`;
function mkDome(R,env){
  const m=new T.ShaderMaterial({uniforms:{sunDir:{value:SUN_DIR},time:{value:0}},vertexShader:SKY_VS,fragmentShader:SKY_FS,
    side:T.BackSide,depthTest:!env,depthWrite:false,defines:env?{ENVPASS:""}:{SKYFAR:""}});
  const me=new T.Mesh(new T.SphereGeometry(R,48,24),m);me.frustumCulled=false;return me}
const skyDome=mkDome(1500,false);skyDome.renderOrder=10;scene.add(skyDome);   // opaque obyektlardan KEYIN chiziladi: yopilgan piksellar (xyww -> chuqurlik=1) hisoblanmaydi

// tog' / gorizont siluetlari (kameraga ergashadi — parallaks yo'q, lekin uzoq tog' uchun to'g'ri)
function hillRing(R,hmax,top,order){
  const N=200,pos=[],col=[],idx=[],ph=[0,1,2,3,4].map(()=>rnd()*6.28),bot=FOGC.clone().convertSRGBToLinear(),tp=top.clone().convertSRGBToLinear();
  for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;let hh=0;[[3,.38],[7,.27],[13,.2],[29,.1],[53,.05]].forEach((q,k)=>{hh+=Math.sin(a*q[0]+ph[k])*q[1]});
    hh=Math.max(.05,.5+.5*hh)*hmax;const sx=Math.sin(a)*R,sz=Math.cos(a)*R;
    pos.push(sx,-40,sz,sx,0,sz,sx,hh,sz);col.push(bot.r,bot.g,bot.b,bot.r,bot.g,bot.b,tp.r,tp.g,tp.b);
    if(i){const k=3*i;idx.push(k-3,k,k-2,k-2,k,k+1,k-2,k+1,k-1,k-1,k+1,k+2)}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("color",new T.Float32BufferAttribute(col,3));g.setIndex(idx);
  const hm=new T.MeshBasicMaterial({vertexColors:true,fog:false,side:T.DoubleSide,depthTest:true,depthWrite:false,toneMapped:false});
  hm.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace("#include <project_vertex>","#include <project_vertex>\ngl_Position=gl_Position.xyww;")};
  const m=new T.Mesh(g,hm);
  m.frustumCulled=false;m.renderOrder=order;scene.add(m);return m}
const hillsFar=hillRing(1350,150,new T.Color(.46,.40,.58),11),hillsNear=hillRing(1000,80,new T.Color(.27,.23,.38),12);

// quyosh nuri + soyalar
const sunL=new T.DirectionalLight(0xffa766,2.5);sunL.castShadow=true;
const SHM=MOBILE?1024:2048;
sunL.shadow.mapSize.set(SHM,SHM);
const shc=sunL.shadow.camera;shc.left=shc.bottom=-70;shc.right=shc.top=70;shc.near=10;shc.far=900;
sunL.shadow.bias=-.0004;sunL.shadow.normalBias=.04;
scene.add(sunL,sunL.target);
scene.add(new T.HemisphereLight(0x8a9bd0,0x3b3036,MOBILE?.9:.3));if(MOBILE)scene.add(new T.AmbientLight(0x8a7f9a,.35));
window.GLINFO=(renderer.capabilities.isWebGL2?"GL2":"GL1")+" "+renderer.capabilities.precision+(MOBILE?" safe":"");

// shu osmondan muhit xaritasi: yo'l, mashina va oynalardagi akslar quyosh botishini aks ettiradi
(function(){if(MOBILE)return;try{const es=new T.Scene();es.add(mkDome(10,true));
  const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(es,0,.1,100).texture;pm.dispose()}catch(e){console.warn("env map:",e)}})();

function skyTick(now){
  skyDome.position.copy(camera.position);skyDome.material.uniforms.time.value=now;
  hillsFar.position.set(camera.position.x,0,camera.position.z);hillsNear.position.copy(hillsFar.position)}
