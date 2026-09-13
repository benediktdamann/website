# Würfel

Test-App, um die Kette Windows-Laptop → iPhone einmal komplett durchzuspielen.
Ein Würfel, den man schütteln oder antippen kann.

Sie testet bewusst genau die Bausteine, die jede spätere App braucht:

| Baustein | Wo er vorkommt |
|---|---|
| Oberfläche zeichnen | Der Würfel mit seinen Augen |
| Zustand verwalten | Augenzahl und Wurf-Verlauf |
| Animation | Drehen und Stauchen beim Wurf |
| Sensor auslesen | Beschleunigungssensor erkennt das Schütteln |
| Rückmeldung am Gerät | Vibration beim Wurf und beim Ergebnis |

Kein Server, kein Login, kein API-Schlüssel.

## Einmalig einrichten

1. **Node.js** auf dem Windows-Laptop installieren: https://nodejs.org (LTS-Version)
2. **Expo Go** auf dem iPhone installieren, aus dem App Store
3. Laptop und iPhone müssen im **selben WLAN** sein

## Starten

In der Eingabeaufforderung oder PowerShell:

```
cd app
npm install
npm start
```

Es erscheint ein QR-Code. Den mit der **iPhone-Kamera** scannen und auf die
Benachrichtigung tippen – Expo Go öffnet die App.

Ab jetzt gilt: Datei speichern → App auf dem iPhone lädt sofort neu.

## Wenn der QR-Code nicht funktioniert

Meist blockiert die Windows-Firewall oder das WLAN trennt Geräte voneinander
(häufig in Gast- und Firmennetzen). Dann über einen Tunnel starten:

```
npm start -- --tunnel
```

Das ist langsamer, funktioniert aber auch über Mobilfunk.

## Zum Ausprobieren

Alles Interessante steht in `App.tsx`, ganz oben:

- `SCHUETTEL_SCHWELLE` – wie fest man schütteln muss (kleiner = empfindlicher)
- `WURF_DAUER` – wie lange der Würfel rollt, in Millisekunden
- `FLACKER_TAKT` – wie schnell die Seiten währenddessen wechseln

Zahl ändern, speichern, aufs iPhone schauen. Das ist die Schleife.
