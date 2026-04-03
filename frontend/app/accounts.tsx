import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { accountsDB } from '../lib/database';

const ACCOUNT_ICONS: Record<string, string> = {
  bank: 'business',
  credit_card: 'card',
  cash: 'cash',
  voucher: 'pricetag',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bank: 'Konto Bankowe',
      credit_card: 'Karta Kredytowa',
      cash: 'Gotówka',
      voucher: 'Bon',
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
              <View style={styles.actionButtons}>
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
    backgroundColor: '#D4AF37',
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
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
