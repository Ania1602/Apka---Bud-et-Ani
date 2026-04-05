import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { creditsDB, plansDB } from '../lib/database';

export default function AddCredit() {
  const params = useLocalSearchParams();
  const isEdit = !!params.edit;
  const editId = params.edit as string;

  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadCreditData();
    }
  }, [isEdit]);

  const loadCreditData = async () => {
    try {
      const allCredits = await creditsDB.getAll();
      const credit = allCredits.find((c: any) => c.id === editId);
      if (credit) {
        setName(credit.name);
        setTotalAmount(String(credit.total_amount));
        setRemainingAmount(String(credit.remaining_amount));
        setInterestRate(String(credit.interest_rate || ''));
        setMonthlyPayment(String(credit.monthly_payment));
        setStartDate(credit.start_date ? new Date(credit.start_date).toISOString().split('T')[0] : '');
        setEndDate(credit.end_date ? new Date(credit.end_date).toISOString().split('T')[0] : '');
      }
    } catch (error) {
      console.error('Error loading credit:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name || !totalAmount || !remainingAmount || !monthlyPayment || !endDate) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    setLoading(true);
    try {
      const creditData = {
        name,
        total_amount: parseFloat(totalAmount),
        remaining_amount: parseFloat(remainingAmount),
        interest_rate: parseFloat(interestRate) || 0,
        monthly_payment: parseFloat(monthlyPayment),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      };
      if (isEdit) {
        await creditsDB.update(editId, creditData);
        router.back();
      } else {
        await creditsDB.create(creditData);
        // Ask about adding to planning
        Alert.alert(
          'Dodać do planowania?',
          `Czy dodać ratę "${name}" (${parseFloat(monthlyPayment).toFixed(2)} PLN) do planowania wydatków?`,
          [
            { text: 'Nie', onPress: () => router.back() },
            {
              text: 'Tak, dodaj',
              onPress: async () => {
                try {
                  const now = new Date();
                  const month = now.getMonth() + 1;
                  const year = now.getFullYear();
                  let plan = await plansDB.getByMonth(month, year);
                  if (!plan) {
                    plan = await plansDB.createForMonth(month, year);
                  }
                  await plansDB.addItem(plan.id, 'expense', {
                    name: `Rata: ${name}`,
                    amount: parseFloat(monthlyPayment),
                    day: parseInt(startDate.split('-')[2]) || 1,
                    is_recurring: true,
                  });
                } catch (e) {
                  console.error('Error adding to planning:', e);
                }
                router.back();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving credit:', error);
      alert('Błąd podczas zapisywania kredytu');
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
          <Ionicons name="close" size={28} color="#2A2520" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edytuj Kredyt' : 'Dodaj Kredyt'}</Text>
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
                  onChangeText={(t) => setTotalAmount(t.replace(',', '.'))}
                  placeholder="0.00"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="numeric"
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
                  onChangeText={(t) => setRemainingAmount(t.replace(',', '.'))}
                  placeholder="0.00"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="numeric"
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
                  onChangeText={(t) => setInterestRate(t.replace(',', '.'))}
                  placeholder="0.0"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="numeric"
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
                  onChangeText={(t) => setMonthlyPayment(t.replace(',', '.'))}
                  placeholder="0.00"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="numeric"
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
            <Text style={styles.submitButtonText}>{isEdit ? 'Zapisz Zmiany' : 'Dodaj Kredyt'}</Text>
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
    color: '#2A2520',
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
    color: '#FFFFFF',
  },
});
