import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddRecurring() {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        fetch(`${API_URL}/api/accounts`),
        fetch(`${API_URL}/api/categories?type=${type}`),
      ]);
      const accountsData = await accountsRes.json();
      const categoriesData = await categoriesRes.json();
      setAccounts(accountsData);
      setCategories(categoriesData);
      if (accountsData.length > 0 && !accountId) setAccountId(accountsData[0].id);
      if (categoriesData.length > 0 && !category) setCategory(categoriesData[0].name);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name || !amount || !category || !accountId) {
      alert('Proszę wypełnić wszystkie pola');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/recurring-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, type, amount: parseFloat(amount), category, account_id: accountId,
          frequency, day_of_month: parseInt(dayOfMonth), start_date: new Date().toISOString(),
          is_active: true,
        }),
      });

      if (response.ok) {
        router.back();
      } else {
        alert('Błąd podczas dodawania płatności');
      }
    } catch (error) {
      console.error('Error creating recurring:', error);
      alert('Błąd podczas dodawania płatności');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#FFFFFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Dodaj Płatność Cykliczną</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nazwa</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="np. Czynsz, Bilet miesięczny..." placeholderTextColor="#9B8B7E" />
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]} onPress={() => setType('expense')}>
              <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>Wydatek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeButton, type === 'income' && styles.typeButtonActive]} onPress={() => setType('income')}>
              <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>Przychód</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kwota (PLN)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="decimal-pad" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Częstotliwość</Text>
            <View style={styles.frequencyButtons}>
              {[['monthly', 'Co miesiąc'], ['quarterly', 'Co kwartał'], ['yearly', 'Co rok']].map(([value, label]) => (
                <TouchableOpacity key={value} style={[styles.freqButton, frequency === value && styles.freqButtonActive]} onPress={() => setFrequency(value)}>
                  <Text style={[styles.freqButtonText, frequency === value && styles.freqButtonTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dzień miesiąca (1-31)</Text>
            <TextInput style={styles.input} value={dayOfMonth} onChangeText={setDayOfMonth} placeholder="1" placeholderTextColor="#9B8B7E" keyboardType="number-pad" />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Dodaj Płatność Cykliczną</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#E0D5C7' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: "#2A2520" },
  content: { flex: 1 },
  form: { padding: 20 },
  field: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#6B5D52', marginBottom: 12 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 16, color: '#2A2520' },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  typeButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#800020' },
  typeButtonText: { fontSize: 16, fontWeight: '500', color: '#6B5D52' },
  typeButtonTextActive: { color: '#2A2520' },
  frequencyButtons: { flexDirection: 'row', gap: 8 },
  freqButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center' },
  freqButtonActive: { backgroundColor: '#D4AF37' },
  freqButtonText: { fontSize: 13, color: '#6B5D52' },
  freqButtonTextActive: { color: '#2A2520' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#E0D5C7' },
  submitButton: { backgroundColor: '#D4AF37', padding: 18, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#2A2520' },
});
