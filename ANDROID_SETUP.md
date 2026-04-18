# Android Kurulum Komutlari

Bu proje icin uyguladigim sirali komutlar:

```powershell
npm install
npm run build:web
npx cap add android
npx cap sync android
npx cap open android
```

Notlar:

- `webDir: "."` Capacitor 7.6.1 tarafinda gecersiz oldugu icin `capacitor.config.json` dosyasi `web` klasorunu kullanacak sekilde ayarlandi.
- `npm run build:web` komutu kok dizindeki statik dosyalari `web/` klasorune kopyalar.
- `npx cap open android` Android Studio'yu proje ile acmayi dener.
