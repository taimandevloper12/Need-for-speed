/* Maps.js — xarita tanlash. 0-xarita: eski "Shahar" (map.js). Qolganlari — models.js dagi MAPS ro'yxatidagi .glb xaritalar (masalan sky.glb).
 * Yangi xarita tanlansa: poyga SHU xaritada bo'ladi, shahar (yo'l, binolar, chiroqlar, garaj, ground) butunlay yashiriladi (CITY.visible=false, cull() ham o'chadi).
 * Poyga yo'li (P, STEP, FIN, LINE, HW) xarita almashganda shu yerda qayta quriladi — qolgan hamma kod (at(), nearIdx(), AI, minixarita) o'zgarishsiz ishlaydi.
 * Bog'liqliklar: T, scene, P, HW, LINE, STEP, FIN, CITY (map.js), MAPS (models.js), hillsFar/hillsNear (sky.js). */
const Maps=(function(){
  const L=typeof MAPS!=="undefined"&&MAPS.length?MAPS:[{name:"Shahar",city:true}];
  const cityP=P.slice(),CITY0={HW,LINE,STEP,FIN,fog:scene.fog?scene.fog.density:0};
  const cache={};let cur=0;
  // nuqtalardan P (yo'l markaz chizig'i) ni map.js dagi bilan bir xil usulda quradi
  function build(pts){
    const cv=new T.CatmullRomCurve3(pts,false,"centripetal"),len=cv.getLength(),n=Math.max(8,Math.round(len/3)),st=len/n;
    const q=cv.getSpacedPoints(n).map((v,i,a)=>{const b=a[Math.min(i+1,a.length-1)],p=a[Math.max(i-1,0)];let tx=b.x-p.x,tz=b.z-p.z;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
      return{x:v.x,z:v.z,tx,tz,nx:tz,nz:-tx,s:i*st,h:Math.atan2(tx,tz)}});
    return{P:q,STEP:st,FIN:q[q.length-1].s-30}}
  function prepare(d,gl){
    const wrap=new T.Group(),root=gl.scene;wrap.add(root);root.scale.multiplyScalar(d.scale||1);wrap.updateMatrixWorld(true);
    const bx=new T.Box3().setFromObject(wrap),sz=bx.getSize(new T.Vector3()),ct=bx.getCenter(new T.Vector3());
    // 1) poyga yo'li: models.js dagi route yoki modelning eng uzun tomoni bo'ylab to'g'ri yo'l
    let pts;
    if(d.route&&d.route.length>=2){const k=d.routeRaw?(d.scale||1):1;pts=d.route.map(a=>new T.Vector3(a[0]*k,0,a[1]*k))}
    else{const alongX=sz.x>=sz.z,len=Math.min(d.len||1e9,(alongX?sz.x:sz.z)*.9);
      pts=alongX?[new T.Vector3(ct.x-len/2,0,ct.z),new T.Vector3(ct.x+len/2,0,ct.z)]:[new T.Vector3(ct.x,0,ct.z-len/2),new T.Vector3(ct.x,0,ct.z+len/2)]}
    const tr=build(pts);
    // 2) balandlik: yo'l ostidagi sirt y=0 ga tushiriladi (mashinalar va kamera y=0 da ishlaydi). d.autoY===false bo'lsa o'chadi
    let dy=0;
    if(d.autoY!==false){
      const rc=new T.Raycaster(),down=new T.Vector3(0,-1,0),ys=[];
      for(let k=0;k<=8;k++){const p=tr.P[Math.min(tr.P.length-1,Math.round(k/8*(tr.P.length-1)))];
        rc.set(new T.Vector3(p.x,bx.max.y+50,p.z),down);rc.far=bx.max.y-bx.min.y+120;
        const h=rc.intersectObject(wrap,true).filter(x=>x.object.isMesh);if(h.length)ys.push(h[0].point.y)}
      if(ys.length){ys.sort((a,b)=>a-b);dy=-ys[ys.length>>1]}
      else console.warn("[Maps] "+d.file+": yo'l ostida sirt topilmadi — route ni models.js da tekshiring (balandlik avtomat sozlanmadi)")}
    wrap.position.y+=dy+(d.y||0);
    // 3) statik: matritsa hisoblanmaydi, faqat soya qabul qiladi (yengil)
    wrap.updateMatrixWorld(true);
    wrap.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true}o.matrixAutoUpdate=false});
    wrap.visible=false;scene.add(wrap);
    return{group:wrap,tr}}
  function show(i){
    const d=L[i];
    for(const k in cache)cache[k].group.visible=false;
    CITY.visible=!!d.city;
    if(d.city){P.length=0;cityP.forEach(p=>P.push(p));HW=CITY0.HW;LINE=CITY0.LINE;STEP=CITY0.STEP;FIN=CITY0.FIN;if(scene.fog)scene.fog.density=CITY0.fog}
    else{const c=cache[i];c.group.visible=true;P.length=0;c.tr.P.forEach(p=>P.push(p));STEP=c.tr.STEP;FIN=c.tr.FIN;HW=d.hw||8;LINE=d.line||40;
      if(scene.fog&&d.fog!==undefined)scene.fog.density=d.fog;else if(scene.fog)scene.fog.density=CITY0.fog}
    const hill=d.city||d.hills!==false;hillsFar.visible=hillsNear.visible=hill;
    cur=i}
  // i-chi xaritani tanlaydi (kerak bo'lsa .glb ni yuklaydi, keyingi safar keshdan). prog(0..1), done(ok, xabar)
  function select(i,prog,done){
    const d=L[i];if(!d){done&&done(false,"xarita yo'q");return}
    if(d.city||cache[i]){show(i);done&&done(true);return}
    if(!T.GLTFLoader){done&&done(false,"GLTFLoader yuklanmadi");return}
    new T.GLTFLoader().load(d.file,gl=>{try{cache[i]=prepare(d,gl);show(i);done&&done(true)}catch(e){console.error("[Maps]",e);done&&done(false,d.file+" tayyorlanmadi")}},
      xhr=>{if(xhr.total&&prog)prog(xhr.loaded/xhr.total)},
      e=>{console.warn("[Maps] "+d.file+" yuklanmadi",e);done&&done(false,d.file+" topilmadi")})}
  return{select,count:L.length,name:i=>L[i].name,file:i=>L[i].file||"",get cur(){return cur}}
})();
