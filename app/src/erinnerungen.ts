import * as Notifications from 'expo-notifications';
import { Frist, alsDatum, formatiereDatum } from './fristen';

// Legt fest, wie eine Benachrichtigung aussieht, waehrend die App offen ist.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ERINNERUNGS_STUNDE = 9; // morgens um 9 wird erinnert

export async function erlaubnisEinholen(): Promise<boolean> {
  const vorhanden = await Notifications.getPermissionsAsync();
  if (vorhanden.granted) return true;

  const angefragt = await Notifications.requestPermissionsAsync();
  return angefragt.granted;
}

/**
 * Plant die Erinnerung fuer eine Frist und gibt deren ID zurueck.
 * Liegt der Termin schon in der Vergangenheit, wird nichts geplant -
 * iOS stellt vergangene Benachrichtigungen nicht mehr zu.
 */
export async function planeErinnerung(frist: Frist): Promise<string | undefined> {
  const ziel = alsDatum(frist.datum);
  const weckzeit = new Date(
    ziel.getFullYear(),
    ziel.getMonth(),
    ziel.getDate() - frist.vorlaufTage,
    ERINNERUNGS_STUNDE,
    0,
    0,
  );

  if (weckzeit.getTime() <= Date.now()) return undefined;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: frist.titel,
        body: `Fällig am ${formatiereDatum(frist.datum)}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: weckzeit,
      },
    });
  } catch {
    // Ohne Erlaubnis schlaegt das Planen fehl - die Frist bleibt trotzdem gespeichert.
    return undefined;
  }
}

export async function loescheErinnerung(id?: string): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // War schon weg - nicht weiter schlimm.
  }
}
