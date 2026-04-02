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
import { router } from 'expo-router';
import { transactionsDB, accountsDB, categoriesDB, creditsDB } from '../lib/database';

export default function AddTransaction() {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [creditId, setCreditId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    try {
      const [accountsData, categoriesData, creditsData] = await Promise.all([
        accountsDB.getAll(),
        categoriesDB.getAll(type),
        creditsDB.getAll(),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setCredits(creditsData);
      if (accountsData.length > 0 && !accountId) {
        setAccountId(accountsData[0].id);
      }
      if (categoriesData.length > 0 && !category) {
        setCategory(categoriesData[0].name);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !category || !accountId) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    setLoading(true);
    try {
      await transactionsDB.create({
        type,
        amount: parseFloat(amount),
        category,
        account_id: accountId,
        date: new Date().toISOString(),
        description,
        credit_id: creditId || null,
      });
      router.back();
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Błąd podczas dodawania transakcji');
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
        <Text style={styles.headerTitle}>Dodaj Transakcję</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
            onPress={() => setType('expense')}
          >
            <Ionicons name="arrow-up" size={20} color={type === 'expense' ? '#FFFFFF' : '#6B5D52'} />
            <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
              Wydatek
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
            onPress={() => setType('income')}
          >
            <Ionicons name="arrow-down" size={20} color={type === 'income' ? '#FFFFFF' : '#6B5D52'} />
            <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
              Przychód
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>PLN</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#9B8B7E"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Kategoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.name && { backgroundColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.name && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Konto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.accountChip,
                    accountId === acc.id && styles.accountChipActive,
                  ]}
                  onPress={() => setAccountId(acc.id)}
                >
                  <Text
                    style={[
                      styles.accountChipText,
                      accountId === acc.id && styles.accountChipTextActive,
                    ]}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Opis (opcjonalnie)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Dodaj opis..."
              placeholderTextColor="#9B8B7E"
              multiline
            />
          </View>

          {type === 'expense' && credits.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Rata Kredytu (opcjonalnie)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity
                  style={[
                    styles.accountChip,
                    !creditId && styles.accountChipActive,
                  ]}
                  onPress={() => setCreditId('')}
                >
                  <Text
                    style={[
                      styles.accountChipText,
                      !creditId && styles.accountChipTextActive,
                    ]}
                  >
                    Brak
                  </Text>
                </TouchableOpacity>
                {credits.map((credit) => (
                  <TouchableOpacity
                    key={credit.id}
                    style={[
                      styles.accountChip,
                      creditId === credit.id && styles.accountChipActive,
                    ]}
                    onPress={() => setCreditId(credit.id)}
                  >
                    <Text
                      style={[
                        styles.accountChipText,
                        creditId === credit.id && styles.accountChipTextActive,
                      ]}
                    >
                      {credit.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
            <Text style={styles.submitButtonText}>Dodaj Transakcję</Text>
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
  typeSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#800020',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B5D52',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B5D52',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2A2520',
    minWidth: 150,
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 24,
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
    minHeight: 80,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  accountChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  accountChipActive: {
    backgroundColor: '#D4AF37',
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
  },
  accountChipTextActive: {
    color: '#FFFFFF',
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
