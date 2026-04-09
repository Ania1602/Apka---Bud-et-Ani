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
import { router } from 'expo-router';
import { accountsDB, transactionsDB } from '../lib/database';

export default function Transfer() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await accountsDB.getAll();
      setAccounts(data);
      if (data.length >= 2) {
        setFromAccountId(data[0].id);
        setToAccountId(data[1].id);
      } else if (data.length === 1) {
        setFromAccountId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId || !amount) {
      Alert.alert('Błąd', 'Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    if (fromAccountId === toAccountId) {
      Alert.alert('Błąd', 'Konto źródłowe i docelowe muszą być różne');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert('Błąd', 'Proszę wpisać poprawną kwotę');
      return;
    }

    const fromAccount = accounts.find(a => a.id === fromAccountId);
    if (fromAccount && fromAccount.balance < transferAmount) {
      Alert.alert('Uwaga', `Saldo konta "${fromAccount.name}" (${fromAccount.balance.toFixed(2)} PLN) jest niższe niż kwota przelewu. Kontynuować?`, [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Kontynuuj', onPress: () => executeTransfer(transferAmount) },
      ]);
      return;
    }

    await executeTransfer(transferAmount);
  };

  const executeTransfer = async (transferAmount: number) => {
    setLoading(true);
    try {
      const fromAccount = accounts.find(a => a.id === fromAccountId);
      const toAccount = accounts.find(a => a.id === toAccountId);
      const desc = description || `Przelew: ${fromAccount?.name} → ${toAccount?.name}`;

      const isFromLimit = (fromAccount?.type === 'credit_card' || fromAccount?.type === 'revolving') && fromAccount?.credit_limit;
      const isToLimit = (toAccount?.type === 'credit_card' || toAccount?.type === 'revolving') && toAccount?.credit_limit;

      // Regular → Limit = expense (paying off debt)
      // All others = neutral transfer
      const isDebtPayment = !isFromLimit && isToLimit;

      // Create expense transaction on source account
      await transactionsDB.create({
        type: 'expense',
        amount: transferAmount,
        category: isDebtPayment ? 'Spłata limitu' : 'Przelew',
        account_id: fromAccountId,
        date: new Date().toISOString(),
        description: desc,
        is_transfer: !isDebtPayment,
      });

      // Create income transaction on destination account
      await transactionsDB.create({
        type: 'income',
        amount: transferAmount,
        category: isDebtPayment ? 'Spłata limitu' : 'Przelew',
        account_id: toAccountId,
        date: new Date().toISOString(),
        description: desc,
        is_transfer: true,
        is_limit_refund: isToLimit ? true : false,
      });

      Alert.alert(
        'Sukces',
        `Przelano ${transferAmount.toFixed(2)} PLN\nz "${fromAccount?.name}" na "${toAccount?.name}"${isDebtPayment ? '\n(spłata limitu - liczone jako wydatek)' : ''}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error executing transfer:', error);
      Alert.alert('Błąd', 'Nie udało się wykonać przelewu');
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = { bank: 'business', credit_card: 'card', cash: 'cash', voucher: 'pricetag' };
    return icons[type] || 'wallet';
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#2A2520" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Przelew</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {accounts.length < 2 ? (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={32} color="#D4AF37" />
            <Text style={styles.warningText}>Potrzebujesz co najmniej 2 konta aby wykonać przelew</Text>
            <TouchableOpacity style={styles.addAccountButton} onPress={() => router.push('/add-account')}>
              <Text style={styles.addAccountButtonText}>Dodaj Konto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Transfer visualization */}
            <View style={styles.transferVisual}>
              <View style={styles.transferAccount}>
                <Ionicons name="arrow-up-circle" size={28} color="#800020" />
                <Text style={styles.transferLabel}>Z konta</Text>
              </View>
              <Ionicons name="swap-vertical" size={32} color="#D4AF37" />
              <View style={styles.transferAccount}>
                <Ionicons name="arrow-down-circle" size={28} color="#2C5F2D" />
                <Text style={styles.transferLabel}>Na konto</Text>
              </View>
            </View>

            {/* Source Account */}
            <View style={styles.field}>
              <Text style={styles.label}>Konto źródłowe</Text>
              <View style={styles.accountGrid}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={`from-${acc.id}`}
                    style={[
                      styles.accountCard,
                      fromAccountId === acc.id && styles.accountCardActiveFrom,
                      toAccountId === acc.id && styles.accountCardDisabled,
                    ]}
                    onPress={() => setFromAccountId(acc.id)}
                    disabled={toAccountId === acc.id}
                  >
                    <Ionicons name={getAccountIcon(acc.type) as any} size={20} color={fromAccountId === acc.id ? '#FFFFFF' : '#6B5D52'} />
                    <Text style={[styles.accountCardName, fromAccountId === acc.id && { color: '#FFFFFF' }]} numberOfLines={1}>{acc.name}</Text>
                    <Text style={[styles.accountCardBalance, fromAccountId === acc.id && { color: '#FFFFFF90' }]}>{acc.balance.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Destination Account */}
            <View style={styles.field}>
              <Text style={styles.label}>Konto docelowe</Text>
              <View style={styles.accountGrid}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={`to-${acc.id}`}
                    style={[
                      styles.accountCard,
                      toAccountId === acc.id && styles.accountCardActiveTo,
                      fromAccountId === acc.id && styles.accountCardDisabled,
                    ]}
                    onPress={() => setToAccountId(acc.id)}
                    disabled={fromAccountId === acc.id}
                  >
                    <Ionicons name={getAccountIcon(acc.type) as any} size={20} color={toAccountId === acc.id ? '#FFFFFF' : '#6B5D52'} />
                    <Text style={[styles.accountCardName, toAccountId === acc.id && { color: '#FFFFFF' }]} numberOfLines={1}>{acc.name}</Text>
                    <Text style={[styles.accountCardBalance, toAccountId === acc.id && { color: '#FFFFFF90' }]}>{acc.balance.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>Kwota przelewu *</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(',', '.'))}
                  placeholder="0.00"
                  placeholderTextColor="#9B8B7E"
                  keyboardType="numeric"
                />
                <Text style={styles.currencyLabel}>PLN</Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Opis (opcjonalny)</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="np. Oszczędności, Zwrot..."
                placeholderTextColor="#9B8B7E"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {accounts.length >= 2 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleTransfer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="swap-horizontal" size={22} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Wykonaj Przelew</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0D5C7',
  },
  closeButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#2A2520' },
  content: { flex: 1 },
  form: { padding: 20 },
  transferVisual: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingVertical: 20, marginBottom: 8,
  },
  transferAccount: { alignItems: 'center', gap: 4 },
  transferLabel: { fontSize: 12, color: '#6B5D52', fontWeight: '500' },
  field: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#6B5D52', marginBottom: 12, letterSpacing: 0.3 },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accountCard: {
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0D5C7',
    alignItems: 'center', minWidth: 100, flex: 1, gap: 4,
  },
  accountCardActiveFrom: { backgroundColor: '#800020', borderColor: '#800020' },
  accountCardActiveTo: { backgroundColor: '#2C5F2D', borderColor: '#2C5F2D' },
  accountCardDisabled: { opacity: 0.35 },
  accountCardName: { fontSize: 13, fontWeight: '600', color: '#2A2520', textAlign: 'center' },
  accountCardBalance: { fontSize: 11, color: '#6B5D52' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountInput: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    fontSize: 24, fontWeight: '600', color: '#2A2520',
    borderWidth: 1, borderColor: '#E0D5C7',
  },
  currencyLabel: { fontSize: 18, fontWeight: '600', color: '#6B5D52' },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7',
  },
  warningCard: {
    margin: 20, padding: 32, backgroundColor: '#FFFFFF', borderRadius: 16,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E0D5C7',
  },
  warningText: { fontSize: 16, color: '#6B5D52', textAlign: 'center' },
  addAccountButton: {
    backgroundColor: '#A8862B', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 10, marginTop: 8,
  },
  addAccountButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  footer: {
    padding: 20, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E0D5C7',
  },
  submitButton: {
    backgroundColor: '#A8862B', padding: 18, borderRadius: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
