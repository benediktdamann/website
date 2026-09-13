/**
 * Client fuer die REST-API von Home Assistant.
 *
 * Bewusst ohne React-Native-Abhaengigkeiten, damit dieselbe Datei in der App
 * und in den Tests unter Node laeuft.
 */

export type Verbindung = {
  basis: string; // z.B. "http://192.168.1.50:8123"
  token: string; // Long-Lived Access Token aus dem HA-Profil
};

export type Zustand = {
  entity_id: string;
  state: string;
  attributes: { friendly_name?: string; unit_of_measurement?: string; [feld: string]: unknown };
  last_changed?: string;
};

export class HaFehler extends Error {
  constructor(
    nachricht: string,
    readonly status?: number,
  ) {
    super(nachricht);
    this.name = 'HaFehler';
  }
}

const ZEITGRENZE_MS = 10_000;

function bereinigeBasis(basis: string): string {
  const getrimmt = basis.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(getrimmt)) return `http://${getrimmt}`;
  return getrimmt;
}

async function anfrage<T>(
  verbindung: Verbindung,
  pfad: string,
  optionen: { methode?: 'GET' | 'POST'; koerper?: unknown } = {},
): Promise<T> {
  const steuerung = new AbortController();
  const uhr = setTimeout(() => steuerung.abort(), ZEITGRENZE_MS);

  try {
    const antwort = await fetch(`${bereinigeBasis(verbindung.basis)}${pfad}`, {
      method: optionen.methode ?? 'GET',
      signal: steuerung.signal,
      headers: {
        Authorization: `Bearer ${verbindung.token}`,
        'Content-Type': 'application/json',
      },
      body: optionen.koerper === undefined ? undefined : JSON.stringify(optionen.koerper),
    });

    if (antwort.status === 401) {
      throw new HaFehler('Das Zugriffstoken wird nicht akzeptiert.', 401);
    }
    if (!antwort.ok) {
      throw new HaFehler(`Home Assistant antwortete mit ${antwort.status}.`, antwort.status);
    }

    const text = await antwort.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch (fehler) {
    if (fehler instanceof HaFehler) throw fehler;
    if (fehler instanceof Error && fehler.name === 'AbortError') {
      throw new HaFehler('Keine Antwort. Läuft Home Assistant unter dieser Adresse?');
    }
    throw new HaFehler('Home Assistant ist nicht erreichbar.');
  } finally {
    clearTimeout(uhr);
  }
}

/** Prueft Adresse und Token. Der Schraegstrich am Ende von /api/ ist Pflicht. */
export async function pruefeVerbindung(verbindung: Verbindung): Promise<void> {
  const ergebnis = await anfrage<{ message?: string }>(verbindung, '/api/');
  if (!ergebnis?.message) {
    throw new HaFehler('Antwort sieht nicht nach Home Assistant aus.');
  }
}

export async function ladeZustaende(verbindung: Verbindung): Promise<Zustand[]> {
  const ergebnis = await anfrage<Zustand[]>(verbindung, '/api/states');
  return Array.isArray(ergebnis) ? ergebnis : [];
}

export function bereich(entityId: string): string {
  return entityId.split('.')[0] ?? '';
}

const SCHALTBAR = new Set(['light', 'switch', 'fan', 'input_boolean', 'siren', 'humidifier']);

export function istSchaltbar(zustand: Zustand): boolean {
  return SCHALTBAR.has(bereich(zustand.entity_id)) && zustand.state !== 'unavailable';
}

export async function schalte(verbindung: Verbindung, entityId: string): Promise<void> {
  const geraeteBereich = bereich(entityId);
  if (!SCHALTBAR.has(geraeteBereich)) {
    throw new HaFehler('Dieses Gerät lässt sich nicht einfach umschalten.');
  }
  await anfrage(verbindung, `/api/services/${geraeteBereich}/toggle`, {
    methode: 'POST',
    koerper: { entity_id: entityId },
  });
}

export type Antwort = { text: string; gespraechId?: string };

/** Schickt einen Satz an den Sprachagenten, den Home Assistant eingerichtet hat. */
export async function frage(
  verbindung: Verbindung,
  text: string,
  gespraechId?: string,
): Promise<Antwort> {
  const ergebnis = await anfrage<{
    response?: { speech?: { plain?: { speech?: string } } };
    conversation_id?: string;
  }>(verbindung, '/api/conversation/process', {
    methode: 'POST',
    koerper: {
      text,
      agent_id: 'homeassistant',
      language: 'de',
      ...(gespraechId ? { conversation_id: gespraechId } : {}),
    },
  });

  return {
    text: ergebnis?.response?.speech?.plain?.speech ?? 'Keine Antwort erhalten.',
    gespraechId: ergebnis?.conversation_id,
  };
}

// --- Darstellung ------------------------------------------------------------

const BEREICH_NAMEN: Record<string, string> = {
  light: 'Licht',
  switch: 'Schalter und Steckdosen',
  input_boolean: 'Schalter und Steckdosen',
  fan: 'Lüfter',
  climate: 'Heizung und Klima',
  cover: 'Rollläden',
  lock: 'Schlösser',
  media_player: 'Medien',
  vacuum: 'Staubsauger',
  sensor: 'Sensoren',
  binary_sensor: 'Sensoren',
  person: 'Anwesenheit',
  device_tracker: 'Anwesenheit',
  scene: 'Abläufe',
  script: 'Abläufe',
  automation: 'Abläufe',
};

const ZUSTAND_NAMEN: Record<string, string> = {
  on: 'an',
  off: 'aus',
  open: 'offen',
  closed: 'geschlossen',
  locked: 'verriegelt',
  unlocked: 'entriegelt',
  home: 'zuhause',
  not_home: 'unterwegs',
  unavailable: 'nicht erreichbar',
  unknown: 'unbekannt',
  idle: 'bereit',
  playing: 'spielt',
  paused: 'pausiert',
};

export function anzeigeName(zustand: Zustand): string {
  const freundlich = zustand.attributes?.friendly_name;
  if (typeof freundlich === 'string' && freundlich.length > 0) return freundlich;
  // Ohne friendly_name aus der Entity-ID etwas Lesbares machen.
  return (zustand.entity_id.split('.')[1] ?? zustand.entity_id).replace(/_/g, ' ');
}

export function zustandText(zustand: Zustand): string {
  const uebersetzt = ZUSTAND_NAMEN[zustand.state];
  if (uebersetzt) return uebersetzt;

  const einheit = zustand.attributes?.unit_of_measurement;
  return typeof einheit === 'string' ? `${zustand.state} ${einheit}` : zustand.state;
}

export function bereichName(entityId: string): string {
  return BEREICH_NAMEN[bereich(entityId)] ?? 'Sonstiges';
}

export type Gruppe = { name: string; geraete: Zustand[] };

/** Sortiert die Entities in verstaendlich benannte Gruppen. */
export function gruppiere(zustaende: Zustand[]): Gruppe[] {
  const nachName = new Map<string, Zustand[]>();

  for (const zustand of zustaende) {
    const name = bereichName(zustand.entity_id);
    const liste = nachName.get(name);
    if (liste) liste.push(zustand);
    else nachName.set(name, [zustand]);
  }

  // Schaltbares zuerst, "Sonstiges" zuletzt.
  const reihenfolge = [
    'Licht',
    'Schalter und Steckdosen',
    'Lüfter',
    'Heizung und Klima',
    'Rollläden',
    'Schlösser',
    'Medien',
    'Staubsauger',
    'Anwesenheit',
    'Sensoren',
    'Abläufe',
    'Sonstiges',
  ];

  // Unbekannte Gruppennamen sollen hinten landen, nicht vorne (indexOf gibt -1).
  const rang = (name: string) => {
    const platz = reihenfolge.indexOf(name);
    return platz === -1 ? Number.MAX_SAFE_INTEGER : platz;
  };

  return [...nachName.entries()]
    .map(([name, geraete]) => ({
      name,
      geraete: geraete.sort((a, b) => anzeigeName(a).localeCompare(anzeigeName(b), 'de')),
    }))
    .sort((a, b) => rang(a.name) - rang(b.name));
}
