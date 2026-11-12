# Optimizatsiya o'zgarishlari

**sky.js** — osmon kupoli opaque obyektlardan keyin, chuqurlik=1 (xyww) bilan chiziladi (yopilgan piksellar hisoblanmaydi); tog' halqalari ham shunday. Mobilda fbm 3 oktava, bulut soyasi soddalashtirilgan. Mobil: PCFShadowMap.
**map.js** — ROAD shaderida grain() bir marta va faqat yaqinda (gw>0). Mobilda ROAD teksturasi 512x1024 ga kichraytiriladi (RNG o'zgarmaydi), CURB/SIDE/GRASS bumpMap o'chiq, ground Lambert, halo kichikroq. Chevron soyasi o'chiq. LAMPS ga yo'l indeksi `i` qo'shildi.
**engine.js** — global MOBILE; mobilda antialias o'chiq; dinamik pixelRatio (adaptRes, FPS bo'yicha 0.75..max).
**game.js** — 120 Hz qat'iy fizika; DOM yozuvlari keshlangan; har kadr massiv yaratilmaydi; AI pozitsiyasi keshlanadi (e.a); FOV faqat o'zgarganda; cull() kvadrat masofa + Buildings.flush(); audio ~30 Hz; tachometr siferblati offscreen, minixarita har 3-kadr; lampHit faqat yaqin chiroqlar; soya kamerasi texel to'riga yopishadi; o'lik #touch kodi olib tashlandi.
**Buildings.js** — InstancedMesh (har model-mesh = 1 draw call), bino .glb lari yuklash progressiga (LD) ulangan: Buildings.load() game.js oxirida.
**cars.js** — LD.total +1 (binolar), xato xabarida bino fayllari ko'rsatiladi.
**People.js / StartGirl.js** — MOBILE ishlatadi; People.make() o'lchash natijasini keshlaydi.
**HTML** — preconnect va defer.

Qilinmadi (sabab): mk() lazy — RNG ketma-ketligi o'zgarib butun xarita tuzilishi o'zgarib ketardi.

# Xarita tanlash + chiroq culling
**Maps.js (yangi)** — xarita tanlash: "Shahar" (eski) va models.js dagi MAPS ro'yxati (sky.glb). Boshqa xarita tanlansa poyga shu yerda bo'ladi, shahar (CITY guruhi: yo'l, binolar, chiroqlar, garaj, yer) butunlay yashiriladi va cull() o'chadi. Yo'l (P/STEP/FIN/LINE/HW) xarita almashganda qayta quriladi; .glb birinchi tanlovda yuklanadi, keyin keshdan.
**models.js** — MAPS (file, scale, y, route, hw, line, fog, autoY, hills) va LAMP_VIEW (behind/ahead).
**map.js** — barcha shahar obyektlari CITY guruhida; HW/LINE/STEP/FIN `let`. Chiroqlar: asosiy matritsalar xotirada (MAS), GPU ga faqat oynadagi chiroqlar yoziladi (lampWindow): poygada ortda ~15 m dan, oldinda ~300 m dan uzoqdagilar chizilmaydi (halo ham).
**game.js** — setMap(), TG `let`, cull() faqat shahar xaritasida, chiroq oynasi cull() ichida.
**index.html / style.css** — xarita tanlash tugmalari (◀ Shahar ▶), Maps.js ulandi.
**Garage.js / Buildings.js** — scene.add -> CITY.add.
