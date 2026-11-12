/* Buildings.js — b1.glb / b2.glb binolari. Yo'l bo'yidagi oddiy binolar o'rniga qo'yiladi.
 * - Oddiy (chizilgan) binolar .glb yuklansa umuman yaratilmaydi (yengil); faqat hech bir .glb yuklanmasa zaxira sifatida chiziladi.
 * - Bino asfalt chetidan BUILD_GAP metr narida turadi; boshqa yo'l qismiga yetib qoladigan bino qo'yilmaydi.
 * - OPTIMIZATSIYA: bir xil modelning hamma nusxalari InstancedMesh bilan chiziladi (har model-mesh uchun bitta draw call).
 *   Culling avvalgidek har bino hajmi bo'yicha (game.js cull() -> b.vis), so'ng Buildings.flush() ko'rinadigan nusxalarni yozadi.
 * - Yuklash progressi LD ga ulanadi: Buildings.load(idx, lp) game.js oxirida chaqiriladi (o'yin binolar tayyor bo'lgach boshlanadi).
 * Bog'liqliklar: T, scene, blocks, P, HW (map.js), BUILDING_MODELS, BUILD_GAP (models.js). */
const Buildings=(function(){
  const L=typeof BUILDING_MODELS!=="undefined"?BUILDING_MODELS:[],GAP=typeof BUILD_GAP!=="undefined"?BUILD_GAP:5,src=[],batches=[];
  const freeze=o=>o.traverse(n=>{n.updateMatrix();n.matrixAutoUpdate=false});   // statik: har kadrda matritsa hisoblanmaydi
  // modelning k-chi meshi uchun partiya (geometriya+material umumiy), har bino uchun bitta world matritsa
  function addInst(m,k,mesh,b){const B=m.batches||(m.batches=[]);let bt=B[k];
    if(!bt){bt=B[k]={geo:mesh.geometry,mat:mesh.material,items:[],im:null};batches.push(bt)}
    bt.items.push({b,m:mesh.matrixWorld.clone()})}
  function place(b,m){
    const {sd}=b.lot,g=b.g,wrap=new T.Group(),root=m.scene.clone(true);wrap.add(root);
    root.rotation.y=(sd>0?-Math.PI/2:Math.PI/2)+(m.flip?Math.PI:0);          // old tomoni yo'lga qaraydi
    wrap.updateMatrixWorld(true);
    const bx=new T.Box3().setFromObject(root),sz=bx.getSize(new T.Vector3());
    const s=Math.min((m.maxW||36)/Math.max(sz.x,.01),(m.maxD||44)/Math.max(sz.z,.01),(m.maxH||70)/Math.max(sz.y,.01));
    root.scale.setScalar(s);wrap.updateMatrixWorld(true);
    bx.setFromObject(root);const c=bx.getCenter(new T.Vector3()),e=bx.getSize(new T.Vector3());
    // yo'lga qaragan qirrasi aniq HW+GAP da turadi
    const dx=sd>0?(HW+GAP)-bx.min.x:-(HW+GAP)-bx.max.x;
    root.position.set(root.position.x+dx,root.position.y-bx.min.y,root.position.z-c.z);
    wrap.updateMatrixWorld(true);bx.setFromObject(root);bx.getCenter(c);
    // boshqa yo'l qismiga tegib ketmasin (egri joylarda)
    const p=P[b.i],cx=p.x+p.nx*c.x+p.tx*c.z,cz=p.z+p.nz*c.x+p.tz*c.z,hr=Math.hypot(e.x,e.z)/2+HW+1;
    for(let k=0;k<P.length;k+=2){if(Math.abs(k-b.i)<14)continue;if((P[k].x-cx)**2+(P[k].z-cz)**2<hr*hr){b.skip=1;return}}
    // world matritsalarni olish uchun vaqtincha g ga qo'shamiz, so'ng olib tashlaymiz (instancing)
    g.add(wrap);g.updateMatrixWorld(true);
    let mi=0;root.traverse(o=>{if(o.isMesh)addInst(m,mi++,o,b)});
    g.remove(wrap);freeze(g);
    // culling shari: binoning haqiqiy o'lchami
    const wc=c.clone().applyMatrix4(g.matrixWorld);b.s=new T.Sphere(wc,Math.hypot(e.x,e.y,e.z)/2);b.r=260}
  function apply(){
    if(!src.length){for(const b of blocks)if(b.mk)b.mk();return}      // zaxira: oddiy binolar
    let k=0;
    for(const b of blocks){
      if(b.far){b.g.visible=false;b.dead=1;continue}                      // uzoq chizilgan binolar kerak emas
      if(!b.lot)continue;
      place(b,src[k++%src.length]);
      if(b.skip)b.dead=1}
    for(let i=blocks.length-1;i>=0;i--)if(blocks[i].dead)blocks.splice(i,1);
    for(const bt of batches){
      const im=new T.InstancedMesh(bt.geo,bt.mat,bt.items.length);
      im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.frustumCulled=false;im.castShadow=false;im.receiveShadow=false;im.count=0;
      bt.im=im;CITY.add(im)}}
  // game.js cull() dan keyin: ko'rinadigan binolarning nusxalari instance buferiga yoziladi
  function flush(){
    for(let q=0;q<batches.length;q++){const bt=batches[q],im=bt.im;if(!im)continue;
      const it=bt.items;let n=0;
      for(let i=0;i<it.length;i++)if(it[i].b.vis)im.setMatrixAt(n++,it[i].m);
      im.count=n;im.instanceMatrix.needsUpdate=true}}
  function load(idx,report){
    if(!L.length){report(idx,1,1);return}
    const got=new Array(L.length),prog=L.map(()=>0);let left=L.length;
    const rp=()=>report(idx,prog.reduce((a,v)=>a+v,0)/L.length*.95);
    const fin=()=>{if(--left>0)return;
      got.forEach(x=>{if(x)src.push(x)});                                 // model tartibi barqaror: b1, b2, b1, ...
      try{apply()}catch(e){console.error("[Buildings]",e)}
      report(idx,1,1)};
    if(!T.GLTFLoader){left=1;fin();return}
    L.forEach((d,i)=>new T.GLTFLoader().load(d.file,
      gl=>{got[i]={scene:gl.scene,flip:d.flip,maxH:d.maxH,maxW:d.maxW,maxD:d.maxD};prog[i]=1;rp();fin()},
      xhr=>{if(xhr.total){prog[i]=xhr.loaded/xhr.total;rp()}},
      e=>{console.warn("[Buildings] "+d.file+" yuklanmadi",e);prog[i]=1;fin()}))}   // yuklanmasa ham o'yin to'xtamaydi (zaxira binolar)
  return{load,flush};
})();
