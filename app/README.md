# Zuhause

Die Oberfläche zwischen deinen Geräten und der KI. Sie setzt auf Home Assistant
auf – das liefert die Gerätetreiber, diese App liefert das Erlebnis.

```
Geräte  →  Home Assistant  →  [diese App]  →  du
              2000 Integrationen    Klartext statt YAML
              Sprachagent
```

## Was sie kann

- **Verbinden**: Adresse und Zugriffstoken eingeben, wird geprüft und gespeichert
- **Geräte**: alle Entities in verständlich benannten Gruppen, Lichter und Steckdosen
  direkt schaltbar, Messwerte mit Einheit
- **Sprechen**: Sätze an den Sprachagenten, den du in Home Assistant eingerichtet
  hast – dort steckt die KI

Namen kommen aus `friendly_name`; fehlt der, wird die Entity-ID lesbar gemacht.
Zustände sind auf Deutsch: `on` wird zu „an", `locked` zu „verriegelt".

## Starten

```
cd app
npm install
npm start
```

QR-Code mit der iPhone-Kamera scannen. Beim ersten Start fragt die App nach
Adresse und Token.

### Woher das Token kommt

In Home Assistant unten links auf dein Profil, Reiter „Sicherheit", ganz unten
unter „Langlebige Zugriffstokens" ein neues erzeugen. Das Token wird nur einmal
angezeigt.

## Entwickeln ohne Home Assistant

Es liegt eine Attrappe dabei, die dieselben Endpunkte spricht wie das Original:

```
npm run attrappe
```

Sie läuft auf Port 8123, das Token ist `attrappe-token`. In der App gibst du die
**LAN-Adresse deines Laptops** ein, nicht `localhost` – das wäre aus Sicht des
iPhones das iPhone selbst. Die Adresse findest du unter Windows mit `ipconfig`.

## Prüfen

```
npm run pruefe
```

Übersetzt den Client nach JavaScript und fährt ihn gegen die Attrappe: Token
falsch und richtig, Adress-Normalisierung, Zeitüberschreitung, Gruppierung,
Übersetzung der Zustände, Schalten, Sprachagent. 22 Prüfungen.

## Aufbau

| Datei | Zuständig für |
|---|---|
| `src/homeassistant.ts` | REST-Client und Darstellungsregeln. Kein React Native, damit testbar |
| `src/speicher.ts` | Verbindung auf dem Gerät ablegen |
| `src/ui/Verbinden.tsx` | Einrichtungsbildschirm |
| `src/ui/Geraete.tsx` | Geräteliste mit Schaltern |
| `src/ui/Sprechen.tsx` | Unterhaltung mit dem Sprachagenten |
| `src/ui/thema.ts` | Farben |
| `tools/mock-ha.mjs` | Attrappe von Home Assistant |
| `tools/pruefe.mjs` | Prüfungen gegen die Attrappe |

## Was als Nächstes fehlt

- **Räume statt Gerätearten.** Die REST-API liefert keine Raumzuordnung, dafür
  braucht es die Websocket-API. Danach wird aus „Licht" das „Wohnzimmer".
- **Automatisierung anlegen.** Beschreiben statt bauen: „sag mir wenn die
  Waschmaschine fertig ist" soll die Automatisierung in Home Assistant erzeugen.
- **Sprache statt Tippen.** Diktat aufs Mikrofon.
- **Geräte suchen.** Bei vielen Entities braucht die Liste ein Suchfeld.
