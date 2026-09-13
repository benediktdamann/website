import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { HaFehler, frage, type Verbindung } from '../homeassistant';
import { FARBEN } from './thema';

type Nachricht = { id: string; von: 'ich' | 'haus'; text: string; fehler?: boolean };

const BEISPIELE = [
  'Mach das Licht im Wohnzimmer aus',
  'Welche Lichter sind noch an?',
  'Wie warm ist es draußen?',
];

export function Sprechen({ verbindung }: { verbindung: Verbindung }) {
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([]);
  const [eingabe, setEingabe] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const gespraechId = useRef<string | undefined>(undefined);
  const rolle = useRef<ScrollView | null>(null);

  const senden = useCallback(
    async (text: string) => {
      const sauber = text.trim();
      if (!sauber || laeuft) return;

      const meine: Nachricht = { id: `${Date.now()}-ich`, von: 'ich', text: sauber };
      setNachrichten((bisher) => [...bisher, meine]);
      setEingabe('');
      setLaeuft(true);

      try {
        const antwort = await frage(verbindung, sauber, gespraechId.current);
        gespraechId.current = antwort.gespraechId;
        setNachrichten((bisher) => [
          ...bisher,
          { id: `${Date.now()}-haus`, von: 'haus', text: antwort.text },
        ]);
      } catch (e) {
        setNachrichten((bisher) => [
          ...bisher,
          {
            id: `${Date.now()}-fehler`,
            von: 'haus',
            fehler: true,
            text:
              e instanceof HaFehler
                ? `${e.message}\n\nIst in Home Assistant ein Sprachagent eingerichtet? Ohne einen Agenten kann nichts antworten.`
                : 'Es kam keine Antwort.',
          },
        ]);
      } finally {
        setLaeuft(false);
      }
    },
    [laeuft, verbindung],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={stile.rahmen}
    >
      <ScrollView
        ref={rolle}
        contentContainerStyle={stile.verlauf}
        onContentSizeChange={() => rolle.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {nachrichten.length === 0 ? (
          <View style={stile.leer}>
            <Text style={stile.leerTitel}>Sag deinem Zuhause, was passieren soll</Text>
            <Text style={stile.leerText}>
              Die Antwort kommt von dem Sprachagenten, den du in Home Assistant eingerichtet hast.
            </Text>
            <View style={stile.beispiele}>
              {BEISPIELE.map((beispiel) => (
                <Pressable key={beispiel} onPress={() => senden(beispiel)} style={stile.beispiel}>
                  <Text style={stile.beispielText}>{beispiel}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          nachrichten.map((nachricht) => (
            <View
              key={nachricht.id}
              style={[
                stile.blase,
                nachricht.von === 'ich' ? stile.blaseIch : stile.blaseHaus,
                nachricht.fehler && stile.blaseFehler,
              ]}
            >
              <Text
                style={[
                  stile.blaseText,
                  nachricht.von === 'ich' && stile.blaseTextIch,
                  nachricht.fehler && stile.blaseTextFehler,
                ]}
              >
                {nachricht.text}
              </Text>
            </View>
          ))
        )}
        {laeuft ? <ActivityIndicator color={FARBEN.gedaempft} style={stile.warten} /> : null}
      </ScrollView>

      <View style={stile.leiste}>
        <TextInput
          value={eingabe}
          onChangeText={setEingabe}
          placeholder="Was soll passieren?"
          placeholderTextColor={FARBEN.gedaempft}
          style={stile.eingabe}
          onSubmitEditing={() => senden(eingabe)}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          onPress={() => senden(eingabe)}
          disabled={eingabe.trim().length === 0 || laeuft}
          style={[stile.senden, (eingabe.trim().length === 0 || laeuft) && stile.sendenAus]}
        >
          <Text style={stile.sendenText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const stile = StyleSheet.create({
  rahmen: { flex: 1 },
  verlauf: { padding: 20, gap: 10, flexGrow: 1 },
  leer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  leerTitel: {
    color: FARBEN.text,
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  leerText: {
    color: FARBEN.gedaempft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  beispiele: { marginTop: 28, gap: 8, alignSelf: 'stretch' },
  beispiel: { backgroundColor: FARBEN.karte, borderRadius: 13, paddingVertical: 13, paddingHorizontal: 16 },
  beispielText: { color: FARBEN.text, fontSize: 15 },

  blase: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12 },
  blaseIch: { alignSelf: 'flex-end', backgroundColor: FARBEN.akzent },
  blaseHaus: { alignSelf: 'flex-start', backgroundColor: FARBEN.karte },
  blaseFehler: { backgroundColor: '#2A1618' },
  blaseText: { color: FARBEN.text, fontSize: 16, lineHeight: 22 },
  blaseTextIch: { color: FARBEN.grund, fontWeight: '600' },
  blaseTextFehler: { color: FARBEN.gefahr },
  warten: { alignSelf: 'flex-start', marginTop: 4 },

  leiste: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C313C',
  },
  eingabe: {
    flex: 1,
    backgroundColor: FARBEN.feld,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: FARBEN.text,
    fontSize: 16,
  },
  senden: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: FARBEN.akzent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendenAus: { opacity: 0.35 },
  sendenText: { color: FARBEN.grund, fontSize: 22, fontWeight: '700', marginTop: -2 },
});
