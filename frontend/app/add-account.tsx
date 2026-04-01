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

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Konto Bankowe', icon: 'business', color: '#4CAF50' },
  { value: 'credit_card', label: 'Karta Kredytowa', icon: 'card', color: '#2196F3' },
  { value: 'cash', label: 'Gotówka', icon: 'cash', color: '#FF9800' },
];

const COLORS = ['#4CAF50', '#2196F3', '#F44336', '#FF9800', '#9C27B0', '#E91E63', '#3F51B5', '#00BCD4'];

export default function AddAccount() {
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#4CAF50');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !balance) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          balance: parseFloat(balance),
          currency: 'PLN',
          icon: 'wallet',
          color,
        }),
      });

      if (response.ok) {
        router.back();
      } else {
        alert('Błąd podczas dodawania konta');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Błąd podczas dodawania konta');
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
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dodaj Konto</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nazwa konta *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="np. Konto główne, Oszczędności..."
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Typ konta</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((accountType) => (
                <TouchableOpacity
                  key={accountType.value}
                  style={[
                    styles.typeCard,
                    type === accountType.value && styles.typeCardActive,
                  ]}
                  onPress={() => setType(accountType.value)}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: accountType.color + '20' },
                    ]}
                  >
                    <Ionicons name={accountType.icon as any} size={28} color={accountType.color} />
                  </View>
                  <Text style={styles.typeLabel}>{accountType.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Początkowe saldo *</Text>
            <View style={styles.balanceInput}>
              <TextInput
                style={styles.input}
                value={balance}
                onChangeText={setBalance}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
              <Text style={styles.currency}>PLN</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kolor</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorCircleActive,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && <Ionicons name="checkmark" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Dodaj Konto</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardActive: {
    borderColor: '#4CAF50',
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  balanceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
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
    color: '#fff',
  },
});
