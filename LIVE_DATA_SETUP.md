# Canli Veri Akisi

Bu projede en saglam yapi su sekilde calisir:

1. `npm run rates:watch` tek bir merkezden once GenelPara verisini ceker.
2. GenelPara limit/hata verirse yedek olarak `Gold API + fxapi.app` devreye girer.
3. Gelen ham fiyatlar Firebase Realtime Database icindeki `aktasKuyumculuk/liveRates` yoluna yazilir.
4. Musteri APK, yonetim APK, web vitrin ve web yonetim paneli fiyatlari sadece Firebase'den okur.
5. Kar ayarlari yine `aktasKuyumculuk/settings` yolundan okunur.

## Elle tek seferlik guncelleme

```powershell
cd "C:\Users\ahmet\OneDrive\Belgeler\New project"
npm run rates:update
```

## Surekli 20 saniyede bir guncelleme

```powershell
cd "C:\Users\ahmet\OneDrive\Belgeler\New project"
npm run rates:watch
```

## Onemli not

Bu komut acik kaldigi surece veri 20 saniyede bir yenilenir. Gercekten 7/24 canli calismasi icin bu scriptin:

- surekli acik kalan bir bilgisayarda
- ya da ayri bir sunucu/VPS uzerinde

calismasi gerekir.

## Yedek kaynak notu

Yedek modda:

- `24 Ayar` Gold API spot altin fiyatindan uretilir.
- `USD/TRY` cevrimi `fxapi.app` uzerinden alinir.
- `22 Ayar`, `Ceyrek`, `Yarim`, `Tek Lira`, `Ata Lira`, `Gremse` degerleri son basarili GenelPara oranlarina gore turetilir.
