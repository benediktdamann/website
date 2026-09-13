import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  HaFehler,
  anzeigeName,
  gruppiere,
  istSchaltbar,
  ladeZustaende,
  schalte,
  zustandText,
  type Verbindung,
  type Zustand,
} from '../homeassistant';
import { FARBEN } from './thema';

function vibrieren(ausloesen: () => Promise<void>) {
  ausloesen().catch(() => {});
}

function Geraet({
  zustand,
  onSchalten,
}: {
  zustand: Zustand;
  onSchalten: (zustand: Zustand) => void;
}) {
  const schaltbar = istSchaltbar(zustand);
  const an = zustand.state === 'on';

  return (
    <Pressable
      onPress={schaltbar ? () => onSchalten(zustand) : undefined}
      style={({ pressed }) => [stile.zeile, pressed && schaltbar && stile.gedrueckt]}
    >
      <View style={stile.zeileText}>
        <Text style={stile.name} numberOfLines={1}>
          {anzeigeName(zustand)}
        </Text>
        <Text style={stile.id} numberOfLines={1}>
          {zustand.entity_id}
        </Text>
      </View>

      {schaltbar ? (
        <View style={[stile.schalter, an && stile.schalterAn]}>
          <Text style={[stile.schalterText, an && stile.schalterTextAn]}>{an ? 'an' : 'aus'}</Text>
        </View>
      ) : (
        <Text style={stile.wert}>{zustandText(zustand)}</Text>
      )}
    </Pressable>
  );
}

export function Geraete({ verbindung }: { verbindung: Verbindung }) {
  const [zustaende, setZustaende] = useState<Zustand[]>([]);
  const [laeuft, setLaeuft] = useState(true);
  const [aktualisiert, setAktualisiert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const holen = useCallback(async () => {
    try {
      setZustaende(await ladeZustaende(verbindung));
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof HaFehler ? e.message : 'Geräte konnten nicht geladen werden.');
    }
  }, [verbindung]);

  useEffect(() => {
    (async () => {
      await holen();
      setLaeuft(false);
    })();
  }, [holen]);

  const umschalten = useCallback(
    async (zustand: Zustand) => {
      vibrieren(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

      // Sofort umschalten, damit es sich schnell anfuehlt - und bei Fehlern zuruecknehmen.
      const vorher = zustaende;
      setZustaende((bisher) =>
        bisher.map((eintrag) =>
          eintrag.entity_id === zustand.entity_id
            ? { ...eintrag, state: eintrag.state === 'on' ? 'off' : 'on' }
            : eintrag,
        ),
      );

      try {
        await schalte(verbindung, zustand.entity_id);
        await holen();
      } catch (e) {
        setZustaende(vorher);
        setFehler(e instanceof HaFehler ? e.message : 'Schalten fehlgeschlagen.');
      }
    },
    [holen, verbindung, zustaende],
  );

  if (laeuft) {
    return (
      <View style={stile.mitte}>
        <ActivityIndicator color={FARBEN.akzent} />
      </View>
    );
  }

  const gruppen = gruppiere(zustaende);

  return (
    <ScrollView
      contentContainerStyle={stile.inhalt}
      refreshControl={
        <RefreshControl
          refreshing={aktualisiert}
          tintColor={FARBEN.gedaempft}
          onRefresh={async () => {
            setAktualisiert(true);
            await holen();
            setAktualisiert(false);
          }}
        />
      }
    >
      {fehler ? (
        <View style={stile.fehlerFeld}>
          <Text style={stile.fehlerText}>{fehler}</Text>
        </View>
      ) : null}

      {gruppen.length === 0 ? (
        <Text style={stile.leer}>Home Assistant meldet keine Geräte.</Text>
      ) : (
        gruppen.map((gruppe) => (
          <View key={gruppe.name} style={stile.gruppe}>
            <Text style={stile.gruppeName}>{gruppe.name}</Text>
            <View style={stile.karte}>
              {gruppe.geraete.map((zustand, platz) => (
                <View key={zustand.entity_id}>
                  {platz > 0 ? <View style={stile.trenner} /> : null}
                  <Geraet zustand={zustand} onSchalten={umschalten} />
                </View>
              ))}
            </View>
          </View>
        ))
      )}

      <Text style={stile.hinweis}>Nach unten ziehen, um zu aktualisieren</Text>
    </ScrollView>
  );
}

const stile = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inhalt: { padding: 20, paddingBottom: 40 },
  gruppe: { marginBottom: 24 },
  gruppeName: {
    color: FARBEN.gedaempft,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  karte: { backgroundColor: FARBEN.karte, borderRadius: 16, overflow: 'hidden' },
  trenner: { height: StyleSheet.hairlineWidth, backgroundColor: '#2C313C', marginLeft: 16 },
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  gedrueckt: { backgroundColor: '#242935' },
  zeileText: { flex: 1 },
  name: { color: FARBEN.text, fontSize: 16, fontWeight: '600' },
  id: { color: FARBEN.gedaempft, fontSize: 12, marginTop: 3 },
  wert: { color: FARBEN.gedaempft, fontSize: 15, fontWeight: '600' },
  schalter: {
    minWidth: 58,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: FARBEN.feld,
    alignItems: 'center',
  },
  schalterAn: { backgroundColor: FARBEN.akzent },
  schalterText: { color: FARBEN.gedaempft, fontSize: 14, fontWeight: '700' },
  schalterTextAn: { color: FARBEN.grund },
  fehlerFeld: { backgroundColor: '#2A1618', borderRadius: 12, padding: 14, marginBottom: 20 },
  fehlerText: { color: FARBEN.gefahr, fontSize: 14, lineHeight: 20 },
  leer: { color: FARBEN.gedaempft, fontSize: 15, textAlign: 'center', marginTop: 60 },
  hinweis: { color: FARBEN.gedaempft, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
