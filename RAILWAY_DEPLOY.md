# Railway Kurulum

Bu proje icin Railway'de ayri bir web sunucusu kurmuyoruz. Sadece `rates:watch` surecini 7/24 calistiran bir worker deploy ediyoruz.

## Hazir dosyalar

- [railway.json](C:/Users/ahmet/OneDrive/Belgeler/New%20project/railway.json)
- [scripts/live-rate-poller.mjs](C:/Users/ahmet/OneDrive/Belgeler/New%20project/scripts/live-rate-poller.mjs)

## Ne yapacak

- Her 20 saniyede bir fiyat kontrol eder
- Once GenelPara'yi dener
- GenelPara hata verirse Gold API + fxapi.app yedegine gecer
- Sonucu Firebase'deki `aktasKuyumculuk/liveRates` yoluna yazar

## Railway uzerinde

1. Railway'de yeni proje ac
2. Bu klasoru GitHub'a yukle ve Railway'e bagla
3. Deploy oldugunda `railway.json` icindeki `npm run rates:watch` komutu otomatik baslar

## Istege bagli env degiskenleri

Varsayilanlar kodda hazir. Istersen Railway'de su degiskenleri tanimlayabilirsin:

- `FIREBASE_DATABASE_URL`
- `FIREBASE_LIVE_RATES_PATH`
- `FETCH_INTERVAL_MS`
- `API_TIMEOUT_MS`

## Sonraki adim

Railway canliya cikinca:

- web sitesi otomatik yeni Firebase verisini gosterir
- musteri ve yonetim APK'lari da ayni yoldan veri almaya devam eder
