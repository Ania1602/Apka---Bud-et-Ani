import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { accountsDB } from '../lib/database';

const ACCOUNT_ICONS: Record<string, string> = {
  bank: 'business',
  credit_card: 'card',
  cash: 'cash',
  voucher: 'pricetag',
  revolving: 'refresh-circle',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Balance correction modal state
  const [balanceModalAccount, setBalanceModalAccount] = useState<any | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  const fetchAccounts = async () => {
    try {
      const data = await accountsDB.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const deleteAccount = async (id: string) => {
    try {
      await accountsDB.delete(id);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  function openBalanceModal(account: any) {
    setBalanceModalAccount(account);
    setNewBalanceInput(account.balance.toString().replace('.', ','));
  }

  function closeBalanceModal() {
    setBalanceModalAccount(null);
    setNewBalanceInput('');
  }

  async function handleSaveBalance() {
    if (!balanceModalAccount) return;
    const parsed = parseFloat(newBalanceInput.replace(',', '.'));
    if (isNaN(parsed)) {
      Alert.alert('Błąd', 'Podaj poprawną kwotę.');
      return;
    }
    setSavingBalance(true);
    try {
      await accountsDB.updateBalance(balanceModalAccount.id, parsed);
      await fetchAccounts();
      closeBalanceModal();
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zapisać salda.');
    } finally {
      setSavingBalance(false);
    }
  }

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bank: 'Konto Bankowe',
      credit_card: 'Karta Kredytowa',
      cash: 'Gotówka',
      voucher: 'Bon',
      revolving: 'Limit Odnawialny',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const isCredit = (acc: any) =>
    acc?.credit_limit && (acc.type === 'credit_card' || acc.type === 'revolving');

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2A2520" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Konta</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Całkowite Saldo</Text>
        <Text style={styles.totalAmount}>{totalBalance.toFixed(2)} PLN</Text>
        <Text style={styles.totalSubtext}>{accounts.length} kont</Text>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color="#9B8B7E" />
            <Text style={styles.emptyStateText}>Brak kont</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-account')}>
              <Text style={styles.addButtonText}>Dodaj Konto</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.accountItem}>
            <View style={[styles.accountIcon, { backgroundColor: (item.color || '#D4AF37') + '20' }]}>
              <Ionicons name={(ACCOUNT_ICONS[item.type] || 'wallet') as any} size={28} color={item.color || '#D4AF37'} />
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>{item.name}</Text>
              <Text style={styles.accountType}>{getAccountTypeLabel(item.type)}</Text>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountBalance}>{item.balance.toFixed(2)} {item.currency || 'PLN'}</Text>
              {isCredit(item) && (() => {
                const used = item.credit_limit - item.balance;
                const usedPct = (used / item.credit_limit) * 100;
                const limitColor = usedPct > 80 ? '#D32F2F' : usedPct > 50 ? '#FF9800' : '#2C5F2D';
                return (
                  <View style={styles.limitInfo}>
                    <Text style={styles.limitText}>Wykorzystano: {Math.max(0, used).toFixed(0)} z {item.credit_limit.toFixed(0)}</Text>
                    <View style={styles.limitBar}>
                      <View style={[styles.limitBarFill, { width: `${Math.min(Math.max(0, usedPct), 100)}%`, backgroundColor: limitColor }]} />
                    </View>
                    <Text style={[styles.limitAvailable, { color: limitColor }]}>Dostępne: {Math.max(0, item.balance).toFixed(0)} {item.currency || 'PLN'}</Text>
                  </View>
                );
              })()}
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => openBalanceModal(item)} style={styles.balanceButton}>
                  <Ionicons name="swap-vertical-outline" size={18} color="#2C5F2D" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push({ pathname: '/add-account', params: { edit: item.id } })} style={styles.editButton}>
                  <Ionicons name="create-outline" size={18} color="#D4AF37" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteAccount(item.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color="#800020" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-account')}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ===== BALANCE CORRECTION MODAL ===== */}
      <Modal
        visible={!!balanceModalAccount}
        transparent
        animationType="fade"
        onRequestClose={closeBalanceModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeBalanceModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconBg, { backgroundColor: (balanceModalAccount?.color || '#D4AF37') + '20' }]}>
                <Ionicons
                  name={(ACCOUNT_ICONS[balanceModalAccount?.type] || 'wallet') as any}
                  size={24}
                  color={balanceModalAccount?.color || '#D4AF37'}
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>Ustaw aktualny stan</Text>
                <Text style={styles.modalSubtitle}>{balanceModalAccount?.name}</Text>
              </View>
            </View>

            <View style={styles.currentBalanceRow}>
              <Text style={styles.currentBalanceLabel}>Obecne saldo</Text>
              <Text style={styles.currentBalanceValue}>
                {balanceModalAccount?.balance?.toFixed(2)} {balanceModalAccount?.currency || 'PLN'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>
              {isCredit(balanceModalAccount)
                ? 'Dostępny limit (ile możesz jeszcze wydać)'
                : 'Rzeczywisty stan konta'}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.balanceInput}
                value={newBalanceInput}
                onChangeText={setNewBalanceInput}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor="#9B8B7E"
                autoFocus
                selectTextOnFocus
              />
              <Text style={styles.inputCurrency}>{balanceModalAccount?.currency || 'PLN'}</Text>
            </View>

            <Text style={styles.modalNote}>
              Korekta nie jest księgowana jako transakcja — służy tylko do wyrównania salda po przerwie.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeBalanceModal}>
                <Text style={styles.cancelBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingBalance && styles.saveBtnDisabled]}
                onPress={handleSaveBalance}
                disabled={savingBalance}
              >
                {savingBalance
                  ? <ActivityIndicator size="small" color="#2A2520" />
                  : <Text style={styles.saveBtnText}>Zapisz</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FAF8F3',
  },
  backButton: {
    padding: 4,
  },
  headerBarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2A2520',
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B5D52',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2A2520',
    marginBottom: 4,
  },
  totalSubtext: {
    fontSize: 12,
    color: '#9B8B7E',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  accountIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#6B5D52',
  },
  accountRight: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  editButton: {
    padding: 4,
  },
  balanceButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#A8862B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#2A2520',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#A8862B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  limitInfo: {
    marginTop: 6,
    gap: 4,
  },
  limitText: {
    fontSize: 11,
    color: '#6B5D52',
  },
  limitBar: {
    height: 5,
    backgroundColor: '#E0D5C7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  limitBarFill: {
    height: 5,
    borderRadius: 3,
  },
  limitAvailable: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#FAF8F3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D0C4B0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A2520',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B5D52',
    marginTop: 2,
  },
  currentBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currentBalanceLabel: {
    fontSize: 14,
    color: '#6B5D52',
  },
  currentBalanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2520',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B5D52',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D4AF37',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  balanceInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#2A2520',
    paddingVertical: 12,
  },
  inputCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B8B7E',
  },
  modalNote: {
    fontSize: 12,
    color: '#9B8B7E',
    lineHeight: 18,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D0C4B0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5D52',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#A8862B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2520',
  },
});
