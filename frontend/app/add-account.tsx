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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { accountsDB } from '../lib/database';
import { parseAmount } from '../lib/utils';

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Konto Bankowe', icon: 'business', color: '#D4AF37' },
  { value: 'credit_card', label: 'Karta Kredytowa', icon: 'card', color: '#2196F3' },
  { value: 'cash', label: 'Gotówka', icon: 'cash', color: '#FF9800' },
  { value: 'voucher', label: 'Bon', icon: 'pricetag', color: '#9C27B0' },
  { value: 'revolving', label: 'Limit Odnawialny', icon: 'refresh-circle', color: '#E91E63' },
];

const COLORS = ['#800020', '#E53935', '#FF6B6B', '#C62828', '#FF8C00', '#FFB74D', '#E65100', '#D4AF37', '#FFD600', '#FFF176', '#2C5F2D', '#4CAF50', '#81C784', '#00897B', '#1B2845', '#2196F3', '#42A5F5', '#0288D1', '#9C27B0', '#673AB7', '#BA68C8', '#E91E63', '#F48FB1', '#607D8B', '#9E9E9E', '#455A64'];
const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CZK', 'CHF'];

export default function AddAccount() {
  const params = useLocalSearchParams();
  const isEdit = !!params.edit;
  const editId = params.edit as string;

  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#D4AF37');
  const [currency, setCurrency] = useState('PLN');
  const [creditLimit, setCreditLimit] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadAccountData();
    }
  }, [isEdit]);

  const loadAccountData = async () => {
    try {
      const account = await accountsDB.getById(editId);
      if (account) {
        setName(account.name);
        setType(account.type);
        setBalance(String(account.balance));
        setColor(account.color || '#D4AF37');
        setCurrency(account.currency || 'PLN');
        setCreditLimit(account.credit_limit ? String(account.credit_limit) : '');
      }
    } catch (error) {
      console.error('Error loading account:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name || !balance) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }
    
    // Force credit limit for limit account types
    if ((type === 'credit_card' || type === 'revolving') && !creditLimit) {
      alert('Podaj kwotę limitu dla tego typu konta');
      return;
    }

    setLoading(true);
    try {
      const accountData = {
        name,
        type,
        balance: parseAmount(balance),
        currency: currency,
        icon: 'wallet',
        color,
        credit_limit: (type === 'credit_card' || type === 'revolving') && creditLimit ? parseAmount(creditLimit) : null,
      };
      if (isEdit) {
        await accountsDB.update(editId, accountData);
      } else {
        await accountsDB.create(accountData);
      }
      router.back();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Błąd podczas zapisywania konta');
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edytuj Konto' : 'Dodaj Konto'}</Text>
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
              placeholderTextColor="#9B8B7E"
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
                onChangeText={(t) => setBalance(t.replace(',', '.'))}
                placeholder="0.00"
                placeholderTextColor="#9B8B7E"
                keyboardType="numeric"
              />
              <Text style={styles.currency}>{currency}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Waluta</Text>
            <View style={styles.currencyGrid}>
              {CURRENCIES.map((cur) => (
                <TouchableOpacity key={cur} style={[styles.currencyBtn, currency === cur && styles.currencyBtnActive]}
                  onPress={() => setCurrency(cur)}>
                  <Text style={[styles.currencyBtnText, currency === cur && styles.currencyBtnTextActive]}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {(type === 'credit_card' || type === 'revolving') && (
            <View style={styles.field}>
              <Text style={styles.label}>Limit kredytowy</Text>
              <TextInput
                style={styles.input}
                value={creditLimit}
                onChangeText={(t) => setCreditLimit(t.replace(',', '.'))}
                placeholder="np. 5000"
                placeholderTextColor="#9B8B7E"
                keyboardType="numeric"
              />
              <Text style={styles.limitHint}>Saldo konta = saldo - limit. Np. limit 5000, saldo 3000 → wyświetla -2000 (wykorzystano 2000 z limitu)</Text>
            </View>
          )}

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
                  {color === c && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{isEdit ? 'Zapisz Zmiany' : 'Dodaj Konto'}</Text>
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
    marginBottom: 32,
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
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardActive: {
    borderColor: '#D4AF37',
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
    color: '#2A2520',
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
    color: '#6B5D52',
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
    borderColor: '#2A2520',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
  },
  submitButton: {
    backgroundColor: '#A8862B',
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
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E0D5C7' },
  currencyBtnActive: { backgroundColor: '#A8862B', borderColor: '#D4AF37' },
  currencyBtnText: { fontSize: 14, fontWeight: '600', color: '#6B5D52' },
  currencyBtnTextActive: { color: '#FFF' },
  limitHint: { fontSize: 11, color: '#9B8B7E', marginTop: 8, lineHeight: 16 },
});
