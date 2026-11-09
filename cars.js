// Mashinalar: .glb modellar. HAMMA modellar (mashinalar + start girl) to'liq yuklanmaguncha o'yin boshlanmaydi.
// Biror fayl yuklanmasa — xato ko'rsatiladi va "Qayta urinish" tugmasi chiqadi (oddiy zaxira model ishlatilmaydi).
const tailM=new T.MeshBasicMaterial({color:0x8a0e18});   // game.js tormoz chirog'i rangini shu yerga yozadi
const carCache=[],LD={p:[],fin:[],err:{},done:0,ready:false,total:CAR_MODELS.length+3};
const loadFile=i=>i<CAR_MODELS.length?CAR_MODELS[i].file:i===CAR_MODELS.length?((typeof STARTGIRL!=="undefined"&&STARTGIRL.file)||"girl.glb"):i===CAR_MODELS.length+1?((typeof MAN!=="undefined"&&MAN.file)||"man.glb"):BUILDING_MODELS.map(b=>b.file).join(", ");
function lp(i,v,fin,err){
  if(err){LD.err[i]=err;LD.p[i]=0;if(LD.fin[i]){LD.fin[i]=0;LD.done--}}
  else{delete LD.err[i];LD.p[i]=v;if(fin&&!LD.fin[i]){LD.fin[i]=1;LD.done++}}
  const n=LD.total,a=LD.p.reduce((s,v)=>s+(v||0),0)/n,ek=Object.keys(LD.err),eb=document.getElementById("lerr"),rb=document.getElementById("lretry");
  document.getElementById("lbar").style.width=a*100+"%";
  document.getElementById("ltxt").textContent=ek.length?"":Math.round(a*100)+"% ("+LD.done+"/"+n+")";
  eb.style.display=rb.style.display=ek.length?"block":"none";
  if(ek.length)eb.textContent="Yuklanmadi: "+ek.map(k=>loadFile(+k)).join(", ")+(location.protocol==="file:"?" — fayllarni lokal server orqali oching (file:// da .glb ishlamaydi).":" — internet yoki fayl nomini tekshiring.");
  if(!ek.length&&LD.done>=n&&!LD.ready){LD.ready=true;try{renderer.compile(scene,camera)}catch(e){}   // shaderlar oldindan tayyorlanadi — birinchi kadrda qotish bo'lmaydi
    document.getElementById("loading").style.display="none";document.getElementById("go").disabled=false}}
function retryLoad(){const ks=Object.keys(LD.err).map(Number);ks.forEach(k=>lp(k,0,0));
  ks.forEach(k=>k<CAR_MODELS.length?loadCar(k):k===CAR_MODELS.length?StartGirl.load(CAR_MODELS.length,lp):Folks.load(CAR_MODELS.length+1,lp))}
document.getElementById("lretry").onclick=retryLoad;
function loadCar(i){const d=CAR_MODELS[i],g=carCache[i];
  if(!T.GLTFLoader){lp(i,0,0,"GLTFLoader yuklanmadi");return}
  new T.GLTFLoader().load(d.file,gl=>{try{const root=gl.scene,hd=new T.Group();hd.add(root);
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;if(o.material&&"envMapIntensity" in o.material)o.material.envMapIntensity=1.3}});
    const bx=new T.Box3(),sz=new T.Vector3();bx.setFromObject(root);bx.getSize(sz);if(sz.x>sz.z)root.rotation.y=Math.PI/2;if(d.flip)root.rotation.y+=Math.PI;
    bx.setFromObject(root);bx.getSize(sz);root.scale.multiplyScalar((d.length||4.4)/Math.max(sz.z,.001));bx.setFromObject(root);const c=bx.getCenter(new T.Vector3());
    root.position.x-=c.x;root.position.z-=c.z;root.position.y-=bx.min.y;
    g.add(hd);lp(i,1,1)}catch(e){console.error(e);lp(i,0,0,d.file+" tayyorlanmadi")}},
    xhr=>{if(xhr.total)lp(i,xhr.loaded/xhr.total*.95)},
    e=>{console.warn(d.file+" yuklanmadi",e);lp(i,0,0,d.file+" topilmadi")})}
function getCar(i){if(carCache[i])return carCache[i];const g=new T.Group();g.visible=false;scene.add(g);carCache[i]=g;loadCar(i);return g}
function hideCars(){carCache.forEach(c=>c.visible=false)}
// bitta faralar (yorug'lik soni o'zgarmaydi -> qotish yo'q)
const spotP=new T.SpotLight(0xfff2d6,4,110,.45,.6,1),spotT=new T.Object3D();scene.add(spotP,spotT);spotP.target=spotT;
