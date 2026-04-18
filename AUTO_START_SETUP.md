# Otomatik Baslatma

Canli fiyat servisini her seferinde elle acmak yerine Windows girisinde otomatik baslatmak icin hazir script:

- [scripts/start-live-rates.ps1](C:/Users/ahmet/OneDrive/Belgeler/New%20project/scripts/start-live-rates.ps1)

## Elle test

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\ahmet\OneDrive\Belgeler\New project\scripts\start-live-rates.ps1"
```

## Windows girisinde otomatik baslatma

Windows Gorev Zamanlayici'ya su komutla eklenebilir:

```powershell
schtasks /Create /TN "AktasCanliFiyatlar" /SC ONLOGON /RL LIMITED /TR "powershell -ExecutionPolicy Bypass -File \"C:\Users\ahmet\OneDrive\Belgeler\New project\scripts\start-live-rates.ps1\"" /F
```

## Elle kapatma

Gorev Yoneticisi'nden `powershell.exe` veya `node.exe` icindeki canli fiyat servis surecini kapatabilirsin.
