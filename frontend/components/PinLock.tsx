import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pinDB } from '../lib/database';
import * as LocalAuthentication from 'expo-local-authentication';

const MIN_LEN = 4;
const MAX_LEN = 6;

// Full-screen lock rendered over the whole app by the root layout
export default function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => { tryBiometric(); }, []);

  const tryBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(hasHardware && isEnrolled);
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Odblokuj Budżet Ani', cancelLabel: 'Użyj PIN' });
        if (result.success) onUnlock();
      }
    } catch {}
  };

  const fail = () => { setError(true); setPin(''); };

  const handlePress = async (digit: string) => {
    if (pin.length >= MAX_LEN) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);
    // PIN can be 4-6 digits: unlock as soon as it matches, reject once the max length is reached
    if (newPin.length >= MIN_LEN && await pinDB.verify(newPin)) { onUnlock(); return; }
    if (newPin.length === MAX_LEN) fail();
  };

  const handleConfirm = async () => {
    if (pin.length < MIN_LEN) return;
    if (await pinDB.verify(pin)) onUnlock(); else fail();
  };

  const handleDelete = () => { setPin(pin.slice(0, -1)); setError(false); };

  const dots = Array.from({ length: Math.max(MIN_LEN, pin.length) }, (_, i) => i);
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], [hasBiometric ? 'bio' : 'ok', '0', 'del']];

  return (
    <View style={s.container}>
      <View style={s.top}>
        <View style={s.lockIcon}><Ionicons name="lock-closed" size={40} color="#D4AF37" /></View>
        <Text style={s.title}>Budżet Ani</Text>
        <Text style={[s.subtitle, error && s.subtitleError]}>{error ? 'Nieprawidłowy PIN' : 'Wpisz kod PIN'}</Text>
        <View style={s.dotsRow}>
          {dots.map(i => <View key={i} style={[s.dot, pin.length > i && s.dotFilled, error && s.dotError]} />)}
        </View>
      </View>
      <View style={s.keypad}>
        {keys.map((row, ri) => (
          <View key={ri} style={s.keyRow}>
            {row.map(key => (
              <TouchableOpacity key={key} style={s.key}
                onPress={() => key === 'del' ? handleDelete() : key === 'bio' ? tryBiometric() : key === 'ok' ? handleConfirm() : handlePress(key)}>
                {key === 'del' ? <Ionicons name="backspace-outline" size={28} color="#2A2520" /> :
                 key === 'bio' ? <Ionicons name="finger-print" size={28} color="#D4AF37" /> :
                 key === 'ok' ? <Ionicons name="checkmark" size={28} color="#2C5F2D" /> :
                 <Text style={s.keyText}>{key}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        {hasBiometric && pin.length >= MIN_LEN && (
          <TouchableOpacity style={s.okButton} onPress={handleConfirm}>
            <Text style={s.okButtonText}>Zatwierdź</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000, backgroundColor: '#FAF8F3', justifyContent: 'space-between', paddingTop: 80, paddingBottom: 40 },
  top: { alignItems: 'center' },
  lockIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2A2520', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B5D52', marginBottom: 30 },
  subtitleError: { color: '#800020' },
  dotsRow: { flexDirection: 'row', gap: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#D4AF37' },
  dotFilled: { backgroundColor: '#D4AF37' },
  dotError: { borderColor: '#800020', backgroundColor: '#800020' },
  keypad: { paddingHorizontal: 60 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 28, fontWeight: '500', color: '#2A2520' },
  okButton: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24 },
  okButtonText: { fontSize: 16, fontWeight: '600', color: '#2C5F2D' },
});
