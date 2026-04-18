# Firebase Kurulum

Farkli telefonlar arasinda fiyat degisikliginin aninda yayilmasi icin bu proje Firebase Realtime Database'e hazirlandi.

## 1. Firebase projesi olustur

1. Firebase Console'u ac.
2. Yeni proje olustur.
3. Projeye bir `Web App` ekle.

## 2. Realtime Database ac

1. `Build > Realtime Database` bolumune gir.
2. Veritabani olustur.
3. Baslangic icin test modunu sec.

Not:
Firebase dokumanina gore Realtime Database JSON veriyi tutar ve bagli istemcilere gercek zamanli senkron yollar.
Kaynaklar:
- [Firebase Realtime Database docs](https://firebase.google.com/docs/database)
- [Kurulum docs](https://firebase.google.com/docs/database/web/start)
- [Read/Write docs](https://firebase.google.com/docs/database/web/read-and-write)

## 3. Proje bilgilerini dosyaya gir

Su dosyayi doldur:

`firebase-config.js`

Ornek alanlar:

```js
window.AKTAS_FIREBASE_CONFIG = {
  apiKey: "BURAYA_API_KEY",
  authDomain: "proje.firebaseapp.com",
  databaseURL: "https://proje-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "proje-id",
  storageBucket: "proje.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 4. Test

1. Yonetim panelinde kar ayarini degistir.
2. `Kaydet` butonuna bas.
3. Musteri ekrani baska cihazda aciksa otomatik guncellenir.

## 5. APK al

```powershell
cd "C:\Users\ahmet\OneDrive\Belgeler\New project"
npm run build:web
npx cap sync android
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
```
