// Mashina modellari ro'yxati. Yangi mashina qo'shish uchun shu yerga qator qo'shing (.glb fayl shu papkada bo'lsin).
// flip:true — model teskari qarasa; length — mashina uzunligi (metr)
const CAR_MODELS=[
  {name:"Mashina 1",file:"mashina.glb",color:0xd01040,flip:false,length:4.4},
  {name:"Nexia",file:"nexia2.glb",color:0x19a0e3,flip:true,length:4.4},
  {name:"BMW 1",file:"bmw1.glb",color:0xe8e8ee,flip:true,length:4.4},
  {name:"BMW 2",file:"bmw2.glb",color:0x1f2a6e,flip:false,length:4.4}
];

// Start girl modeli — mashina .glb lari bilan BIR papkada (HTML yonida) turadi. Fayl nomi boshqacha bo'lsa shu yerga yozing.
const STARTGIRL={
  file:"girl.glb",
  height:1.7,       // qiz bo'yi (metr)
  walkClip:"",      // bo'sh = nomida "walk" bo'lgan klip; modelda boshqacha nom bo'lsa shu yerga yozing
  arm:"right",      // qaysi qo'lini ko'taradi: "right" | "left"
  hold:2.4,         // qo'l tepada turish vaqti (s)
  debug:false       // true = konsolga topilgan suyak/klip ma'lumotlarini chiqaradi
};

// Start maydonidagi personajlar. man.glb — o'yinchi shofyori (mashina yoniga yurib keladi). Raqiblar yonida girl.glb va man.glb galma-gal turadi.
// Fayllar mashina .glb lari bilan BIR papkada bo'lsin.
const MAN={file:"man.glb",height:1.78};

// Binolar: b1.glb, b2.glb yo'l bo'yidagi binolar o'rniga galma-gal qo'yiladi (mashina .glb lari bilan BIR papkada bo'lsin).
// Bino yo'l (asfalt) chetidan BUILD_GAP metr narida turadi, asfaltga tegmaydi. Hamma .glb yuklanmasa — oddiy binolar zaxira sifatida chiziladi.
// flip:true — bino orqasi yo'lga qarab qolsa | maxH — eng baland (m) | minH — eng past (m) | maxW — yo'lga ko'ndalang eng katta eni | maxD — yo'l bo'ylab eng katta uzunligi
const BUILD_GAP=5;   // asfalt chetidan binogacha masofa (metr). Kichik = asfaltga yaqinroq (lampa ustunlari 2.4 m da, 4 dan kam qilmang)
const BUILDING_MODELS=[
  {file:"b1.glb",flip:false,maxH:70,minH:25,maxW:34,maxD:44},
  {file:"b2.glb",flip:false,maxH:70,minH:40,maxW:40,maxD:46}
];
