import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

// Welche Felder eines 3x3-Rasters bei welcher Augenzahl gefuellt sind.
const AUGEN_RASTER: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const SCHUETTEL_SCHWELLE = 1.8; // g-Kraft, ab der ein Schuetteln als Wurf zaehlt
const WURF_DAUER = 700;         // ms, wie lange der Wuerfel rollt
const FLACKER_TAKT = 60;        // ms zwischen den Zwischenbildern

function zufallsAugen() {
  return Math.floor(Math.random() * 6) + 1;
}

// Haptik gibt es nur auf echten Geraeten - im Browser einfach still ignorieren.
function vibrieren(fn: () => Promise<void>) {
  fn().catch(() => {});
}

export default function App() {
  const [augen, setAugen] = useState(zufallsAugen);
  const [verlauf, setVerlauf] = useState<number[]>([]);

  // Der Sensor-Callback liest den Zustand direkt, deshalb zusaetzlich als Ref.
  const rolltRef = useRef(false);
  const flackerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skalierung = useRef(new Animated.Value(1)).current;
  const drehung = useRef(new Animated.Value(0)).current;

  const wuerfeln = useCallback(() => {
    if (rolltRef.current) return;
    rolltRef.current = true;

    vibrieren(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

    // Waehrend des Wurfs schnell durch zufaellige Seiten blitzen.
    flackerRef.current = setInterval(() => setAugen(zufallsAugen()), FLACKER_TAKT);

    drehung.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(skalierung, { toValue: 0.8, duration: 120, useNativeDriver: true }),
        Animated.spring(skalierung, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      Animated.timing(drehung, {
        toValue: 1,
        duration: WURF_DAUER,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    endeRef.current = setTimeout(() => {
      if (flackerRef.current) clearInterval(flackerRef.current);
      const ergebnis = zufallsAugen();
      setAugen(ergebnis);
      setVerlauf((bisher) => [ergebnis, ...bisher].slice(0, 8));
      vibrieren(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      rolltRef.current = false;
    }, WURF_DAUER);
  }, [drehung, skalierung]);

  // Schuetteln erkennen.
  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    const abo = Accelerometer.addListener(({ x, y, z }) => {
      const kraft = Math.sqrt(x * x + y * y + z * z);
      if (kraft > SCHUETTEL_SCHWELLE) wuerfeln();
    });
    return () => abo.remove();
  }, [wuerfeln]);

  // Beim Verlassen alle laufenden Timer abraeumen.
  useEffect(() => {
    return () => {
      if (flackerRef.current) clearInterval(flackerRef.current);
      if (endeRef.current) clearTimeout(endeRef.current);
    };
  }, []);

  const dreht = drehung.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const gefuellt = AUGEN_RASTER[augen];

  return (
    <View style={stile.buehne}>
      <StatusBar style="light" />

      <Text style={stile.titel}>Würfel</Text>
      <Text style={stile.untertitel}>Schütteln oder tippen</Text>

      <Pressable onPress={wuerfeln} style={stile.wuerfelBereich}>
        <Animated.View
          style={[stile.wuerfel, { transform: [{ scale: skalierung }, { rotate: dreht }] }]}
        >
          {Array.from({ length: 9 }, (_, feld) => (
            <View key={feld} style={stile.rasterFeld}>
              {gefuellt.includes(feld) ? <View style={stile.auge} /> : null}
            </View>
          ))}
        </Animated.View>
      </Pressable>

      <Text style={stile.zahl}>{augen}</Text>

      <View style={stile.verlauf}>
        {verlauf.length === 0 ? (
          <Text style={stile.verlaufLeer}>Noch kein Wurf</Text>
        ) : (
          verlauf.map((wert, platz) => (
            <View key={`${platz}-${wert}`} style={[stile.chip, platz === 0 && stile.chipNeu]}>
              <Text style={[stile.chipText, platz === 0 && stile.chipTextNeu]}>{wert}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const HELL = '#F5F3EF';
const DUNKEL = '#14161B';
const AKZENT = '#E8734A';
const GEDAEMPFT = '#767D8A';

const stile = StyleSheet.create({
  buehne: {
    flex: 1,
    backgroundColor: DUNKEL,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titel: {
    color: HELL,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  untertitel: {
    color: GEDAEMPFT,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 44,
  },
  wuerfelBereich: {
    padding: 12,
  },
  wuerfel: {
    width: 190,
    height: 190,
    backgroundColor: HELL,
    borderRadius: 34,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  rasterFeld: {
    width: '33.333%',
    height: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DUNKEL,
  },
  zahl: {
    color: AKZENT,
    fontSize: 58,
    fontWeight: '800',
    marginTop: 28,
    fontVariant: ['tabular-nums'],
  },
  verlauf: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 36,
    minHeight: 34,
    alignItems: 'center',
  },
  verlaufLeer: {
    color: GEDAEMPFT,
    fontSize: 14,
  },
  chip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20242C',
  },
  chipNeu: {
    backgroundColor: AKZENT,
  },
  chipText: {
    color: GEDAEMPFT,
    fontSize: 15,
    fontWeight: '600',
  },
  chipTextNeu: {
    color: DUNKEL,
  },
});
