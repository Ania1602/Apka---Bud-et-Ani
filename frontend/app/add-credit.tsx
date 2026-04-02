import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddCredit() {
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !totalAmount || !remainingAmount || !monthlyPayment || !endDate) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          total_amount: parseFloat(totalAmount),
          remaining_amount: parseFloat(remainingAmount),
          interest_rate: parseFloat(interestRate) || 0,
          monthly_payment: parseFloat(monthlyPayment),
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
        }),
      });

      if (response.ok) {
        router.back();
      } else {
        alert('Błąd podczas dodawania kredytu');
      }
    } catch (error) {
      console.error('Error creating credit:', error);
      alert('Błąd podczas dodawania kredytu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dodaj Kredyt</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nazwa kredytu *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="np. Kredyt hipoteczny, Kredyt samochodowy..."
              placeholderTextColor="#9B8B7E"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Całkowita kwota *</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currency}>PLN</Text>
              </View>
            </View>
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Do spłaty *</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={remainingAmount}
                  onChangeText={setRemainingAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currency}>PLN</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Oprocentowanie</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="0.0"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currency}>%</Text>
              </View>
            </View>
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Rata miesięczna *</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={monthlyPayment}
                  onChangeText={setMonthlyPayment}
                  placeholder="0.00"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currency}>PLN</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Data rozpoczęcia</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9B8B7E"
              />
            </View>
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Data zakończenia *</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9B8B7E"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              Format daty: RRRR-MM-DD (np. 2025-01-15)
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Dodaj Kredyt</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C7',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: "#2A2520",
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2A2520',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingRight: 16,
  },
  currency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5D52',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F320',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#2196F3',
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
  },
  submitButton: {
    backgroundColor: '#D4AF37',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2520',
  },
});
