import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Verbindung } from './src/homeassistant';
import { ladeVerbindung, loescheVerbindung, speichereVerbindung } from './src/speicher';
import { Geraete } from './src/ui/Geraete';
import { Sprechen } from './src/ui/Sprechen';
import { Verbinden } from './src/ui/Verbinden';
import { FARBEN } from './src/ui/thema';

type Reiter = 'geraete' | 'sprechen';

function Bildschirm() {
  const raender = useSafeAreaInsets();
  const [verbindung, setVerbindung] = useState<Verbindung | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [reiter, setReiter] = useState<Reiter>('geraete');

  useEffect(() => {
    (async () => {
      setVerbindung(await ladeVerbindung());
      setGeladen(true);
    })();
  }, []);

  const verbunden = useCallback(async (neu: Verbindung) => {
    await speichereVerbindung(neu);
    setVerbindung(neu);
  }, []);

  const trennen = useCallback(async () => {
    await loescheVerbindung();
    setVerbindung(null);
  }, []);

  if (!geladen) {
    return (
      <View style={[stile.buehne, stile.mitte]}>
        <ActivityIndicator color={FARBEN.akzent} />
      </View>
    );
  }

  if (!verbindung) {
    return (
      <View style={[stile.buehne, { paddingTop: raender.top, paddingBottom: raender.bottom }]}>
        <Verbinden onVerbunden={verbunden} />
      </View>
    );
  }

  return (
    <View style={[stile.buehne, { paddingTop: raender.top }]}>
      <View style={stile.kopf}>
        <View style={stile.kopfText}>
          <Text style={stile.titel}>Zuhause</Text>
          <Text style={stile.adresse} numberOfLines={1}>
            {verbindung.basis}
          </Text>
        </View>
        <Pressable onPress={trennen} style={stile.trennen}>
          <Text style={stile.trennenText}>Trennen</Text>
        </Pressable>
      </View>

      <View style={stile.reiter}>
        {(
          [
            ['geraete', 'Geräte'],
            ['sprechen', 'Sprechen'],
          ] as const
        ).map(([wert, name]) => {
          const aktiv = reiter === wert;
          return (
            <Pressable
              key={wert}
              onPress={() => setReiter(wert)}
              style={[stile.reiterKnopf, aktiv && stile.reiterKnopfAktiv]}
            >
              <Text style={[stile.reiterText, aktiv && stile.reiterTextAktiv]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[stile.inhalt, { paddingBottom: reiter === 'sprechen' ? raender.bottom : 0 }]}>
        {reiter === 'geraete' ? (
          <Geraete verbindung={verbindung} />
        ) : (
          <Sprechen verbindung={verbindung} />
        )}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Bildschirm />
    </SafeAreaProvider>
  );
}

const stile = StyleSheet.create({
  buehne: { flex: 1, backgroundColor: FARBEN.grund },
  mitte: { alignItems: 'center', justifyContent: 'center' },
  kopf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  kopfText: { flex: 1 },
  titel: { color: FARBEN.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  adresse: { color: FARBEN.gedaempft, fontSize: 13, marginTop: 2 },
  trennen: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: FARBEN.karte,
  },
  trennenText: { color: FARBEN.gedaempft, fontSize: 14, fontWeight: '600' },
  reiter: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: FARBEN.feld,
    borderRadius: 13,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 18,
  },
  reiterKnopf: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  reiterKnopfAktiv: { backgroundColor: FARBEN.karte },
  reiterText: { color: FARBEN.gedaempft, fontSize: 15, fontWeight: '600' },
  reiterTextAktiv: { color: FARBEN.text },
  inhalt: { flex: 1, marginTop: 8 },
});
