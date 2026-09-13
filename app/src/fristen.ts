import AsyncStorage from '@react-native-async-storage/async-storage';

export type Frist = {
  id: string;
  titel: string;
  datum: string;        // ISO-Tag, z.B. "2026-11-04"
  vorlaufTage: number;  // wie viele Tage vorher erinnert wird
  erinnerungId?: string;
};

const SPEICHER_SCHLUESSEL = 'fristen.v1';

export async function ladeFristen(): Promise<Frist[]> {
  try {
    const roh = await AsyncStorage.getItem(SPEICHER_SCHLUESSEL);
    return roh ? (JSON.parse(roh) as Frist[]) : [];
  } catch {
    // Lieber leer starten als abstuerzen, wenn der Speicher kaputt ist.
    return [];
  }
}

export async function speichereFristen(fristen: Frist[]): Promise<void> {
  await AsyncStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(fristen));
}

// Uhrzeiten wegschneiden, sonst kippt die Tagesdifferenz je nach Tageszeit.
function aufTagKuerzen(zeitpunkt: Date): Date {
  return new Date(zeitpunkt.getFullYear(), zeitpunkt.getMonth(), zeitpunkt.getDate());
}

export function alsDatum(iso: string): Date {
  const [jahr, monat, tag] = iso.split('-').map(Number);
  return new Date(jahr, monat - 1, tag);
}

export function alsIso(zeitpunkt: Date): string {
  const monat = String(zeitpunkt.getMonth() + 1).padStart(2, '0');
  const tag = String(zeitpunkt.getDate()).padStart(2, '0');
  return `${zeitpunkt.getFullYear()}-${monat}-${tag}`;
}

export function tageBis(iso: string): number {
  const ziel = aufTagKuerzen(alsDatum(iso)).getTime();
  const heute = aufTagKuerzen(new Date()).getTime();
  return Math.round((ziel - heute) / 86_400_000);
}

export function formatiereDatum(iso: string): string {
  return alsDatum(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function restText(tage: number): string {
  if (tage === 0) return 'Heute fällig';
  if (tage === 1) return 'Morgen fällig';
  if (tage === -1) return 'Seit gestern überfällig';
  if (tage < 0) return `Seit ${Math.abs(tage)} Tagen überfällig`;
  return `In ${tage} Tagen`;
}

export type Dringlichkeit = 'ueberfaellig' | 'bald' | 'ruhig';

export function dringlichkeit(tage: number): Dringlichkeit {
  if (tage < 0) return 'ueberfaellig';
  if (tage <= 14) return 'bald';
  return 'ruhig';
}

export function nachDatum(a: Frist, b: Frist): number {
  return a.datum.localeCompare(b.datum);
}
