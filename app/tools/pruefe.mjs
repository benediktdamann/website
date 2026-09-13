/**
 * Prueft den Home-Assistant-Client gegen die Attrappe.
 * Aufruf ueber "npm run pruefe" - der Client wird davor nach JS uebersetzt.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { starte, TEST_TOKEN } from './mock-ha.mjs';

const modulPfad = process.argv[2];
if (!modulPfad) {
  console.error('Pfad zum uebersetzten Client fehlt.');
  process.exit(1);
}

const ha = await import(pathToFileURL(resolve(process.cwd(), modulPfad)).href);

const PORT = 8199;
const server = await starte(PORT);
const verbindung = { basis: `http://127.0.0.1:${PORT}`, token: TEST_TOKEN };

let bestanden = 0;
const fehler = [];

function pruefe(name, bedingung, hinweis = '') {
  if (bedingung) {
    bestanden += 1;
    console.log(`  ok   ${name}`);
  } else {
    fehler.push(`${name}${hinweis ? ` - ${hinweis}` : ''}`);
    console.log(`  FEHL ${name}${hinweis ? ` - ${hinweis}` : ''}`);
  }
}

async function wirftHaFehler(aufruf) {
  try {
    await aufruf();
    return null;
  } catch (e) {
    return e;
  }
}

console.log('\nVerbindung');
await (async () => {
  let ok = true;
  try {
    await ha.pruefeVerbindung(verbindung);
  } catch {
    ok = false;
  }
  pruefe('gueltiges Token wird akzeptiert', ok);

  const e = await wirftHaFehler(() =>
    ha.pruefeVerbindung({ ...verbindung, token: 'falsch' }),
  );
  pruefe('falsches Token ergibt 401', e?.name === 'HaFehler' && e.status === 401, e?.message);

  // Schraegstrich am Ende und fehlendes Schema muessen toleriert werden.
  let normalisiert = true;
  try {
    await ha.pruefeVerbindung({ basis: `127.0.0.1:${PORT}/`, token: TEST_TOKEN });
  } catch {
    normalisiert = false;
  }
  pruefe('Adresse ohne Schema und mit Schraegstrich funktioniert', normalisiert);

  const weg = await wirftHaFehler(() =>
    ha.pruefeVerbindung({ basis: 'http://127.0.0.1:8198', token: TEST_TOKEN }),
  );
  pruefe('nicht erreichbarer Server ergibt HaFehler', weg?.name === 'HaFehler', weg?.message);
})();

console.log('\nZustaende laden und gruppieren');
const zustaende = await ha.ladeZustaende(verbindung);
pruefe('16 Entities geladen', zustaende.length === 16, `waren ${zustaende.length}`);

const gruppen = ha.gruppiere(zustaende);
const namen = gruppen.map((g) => g.name);
pruefe('Licht steht vorne', namen[0] === 'Licht', namen.join(', '));
pruefe('Sonstiges steht hinten', namen[namen.length - 1] === 'Sonstiges', namen.join(', '));
pruefe(
  'alle Geraete sind einer Gruppe zugeordnet',
  gruppen.reduce((summe, g) => summe + g.geraete.length, 0) === zustaende.length,
);
const licht = gruppen.find((g) => g.name === 'Licht');
pruefe('drei Lichter erkannt', licht?.geraete.length === 3, `waren ${licht?.geraete.length}`);
pruefe(
  'Lichter alphabetisch sortiert',
  licht?.geraete.map((z) => ha.anzeigeName(z)).join('|') === 'Flur|Küche Arbeitsplatte|Wohnzimmer Deckenlicht',
  licht?.geraete.map((z) => ha.anzeigeName(z)).join('|'),
);

console.log('\nDarstellung');
const ohneNamen = zustaende.find((z) => z.entity_id === 'sensor.ohne_namen');
pruefe('Name faellt ohne friendly_name auf die ID zurueck', ha.anzeigeName(ohneNamen) === 'ohne namen', ha.anzeigeName(ohneNamen));
const wohnzimmer = zustaende.find((z) => z.entity_id === 'light.wohnzimmer');
pruefe('"on" wird zu "an"', ha.zustandText(wohnzimmer) === 'an', ha.zustandText(wohnzimmer));
const temperatur = zustaende.find((z) => z.entity_id === 'sensor.aussentemperatur');
pruefe('Messwert bekommt seine Einheit', ha.zustandText(temperatur) === '8.4 °C', ha.zustandText(temperatur));
const tuer = zustaende.find((z) => z.entity_id === 'lock.haustuer');
pruefe('"locked" wird zu "verriegelt"', ha.zustandText(tuer) === 'verriegelt', ha.zustandText(tuer));
pruefe('Licht ist schaltbar', ha.istSchaltbar(wohnzimmer) === true);
pruefe('Sensor ist nicht schaltbar', ha.istSchaltbar(temperatur) === false);

console.log('\nSchalten');
await ha.schalte(verbindung, 'light.wohnzimmer');
const nachSchalten = await ha.ladeZustaende(verbindung);
const jetzt = nachSchalten.find((z) => z.entity_id === 'light.wohnzimmer');
pruefe('Licht ist nach dem Umschalten aus', jetzt?.state === 'off', `war ${jetzt?.state}`);
await ha.schalte(verbindung, 'light.wohnzimmer');
const wieder = (await ha.ladeZustaende(verbindung)).find((z) => z.entity_id === 'light.wohnzimmer');
pruefe('und danach wieder an', wieder?.state === 'on', `war ${wieder?.state}`);

const nichtSchaltbar = await wirftHaFehler(() => ha.schalte(verbindung, 'sensor.aussentemperatur'));
pruefe('Sensor schalten wird abgelehnt', nichtSchaltbar?.name === 'HaFehler', nichtSchaltbar?.message);

console.log('\nSprachagent');
const antwort = await ha.frage(verbindung, 'mach das Licht im Wohnzimmer aus');
pruefe(
  'Antworttext wird ausgelesen',
  antwort.text === 'Verstanden: mach das Licht im Wohnzimmer aus',
  antwort.text,
);
pruefe('Gespraechs-ID kommt zurueck', antwort.gespraechId === 'attrappe-gespraech-1', antwort.gespraechId);
const weiter = await ha.frage(verbindung, 'und die Kueche', 'eigene-id');
pruefe('vorhandene Gespraechs-ID wird weitergegeben', weiter.gespraechId === 'eigene-id', weiter.gespraechId);

server.close();

console.log(`\n${bestanden} bestanden, ${fehler.length} fehlgeschlagen`);
if (fehler.length > 0) {
  console.log('\nFehlgeschlagen:');
  for (const f of fehler) console.log(`  - ${f}`);
  process.exit(1);
}
