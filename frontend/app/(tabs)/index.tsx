import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Initialize categories first time
      await fetch(`${API_URL}/api/initialize`, { method: 'POST' });
      
      const [statsRes, transactionsRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/stats`),
        fetch(`${API_URL}/api/transactions?limit=5`),
      ]);
      
      const statsData = await statsRes.json();
      const transactionsData = await transactionsRes.json();
      
      setStats(statsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const pieData = [
    { value: stats?.total_income || 0, color: '#4CAF50', text: 'Przychody' },
    { value: stats?.total_expenses || 0, color: '#F44336', text: 'Wydatki' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Twój Budżet</Text>
        <Text style={styles.headerSubtitle}>{format(new Date(), 'MMMM yyyy', { locale: pl })}</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Całkowity Bilans</Text>
        <Text style={styles.balanceAmount}>{stats?.total_balance?.toFixed(2) || '0.00'} PLN</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Ionicons name="arrow-down-circle" size={24} color="#4CAF50" />
            <Text style={styles.balanceItemLabel}>Przychody</Text>
            <Text style={styles.balanceItemAmount}>+{stats?.total_income?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Ionicons name="arrow-up-circle" size={24} color="#F44336" />
            <Text style={styles.balanceItemLabel}>Wydatki</Text>
            <Text style={styles.balanceItemAmount}>-{stats?.total_expenses?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/add-transaction')}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Dodaj Transakcję</Text>
        </TouchableOpacity>
      </View>

      {pieData[0].value > 0 || pieData[1].value > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Przychody vs Wydatki</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              donut
              radius={80}
              innerRadius={50}
              centerLabelComponent={() => (
                <View>
                  <Text style={styles.centerLabel}>
                    {((pieData[0].value / (pieData[0].value + pieData[1].value)) * 100).toFixed(0)}%
                  </Text>
                </View>
              )}
            />
            <View style={styles.legend}>
              {pieData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.text}: {item.value.toFixed(2)} PLN</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ostatnie Transakcje</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAllText}>Zobacz wszystkie</Text>
          </TouchableOpacity>
        </View>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>Brak transakcji</Text>
            <Text style={styles.emptyStateSubtext}>Dodaj swoją pierwszą transakcję</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Ionicons
                  name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={transaction.type === 'income' ? '#4CAF50' : '#F44336'}
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionCategory}>{transaction.category}</Text>
                <Text style={styles.transactionDate}>
                  {format(new Date(transaction.date), 'dd MMM yyyy', { locale: pl })}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'income' ? '#4CAF50' : '#F44336' },
                ]}
              >
                {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} PLN
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={32} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats?.accounts_count || 0}</Text>
          <Text style={styles.statLabel}>Konta</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="card" size={32} color="#2196F3" />
          <Text style={styles.statNumber}>{stats?.credits_count || 0}</Text>
          <Text style={styles.statLabel}>Kredyty</Text>
        </View>
      </View>
    </ScrollView>
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
    fontSize: 16,
    color: '#999',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  balanceItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  legend: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    color: '#fff',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
