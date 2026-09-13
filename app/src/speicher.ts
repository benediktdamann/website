import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Verbindung } from './homeassistant';

const SCHLUESSEL = 'verbindung.v1';

export async function ladeVerbindung(): Promise<Verbindung | null> {
  try {
    const roh = await AsyncStorage.getItem(SCHLUESSEL);
    if (!roh) return null;
    const gelesen = JSON.parse(roh) as Partial<Verbindung>;
    if (!gelesen.basis || !gelesen.token) return null;
    return { basis: gelesen.basis, token: gelesen.token };
  } catch {
    return null;
  }
}

export async function speichereVerbindung(verbindung: Verbindung): Promise<void> {
  await AsyncStorage.setItem(SCHLUESSEL, JSON.stringify(verbindung));
}

export async function loescheVerbindung(): Promise<void> {
  await AsyncStorage.removeItem(SCHLUESSEL);
}
