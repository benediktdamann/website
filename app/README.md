# Fristen

Erinnert an alles, was abläuft und teuer wird, wenn man es verpasst:
TÜV, Versicherung, Garantie, Pass, Wartung.

Kein Server, kein Konto, kein API-Schlüssel. Alle Daten bleiben auf dem Gerät.

## Was sie kann

- Frist mit Titel und Datum anlegen
- Liste nach Dringlichkeit eingefärbt: überfällig rot, in den nächsten 14 Tagen orange, sonst grün
- Lokale Benachrichtigung 1, 7, 14 oder 30 Tage vorher, morgens um 9 Uhr
- Bleibt nach dem Schließen der App erhalten
- Löschen per langem Tippen auf einen Eintrag

## Einmalig einrichten

1. **Node.js** auf dem Windows-Laptop installieren: https://nodejs.org (LTS-Version)
2. **Expo Go** auf dem iPhone installieren, aus dem App Store
3. Laptop und iPhone im **selben WLAN**

## Starten

```
cd app
npm install
npm start
```

QR-Code mit der **iPhone-Kamera** scannen, auf die Benachrichtigung tippen.

Beim ersten Start fragt die App nach der Erlaubnis für Mitteilungen. Ohne diese
Erlaubnis funktioniert die Liste weiterhin, aber es kommt keine Erinnerung.

Ab jetzt gilt: Datei speichern → App auf dem iPhone lädt sofort neu.

### Wenn der QR-Code nicht funktioniert

Meist blockiert die Windows-Firewall, oder das WLAN trennt Geräte voneinander
(häufig in Gast- und Firmennetzen). Dann über einen Tunnel starten:

```
npm start -- --tunnel
```

Langsamer, funktioniert aber auch über Mobilfunk.

## Was in Expo Go anders ist

Erinnerungen erscheinen als Mitteilung von **Expo Go**, nicht von „Fristen" –
die App hat in dieser Phase noch kein eigenes Zuhause auf dem iPhone. Sobald ein
richtiger Build gemacht wird, kommt die Mitteilung unter eigenem Namen und
eigenem Symbol.

Wird Expo Go vom iPhone gelöscht, verschwinden auch die Einträge.

## Aufbau

| Datei | Zuständig für |
|---|---|
| `App.tsx` | Oberfläche: Liste, Formular, Farben |
| `src/fristen.ts` | Datenmodell, Speichern, Datumsrechnung |
| `src/erinnerungen.ts` | Benachrichtigungen planen und löschen |

## Zum Ausprobieren

- `ERINNERUNGS_STUNDE` in `src/erinnerungen.ts` – zu welcher Uhrzeit erinnert wird
- `VORLAUF_OPTIONEN` oben in `App.tsx` – welche Vorlaufzeiten zur Auswahl stehen
- `dringlichkeit()` in `src/fristen.ts` – ab wann eine Frist als dringend gilt

Ändern, speichern, aufs iPhone schauen.
