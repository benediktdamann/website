import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import {
  Frist,
  alsIso,
  dringlichkeit,
  formatiereDatum,
  ladeFristen,
  nachDatum,
  restText,
  speichereFristen,
  tageBis,
} from './src/fristen';
import { erlaubnisEinholen, loescheErinnerung, planeErinnerung } from './src/erinnerungen';

const VORLAUF_OPTIONEN = [1, 7, 14, 30];

// Haptik gibt es nur auf echten Geraeten - im Browser still ignorieren.
function vibrieren(ausloesen: () => Promise<void>) {
  ausloesen().catch(() => {});
}

function Kopf({ anzahl, onNeu }: { anzahl: number; onNeu: () => void }) {
  return (
    <View style={stile.kopf}>
      <View>
        <Text style={stile.titel}>Fristen</Text>
        <Text style={stile.untertitel}>
          {anzahl === 0 ? 'Nichts eingetragen' : `${anzahl} ${anzahl === 1 ? 'Eintrag' : 'Einträge'}`}
        </Text>
      </View>
      <Pressable
        onPress={onNeu}
        style={({ pressed }) => [stile.neuKnopf, pressed && stile.gedrueckt]}
        accessibilityLabel="Neue Frist anlegen"
      >
        <Text style={stile.neuKnopfText}>+</Text>
      </Pressable>
    </View>
  );
}

function FristZeile({ frist, onLoeschen }: { frist: Frist; onLoeschen: (f: Frist) => void }) {
  const tage = tageBis(frist.datum);
  const stufe = dringlichkeit(tage);
  const farbe = stufe === 'ueberfaellig' ? GEFAHR : stufe === 'bald' ? AKZENT : RUHIG;

  return (
    <Pressable
      onLongPress={() => onLoeschen(frist)}
      style={({ pressed }) => [stile.zeile, pressed && stile.gedrueckt]}
    >
      <View style={[stile.streifen, { backgroundColor: farbe }]} />
      <View style={stile.zeileText}>
        <Text style={stile.zeileTitel} numberOfLines={1}>
          {frist.titel}
        </Text>
        <Text style={stile.zeileDatum}>{formatiereDatum(frist.datum)}</Text>
      </View>
      <Text style={[stile.zeileRest, { color: farbe }]}>{restText(tage)}</Text>
    </Pressable>
  );
}

function Bildschirm() {
  const raender = useSafeAreaInsets();
  const [fristen, setFristen] = useState<Frist[]>([]);
  const [geladen, setGeladen] = useState(false);

  const [formOffen, setFormOffen] = useState(false);
  const [titel, setTitel] = useState('');
  const [datum, setDatum] = useState(() => {
    const inEinemJahr = new Date();
    inEinemJahr.setFullYear(inEinemJahr.getFullYear() + 1);
    return inEinemJahr;
  });
  const [vorlaufTage, setVorlaufTage] = useState(14);

  useEffect(() => {
    (async () => {
      setFristen(await ladeFristen());
      setGeladen(true);
      erlaubnisEinholen();
    })();
  }, []);

  const sortiert = useMemo(() => [...fristen].sort(nachDatum), [fristen]);

  const sichern = useCallback(async (naechste: Frist[]) => {
    setFristen(naechste);
    await speichereFristen(naechste);
  }, []);

  const formSchliessen = useCallback(() => {
    setFormOffen(false);
    setTitel('');
    setVorlaufTage(14);
  }, []);

  const anlegen = useCallback(async () => {
    const sauber = titel.trim();
    if (!sauber) return;

    const neu: Frist = {
      id: `${Date.now()}`,
      titel: sauber,
      datum: alsIso(datum),
      vorlaufTage,
    };
    neu.erinnerungId = await planeErinnerung(neu);

    vibrieren(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    await sichern([...fristen, neu]);
    formSchliessen();
  }, [datum, formSchliessen, fristen, sichern, titel, vorlaufTage]);

  const loeschen = useCallback(
    (frist: Frist) => {
      Alert.alert(frist.titel, 'Diese Frist löschen?', [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await loescheErinnerung(frist.erinnerungId);
            vibrieren(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
            await sichern(fristen.filter((eintrag) => eintrag.id !== frist.id));
          },
        },
      ]);
    },
    [fristen, sichern],
  );

  return (
    <View style={[stile.buehne, { paddingTop: raender.top }]}>
      <StatusBar style="light" />
      <Kopf anzahl={fristen.length} onNeu={() => setFormOffen(true)} />

      <ScrollView
        contentContainerStyle={[stile.liste, { paddingBottom: raender.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {!geladen ? null : sortiert.length === 0 ? (
          <View style={stile.leer}>
            <Text style={stile.leerTitel}>Noch keine Frist</Text>
            <Text style={stile.leerText}>
              TÜV, Versicherung, Garantie, Pass – alles, was abläuft und teuer wird, wenn man es
              verpasst.{'\n\n'}Tippe auf das Plus.
            </Text>
          </View>
        ) : (
          <>
            {sortiert.map((frist) => (
              <FristZeile key={frist.id} frist={frist} onLoeschen={loeschen} />
            ))}
            <Text style={stile.hinweis}>Zum Löschen lange auf einen Eintrag tippen</Text>
          </>
        )}
      </ScrollView>

      <Modal visible={formOffen} animationType="slide" transparent onRequestClose={formSchliessen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={stile.modalHintergrund}
        >
          <View style={[stile.modalBlatt, { paddingBottom: raender.bottom + 20 }]}>
            <Text style={stile.modalTitel}>Neue Frist</Text>

            <TextInput
              value={titel}
              onChangeText={setTitel}
              placeholder="Wofür? z.B. TÜV Golf"
              placeholderTextColor={GEDAEMPFT}
              style={stile.eingabe}
              autoFocus
              returnKeyType="done"
            />

            <Text style={stile.feldName}>Fällig am</Text>
            <View style={stile.waehlerRahmen}>
              <DateTimePicker
                value={datum}
                mode="date"
                display="spinner"
                locale="de-DE"
                minimumDate={new Date()}
                themeVariant="dark"
                onChange={(_, gewaehlt) => gewaehlt && setDatum(gewaehlt)}
                style={stile.waehler}
              />
            </View>

            <Text style={stile.feldName}>Erinnern</Text>
            <View style={stile.vorlaufReihe}>
              {VORLAUF_OPTIONEN.map((tage) => {
                const aktiv = tage === vorlaufTage;
                return (
                  <Pressable
                    key={tage}
                    onPress={() => setVorlaufTage(tage)}
                    style={[stile.vorlaufKnopf, aktiv && stile.vorlaufKnopfAktiv]}
                  >
                    <Text style={[stile.vorlaufText, aktiv && stile.vorlaufTextAktiv]}>
                      {tage === 1 ? '1 Tag' : `${tage} Tage`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={stile.feldHinweis}>vorher, morgens um 9 Uhr</Text>

            <View style={stile.modalKnoepfe}>
              <Pressable onPress={formSchliessen} style={[stile.knopf, stile.knopfLeise]}>
                <Text style={stile.knopfLeiseText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                onPress={anlegen}
                disabled={titel.trim().length === 0}
                style={[stile.knopf, stile.knopfStark, titel.trim().length === 0 && stile.knopfAus]}
              >
                <Text style={stile.knopfStarkText}>Sichern</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Bildschirm />
    </SafeAreaProvider>
  );
}

const DUNKEL = '#14161B';
const KARTE = '#1D212A';
const HELL = '#F5F3EF';
const GEDAEMPFT = '#767D8A';
const AKZENT = '#E8734A';
const GEFAHR = '#E5484D';
const RUHIG = '#5B9E7E';

const stile = StyleSheet.create({
  buehne: { flex: 1, backgroundColor: DUNKEL },
  kopf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  titel: { color: HELL, fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  untertitel: { color: GEDAEMPFT, fontSize: 14, marginTop: 2 },
  neuKnopf: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AKZENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neuKnopfText: { color: DUNKEL, fontSize: 30, fontWeight: '600', marginTop: -3 },
  gedrueckt: { opacity: 0.65 },

  liste: { paddingHorizontal: 20, gap: 10 },
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KARTE,
    borderRadius: 16,
    paddingRight: 16,
    overflow: 'hidden',
  },
  streifen: { width: 4, alignSelf: 'stretch' },
  zeileText: { flex: 1, paddingVertical: 16, paddingLeft: 14 },
  zeileTitel: { color: HELL, fontSize: 17, fontWeight: '600' },
  zeileDatum: { color: GEDAEMPFT, fontSize: 14, marginTop: 3 },
  zeileRest: { fontSize: 14, fontWeight: '600', textAlign: 'right', maxWidth: 120 },

  leer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 16 },
  leerTitel: { color: HELL, fontSize: 19, fontWeight: '600', marginBottom: 10 },
  leerText: { color: GEDAEMPFT, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  hinweis: { color: GEDAEMPFT, fontSize: 13, textAlign: 'center', marginTop: 18 },

  modalHintergrund: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' },
  modalBlatt: {
    backgroundColor: KARTE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  modalTitel: { color: HELL, fontSize: 21, fontWeight: '700', marginBottom: 18 },
  eingabe: {
    backgroundColor: DUNKEL,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: HELL,
    fontSize: 16,
  },
  feldName: {
    color: GEDAEMPFT,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
  },
  feldHinweis: { color: GEDAEMPFT, fontSize: 13, marginTop: 8 },
  waehlerRahmen: { backgroundColor: DUNKEL, borderRadius: 13, overflow: 'hidden' },
  waehler: { height: 160 },

  vorlaufReihe: { flexDirection: 'row', gap: 8 },
  vorlaufKnopf: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: DUNKEL,
    alignItems: 'center',
  },
  vorlaufKnopfAktiv: { backgroundColor: AKZENT },
  vorlaufText: { color: GEDAEMPFT, fontSize: 14, fontWeight: '600' },
  vorlaufTextAktiv: { color: DUNKEL },

  modalKnoepfe: { flexDirection: 'row', gap: 10, marginTop: 26 },
  knopf: { flex: 1, paddingVertical: 15, borderRadius: 13, alignItems: 'center' },
  knopfLeise: { backgroundColor: DUNKEL },
  knopfLeiseText: { color: GEDAEMPFT, fontSize: 16, fontWeight: '600' },
  knopfStark: { backgroundColor: AKZENT },
  knopfStarkText: { color: DUNKEL, fontSize: 16, fontWeight: '700' },
  knopfAus: { opacity: 0.4 },
});
