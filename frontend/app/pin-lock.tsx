import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { pinDB } from '../lib/database';
import * as LocalAuthentication from 'expo-local-authentication';

export default function PinLock() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => { tryBiometric(); }, []);

  const tryBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Odblokuj Budżet Ani', cancelLabel: 'Użyj PIN' });
        if (result.success) router.replace('/(tabs)');
      }
    } catch {}
  };

  const handlePress = async (digit: string) => {
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);
    if (newPin.length >= 4) {
      const valid = await pinDB.verify(newPin);
      if (valid) { router.replace('/(tabs)'); }
      else { setError(true); setPin(''); }
    }
  };

  const handleDelete = () => { setPin(pin.slice(0, -1)); setError(false); };

  const dots = [0, 1, 2, 3];
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['bio', '0', 'del']];

  return (
    <View style={s.container}>
      <View style={s.top}>
        <View style={s.lockIcon}><Ionicons name="lock-closed" size={40} color="#D4AF37" /></View>
        <Text style={s.title}>Budżet Ani</Text>
        <Text style={s.subtitle}>{error ? 'Nieprawidłowy PIN' : 'Wpisz kod PIN'}</Text>
        <View style={s.dotsRow}>
          {dots.map(i => <View key={i} style={[s.dot, pin.length > i && s.dotFilled, error && s.dotError]} />)}
        </View>
      </View>
      <View style={s.keypad}>
        {keys.map((row, ri) => (
          <View key={ri} style={s.keyRow}>
            {row.map(key => (
              <TouchableOpacity key={key} style={s.key}
                onPress={() => key === 'del' ? handleDelete() : key === 'bio' ? tryBiometric() : handlePress(key)}>
                {key === 'del' ? <Ionicons name="backspace-outline" size={28} color="#2A2520" /> :
                 key === 'bio' ? <Ionicons name="finger-print" size={28} color="#D4AF37" /> :
                 <Text style={s.keyText}>{key}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3', justifyContent: 'space-between', paddingTop: 80, paddingBottom: 40 },
  top: { alignItems: 'center' },
  lockIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2A2520', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B5D52', marginBottom: 30 },
  dotsRow: { flexDirection: 'row', gap: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#D4AF37' },
  dotFilled: { backgroundColor: '#D4AF37' },
  dotError: { borderColor: '#800020', backgroundColor: '#800020' },
  keypad: { paddingHorizontal: 60 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 28, fontWeight: '500', color: '#2A2520' },
});
