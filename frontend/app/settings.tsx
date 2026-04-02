import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { pinDB } from '../lib/database';

export default function Settings() {
  const [hasPin, setHasPin] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => { pinDB.exists().then(setHasPin); }, []);

  const handleSetPin = async () => {
    if (pin.length < 4) { Alert.alert('Błąd', 'PIN musi mieć minimum 4 cyfry'); return; }
    if (pin !== confirmPin) { Alert.alert('Błąd', 'Kody PIN nie są identyczne'); return; }
    await pinDB.set(pin);
    setHasPin(true); setShowSetPin(false); setPin(''); setConfirmPin('');
    Alert.alert('Sukces', 'PIN został ustawiony');
  };

  const handleRemovePin = () => {
    Alert.alert('Usuń PIN', 'Czy na pewno chcesz wyłączyć blokadę PIN?', [
      { text: 'Anuluj' },
      { text: 'Wyłącz', style: 'destructive', onPress: async () => { await pinDB.remove(); setHasPin(false); } }
    ]);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#2A2520" /></TouchableOpacity>
        <Text style={s.headerTitle}>Ustawienia</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        <Text style={s.sectionTitle}>Bezpieczeństwo</Text>

        <View style={s.settingCard}>
          <View style={s.settingRow}>
            <View style={s.settingIcon}><Ionicons name="lock-closed" size={24} color="#800020" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>Blokada PIN</Text>
              <Text style={s.settingDesc}>{hasPin ? 'Włączony' : 'Wyłączony'}</Text>
            </View>
            <Switch value={hasPin} onValueChange={(v) => { if (v) setShowSetPin(true); else handleRemovePin(); }}
              trackColor={{ false: '#E0D5C7', true: '#D4AF37' }} thumbColor="#FFF" />
          </View>
        </View>

        {showSetPin && (
          <View style={s.pinCard}>
            <Text style={s.pinTitle}>Ustaw nowy PIN</Text>
            <TextInput style={s.pinInput} value={pin} onChangeText={setPin} placeholder="Wpisz PIN (min. 4 cyfry)" placeholderTextColor="#9B8B7E" keyboardType="number-pad" secureTextEntry maxLength={6} />
            <TextInput style={s.pinInput} value={confirmPin} onChangeText={setConfirmPin} placeholder="Potwierdź PIN" placeholderTextColor="#9B8B7E" keyboardType="number-pad" secureTextEntry maxLength={6} />
            <View style={s.pinButtons}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowSetPin(false); setPin(''); setConfirmPin(''); }}>
                <Text style={s.cancelBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSetPin}>
                <Text style={s.saveBtnText}>Zapisz PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={s.infoText}>PIN jest przechowywany lokalnie na urządzeniu. Aplikacja nie wysyła żadnych danych przez internet.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9B8B7E', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#80002020', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: '#2A2520' },
  settingDesc: { fontSize: 12, color: '#6B5D52', marginTop: 2 },
  pinCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  pinTitle: { fontSize: 16, fontWeight: '600', color: '#2A2520', marginBottom: 16 },
  pinInput: { backgroundColor: '#F5F1E8', borderRadius: 12, padding: 16, fontSize: 18, color: '#2A2520', marginBottom: 12, textAlign: 'center', letterSpacing: 8 },
  pinButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#F5F1E8', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#6B5D52' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#D4AF37', alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  infoCard: { flexDirection: 'row', backgroundColor: '#2196F320', padding: 16, borderRadius: 12, gap: 12 },
  infoText: { fontSize: 13, color: '#2196F3', flex: 1, lineHeight: 18 },
});
