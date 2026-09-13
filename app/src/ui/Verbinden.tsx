import { useState } from 'react';
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
import { HaFehler, pruefeVerbindung, type Verbindung } from '../homeassistant';
import { FARBEN } from './thema';

type Eigenschaften = {
  vorbelegt?: Verbindung | null;
  onVerbunden: (verbindung: Verbindung) => void;
};

export function Verbinden({ vorbelegt, onVerbunden }: Eigenschaften) {
  const [basis, setBasis] = useState(vorbelegt?.basis ?? '');
  const [token, setToken] = useState(vorbelegt?.token ?? '');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const bereit = basis.trim().length > 0 && token.trim().length > 0;

  async function verbinden() {
    setFehler(null);
    setLaeuft(true);
    const verbindung: Verbindung = { basis: basis.trim(), token: token.trim() };
    try {
      await pruefeVerbindung(verbindung);
      onVerbunden(verbindung);
    } catch (e) {
      setFehler(e instanceof HaFehler ? e.message : 'Verbindung fehlgeschlagen.');
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={stile.rahmen}
    >
      <ScrollView contentContainerStyle={stile.inhalt} keyboardShouldPersistTaps="handled">
        <Text style={stile.titel}>Zuhause verbinden</Text>
        <Text style={stile.einleitung}>
          Diese App ist die Oberfläche für dein Home Assistant. Sie braucht die Adresse im Netzwerk
          und ein Zugriffstoken.
        </Text>

        <Text style={stile.feldName}>Adresse</Text>
        <TextInput
          value={basis}
          onChangeText={setBasis}
          placeholder="http://192.168.1.50:8123"
          placeholderTextColor={FARBEN.gedaempft}
          style={stile.eingabe}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={stile.feldName}>Zugriffstoken</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Langes Token einfügen"
          placeholderTextColor={FARBEN.gedaempft}
          style={[stile.eingabe, stile.eingabeLang]}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <Text style={stile.hilfe}>
          Das Token erzeugst du in Home Assistant unten links über dein Profil, ganz unten unter
          „Langlebige Zugriffstokens".
        </Text>

        {fehler ? (
          <View style={stile.fehlerFeld}>
            <Text style={stile.fehlerText}>{fehler}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={verbinden}
          disabled={!bereit || laeuft}
          style={[stile.knopf, (!bereit || laeuft) && stile.knopfAus]}
        >
          {laeuft ? (
            <ActivityIndicator color={FARBEN.grund} />
          ) : (
            <Text style={stile.knopfText}>Verbinden</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stile = StyleSheet.create({
  rahmen: { flex: 1 },
  inhalt: { padding: 20, paddingBottom: 40 },
  titel: { color: FARBEN.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  einleitung: { color: FARBEN.gedaempft, fontSize: 15, lineHeight: 22, marginTop: 10 },
  feldName: {
    color: FARBEN.gedaempft,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 26,
    marginBottom: 8,
  },
  eingabe: {
    backgroundColor: FARBEN.feld,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: FARBEN.text,
    fontSize: 16,
  },
  eingabeLang: { minHeight: 90, textAlignVertical: 'top' },
  hilfe: { color: FARBEN.gedaempft, fontSize: 13, lineHeight: 19, marginTop: 10 },
  fehlerFeld: {
    backgroundColor: '#2A1618',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  fehlerText: { color: FARBEN.gefahr, fontSize: 14, lineHeight: 20 },
  knopf: {
    backgroundColor: FARBEN.akzent,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 26,
  },
  knopfAus: { opacity: 0.4 },
  knopfText: { color: FARBEN.grund, fontSize: 16, fontWeight: '700' },
});
