import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { savingsGoalsDB } from '../lib/database';
import { parseAmount } from '../lib/utils';

export default function AddGoal() {
  const params = useLocalSearchParams();
  const isEdit = !!params.edit;
  const editId = params.edit as string;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadGoalData();
    }
  }, [isEdit]);

  const loadGoalData = async () => {
    try {
      const allGoals = await savingsGoalsDB.getAll();
      const goal = allGoals.find((g: any) => g.id === editId);
      if (goal) {
        setName(goal.name);
        setTargetAmount(String(goal.target_amount));
        setCurrentAmount(String(goal.current_amount || 0));
        setDeadline(goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '');
      }
    } catch (error) {
      console.error('Error loading goal:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name || !targetAmount) { alert('Proszę wypełnić nazwę i kwotę docelową'); return; }
    setLoading(true);
    try {
      const goalData = { name, target_amount: parseAmount(targetAmount), current_amount: parseAmount(currentAmount) || 0, deadline: deadline || null };
      if (isEdit) {
        await savingsGoalsDB.update(editId, goalData);
      } else {
        await savingsGoalsDB.create(goalData);
      }
      router.back();
    } catch { alert('Błąd'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#2A2520" /></TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Edytuj Cel' : 'Nowy Cel'}</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView style={s.content}>
        <View style={s.form}>
          <View style={s.field}><Text style={s.label}>Nazwa celu *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="np. Wakacje, Nowy laptop..." placeholderTextColor="#9B8B7E" /></View>
          <View style={s.field}><Text style={s.label}>Kwota docelowa (PLN) *</Text>
            <TextInput style={s.input} value={targetAmount} onChangeText={(t) => setTargetAmount(t.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" /></View>
          <View style={s.field}><Text style={s.label}>Już zaoszczędzone (PLN)</Text>
            <TextInput style={s.input} value={currentAmount} onChangeText={(t) => setCurrentAmount(t.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" /></View>
          <View style={s.field}><Text style={s.label}>Termin (opcjonalnie)</Text>
            <TextInput style={s.input} value={deadline} onChangeText={(text: string) => {
              const digits = text.replace(/[^0-9]/g, '');
              let formatted = '';
              if (digits.length <= 4) { formatted = digits; }
              else if (digits.length <= 6) { formatted = digits.slice(0, 4) + '-' + digits.slice(4); }
              else { formatted = digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8); }
              setDeadline(formatted);
            }} placeholder="RRRR-MM-DD" placeholderTextColor="#9B8B7E" maxLength={10} keyboardType="numeric" /></View>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>{isEdit ? 'Zapisz Zmiany' : 'Dodaj Cel'}</Text>}
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
  submitBtn: { backgroundColor: '#A8862B', padding: 18, borderRadius: 12, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
