# Altin Vitrini

Kuyumcu magazasi icin hazirlanmis, mobil uyumlu ve musteri ekranina uygun bir kur gosterim uygulamasi.

## Ozellikler

- Mobil, tablet ve TV ekranlarinda rahat okunan arayuz
- Alis ve satis fiyatlarini ayri gosterim
- Otomatik yenileme sayaci
- Son veri tarayicida saklanir
- PWA temeli sayesinde ana ekrana eklenebilir
- Canli veri kaynagi olarak GenelPara API baglantisi
- Android paketleme icin Capacitor iskeleti

## Calistirma

`index.html` dosyasini dogrudan tarayicida acabilirsin.

Daha saglikli servis worker davranisi icin basit bir statik sunucu ile acman daha iyi olur. Ornek:

```powershell
python -m http.server 8080
```

Sonra `http://localhost:8080` adresine gir.

## Canli veri

Uygulama varsayilan olarak `https://api.genelpara.com/json/` uzerinden su kalemleri ceker:

- Gram Altin
- Ceyrek Altin
- Yarim Altin
- Tam Altin
- USD / TRY
- EUR / TRY

Veri gelmezse son kaydedilen veriler, o da yoksa ornek veri gosterilir.

## Veri kaynagini degistirme

`app.js` icindeki `API_CONFIG` alanini guncelleyerek kendi kur servisini baglayabilirsin.

Farkli bir API kullanirsan `fetchRates()` veya `mapGenelParaPayload()` bolumunu o servisin JSON yapisina gore uyarlaman yeterlidir.

## Android uygulamasi hazirlama

Projeye `Capacitor` yapisi eklendi. Bilgisayarinda Node.js kurulu oldugunda su adimlarla Android Studio projesi olusturabilirsin:

```powershell
npm install
npm run android:init
```

Sonra Android Studio ile `android` klasorunu acip APK veya AAB alabilirsin.

Web dosyalarinda degisiklik yaparsan:

```powershell
npm run android:sync
```

## Notlar

- Bu ortamda Node.js ve npm kurulu olmadigi icin `npm install` ve Android olusturma adimlarini burada calistiramadim.
- Uygulama ikonu icin temel bir SVG eklendi: `assets/icon.svg`

## Ornek veri formati

Kendi servisini kurarsan beklenen veri mantigi su sekildedir:

```json
[
  { "label": "Gram Altin", "buy": 4128.75, "sell": 4171.35, "trend": "up" }
]
```

`trend` alani `up`, `down` veya `flat` olabilir.
