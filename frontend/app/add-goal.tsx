import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { savingsGoalsDB } from '../lib/database';

export default function AddGoal() {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !targetAmount) { alert('Proszę wypełnić nazwę i kwotę docelową'); return; }
    setLoading(true);
    try {
      await savingsGoalsDB.create({ name, target_amount: parseFloat(targetAmount), current_amount: parseFloat(currentAmount) || 0, deadline: deadline || null });
      router.back();
    } catch { alert('Błąd'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#2A2520" /></TouchableOpacity>
        <Text style={s.headerTitle}>Nowy Cel</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView style={s.content}>
        <View style={s.form}>
          <View style={s.field}><Text style={s.label}>Nazwa celu *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="np. Wakacje, Nowy laptop..." placeholderTextColor="#9B8B7E" /></View>
          <View style={s.field}><Text style={s.label}>Kwota docelowa (PLN) *</Text>
            <TextInput style={s.input} value={targetAmount} onChangeText={setTargetAmount} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="decimal-pad" /></View>
          <View style={s.field}><Text style={s.label}>Już zaoszczędzone (PLN)</Text>
            <TextInput style={s.input} value={currentAmount} onChangeText={setCurrentAmount} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="decimal-pad" /></View>
          <View style={s.field}><Text style={s.label}>Termin (opcjonalnie)</Text>
            <TextInput style={s.input} value={deadline} onChangeText={setDeadline} placeholder="RRRR-MM-DD" placeholderTextColor="#9B8B7E" /></View>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Dodaj Cel</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#E0D5C7' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#2A2520' },
  content: { flex: 1 },
  form: { padding: 20 },
  field: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#6B5D52', marginBottom: 12 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, color: '#2A2520' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#E0D5C7' },
  submitBtn: { backgroundColor: '#D4AF37', padding: 18, borderRadius: 12, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
