import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Co miesiąc',
  quarterly: 'Co kwartał',
  yearly: 'Co rok',
};

export default function RecurringTransactions() {
  const [recurring, setRecurring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecurring = async () => {
    try {
      const response = await fetch(`${API_URL}/api/recurring-transactions`);
      const data = await response.json();
      setRecurring(data);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecurring();
  };

  const deleteRecurring = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/recurring-transactions/${id}`, { method: 'DELETE' });
      fetchRecurring();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
    }
  };

  const executeRecurring = async (id: string, name: string) => {
    Alert.alert(
      'Wykonaj Płatność',
      `Czy chcesz wykonać płatność: ${name}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wykonaj',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/recurring-transactions/${id}/execute`, { method: 'POST' });
              Alert.alert('Sukces', 'Transakcja została utworzona');
              fetchRecurring();
            } catch (error) {
              console.error('Error executing recurring transaction:', error);
              Alert.alert('Błąd', 'Nie udało się wykonać transakcji');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Płatności Cykliczne</Text>
        <Text style={styles.headerSubtitle}>Zarządzaj stałymi wydatkami i przychodami</Text>
      </View>

      <FlatList
        data={recurring}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>Brak płatności cyklicznych</Text>
            <Text style={styles.emptyStateSubtext}>
              Dodaj stałe opłaty jak czynsz, bilet komunikacyjny, subskrypcje
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-recurring')}>
              <Text style={styles.addButtonText}>Dodaj Płatność Cykliczną</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.recurringCard}>
            <View style={styles.recurringHeader}>
              <View
                style={[
                  styles.recurringIcon,
                  { backgroundColor: item.type === 'income' ? '#4CAF5020' : '#F4433620' },
                ]}
              >
                <Ionicons
                  name={item.type === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={24}
                  color={item.type === 'income' ? '#4CAF50' : '#F44336'}
                />
              </View>
              <View style={styles.recurringDetails}>
                <Text style={styles.recurringName}>{item.name}</Text>
                <Text style={styles.recurringCategory}>{item.category}</Text>
              </View>
              <Text
                style={[
                  styles.recurringAmount,
                  { color: item.type === 'income' ? '#4CAF50' : '#F44336' },
                ]}
              >
                {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)} PLN
              </Text>
            </View>

            <View style={styles.recurringInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="repeat" size={16} color="#999" />
                <Text style={styles.infoText}>{FREQUENCY_LABELS[item.frequency] || item.frequency}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="calendar" size={16} color="#999" />
                <Text style={styles.infoText}>Dzień: {item.day_of_month}</Text>
              </View>
              {item.next_due_date && (
                <View style={styles.infoItem}>
                  <Ionicons name="time" size={16} color="#999" />
                  <Text style={styles.infoText}>
                    Następna: {format(new Date(item.next_due_date), 'dd MMM', { locale: pl })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.recurringActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => executeRecurring(item.id, item.name)}
              >
                <Ionicons name="play" size={18} color="#4CAF50" />
                <Text style={[styles.actionText, { color: '#4CAF50' }]}>Wykonaj teraz</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => deleteRecurring(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#F44336" />
                <Text style={[styles.actionText, { color: '#F44336' }]}>Usuń</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-recurring')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  recurringCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recurringIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recurringDetails: {
    flex: 1,
  },
  recurringName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  recurringCategory: {
    fontSize: 14,
    color: '#999',
  },
  recurringAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  recurringInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#999',
  },
  recurringActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
