/**
 * Attrappe von Home Assistant fuer die Entwicklung ohne echte Installation.
 *
 * Spricht dieselben Endpunkte wie die echte REST-API:
 *   GET  /api/                        Lebenszeichen
 *   GET  /api/states                  alle Entities
 *   POST /api/services/:bereich/:dienst
 *   POST /api/conversation/process    Sprachagent
 *
 * Start:  node tools/mock-ha.mjs
 */
import { createServer } from 'node:http';

export const TEST_TOKEN = 'attrappe-token';

function entity(entityId, state, attributes = {}) {
  return { entity_id: entityId, state, attributes, last_changed: new Date().toISOString() };
}

function frischeGeraete() {
  return [
    entity('light.wohnzimmer', 'on', { friendly_name: 'Wohnzimmer Deckenlicht' }),
    entity('light.kueche', 'off', { friendly_name: 'Küche Arbeitsplatte' }),
    entity('light.flur', 'off', { friendly_name: 'Flur' }),
    entity('switch.kaffeemaschine', 'off', { friendly_name: 'Kaffeemaschine' }),
    entity('switch.waschmaschine', 'on', { friendly_name: 'Waschmaschine Steckdose' }),
    entity('fan.schlafzimmer', 'off', { friendly_name: 'Ventilator Schlafzimmer' }),
    entity('sensor.waschmaschine_leistung', '412', {
      friendly_name: 'Waschmaschine Leistung',
      unit_of_measurement: 'W',
    }),
    entity('sensor.aussentemperatur', '8.4', {
      friendly_name: 'Außentemperatur',
      unit_of_measurement: '°C',
    }),
    entity('climate.heizung_wohnzimmer', 'heat', { friendly_name: 'Heizung Wohnzimmer' }),
    entity('cover.rollladen_schlafzimmer', 'open', { friendly_name: 'Rollladen Schlafzimmer' }),
    entity('binary_sensor.haustuer', 'off', { friendly_name: 'Haustür' }),
    entity('media_player.wohnzimmer_tv', 'idle', { friendly_name: 'Fernseher Wohnzimmer' }),
    entity('person.benedikt', 'home', { friendly_name: 'Benedikt' }),
    entity('lock.haustuer', 'locked', { friendly_name: 'Haustürschloss' }),
    entity('sensor.ohne_namen', '17', { unit_of_measurement: 'kWh' }),
    entity('weather.zuhause', 'cloudy', { friendly_name: 'Wetter' }),
  ];
}

function jsonAntwort(antwort, status, koerper) {
  const text = JSON.stringify(koerper);
  antwort.writeHead(status, { 'Content-Type': 'application/json' });
  antwort.end(text);
}

async function leseKoerper(anfrage) {
  const teile = [];
  for await (const teil of anfrage) teile.push(teil);
  if (teile.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(teile).toString('utf8'));
  } catch {
    return {};
  }
}

export function starte(port = 8123, token = TEST_TOKEN) {
  let geraete = frischeGeraete();

  const server = createServer(async (anfrage, antwort) => {
    const pfad = (anfrage.url ?? '/').split('?')[0];

    // Genau wie das Original: ohne gueltiges Bearer-Token gibt es 401.
    if (anfrage.headers.authorization !== `Bearer ${token}`) {
      return jsonAntwort(antwort, 401, { message: 'Unauthorized' });
    }

    if (anfrage.method === 'GET' && pfad === '/api/') {
      return jsonAntwort(antwort, 200, { message: 'API running.' });
    }

    if (anfrage.method === 'GET' && pfad === '/api/states') {
      return jsonAntwort(antwort, 200, geraete);
    }

    const dienst = pfad.match(/^\/api\/services\/([^/]+)\/([^/]+)$/);
    if (anfrage.method === 'POST' && dienst) {
      const [, bereich, aktion] = dienst;
      const koerper = await leseKoerper(anfrage);
      const gesucht = koerper.entity_id;
      const geaendert = [];

      geraete = geraete.map((geraet) => {
        if (geraet.entity_id !== gesucht || geraet.entity_id.split('.')[0] !== bereich) {
          return geraet;
        }
        const neu =
          aktion === 'toggle'
            ? geraet.state === 'on'
              ? 'off'
              : 'on'
            : aktion === 'turn_on'
              ? 'on'
              : aktion === 'turn_off'
                ? 'off'
                : geraet.state;
        const aktualisiert = { ...geraet, state: neu, last_changed: new Date().toISOString() };
        geaendert.push(aktualisiert);
        return aktualisiert;
      });

      return jsonAntwort(antwort, 200, geaendert);
    }

    if (anfrage.method === 'POST' && pfad === '/api/conversation/process') {
      const koerper = await leseKoerper(anfrage);
      const gesagt = String(koerper.text ?? '');
      return jsonAntwort(antwort, 200, {
        response: {
          response_type: 'action_done',
          speech: { plain: { speech: `Verstanden: ${gesagt}`, extra_data: null } },
        },
        conversation_id: koerper.conversation_id ?? 'attrappe-gespraech-1',
      });
    }

    return jsonAntwort(antwort, 404, { message: 'Not found' });
  });

  return new Promise((fertig) => server.listen(port, '127.0.0.1', () => fertig(server)));
}

// Direkt gestartet: dauerhaft laufen lassen.
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8123);
  starte(port).then(() => {
    console.log(`Attrappe laeuft auf http://127.0.0.1:${port}`);
    console.log(`Token: ${TEST_TOKEN}`);
  });
}
