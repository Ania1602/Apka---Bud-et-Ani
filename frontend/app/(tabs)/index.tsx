import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { PieChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { initDatabase, getDashboardStats, transactionsDB } from '../../lib/database';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const fetchData = async () => {
    try {
      await initDatabase();
      const [statsData, transactionsData] = await Promise.all([
        getDashboardStats(selectedMonth, selectedYear),
        transactionsDB.getAll(5),
      ]);
      setStats(statsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [selectedMonth, selectedYear])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const pieData = [
    { value: stats?.total_income || 0, color: '#2C5F2D', text: 'Przychody' },
    { value: stats?.total_expenses || 0, color: '#800020', text: 'Wydatki' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Budżet Ani</Text>
          <TouchableOpacity onPress={() => setShowPeriodPicker(!showPeriodPicker)} style={styles.periodSelector}>
            <Text style={styles.headerSubtitle}>
              {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: pl })}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6B5D52" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => {
            Alert.alert('Eksport', 'Funkcja eksportu danych będzie dostępna wkrótce.');
          }}
        >
          <Ionicons name="download" size={24} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      {showPeriodPicker && (
        <View style={styles.periodPicker}>
          <View style={styles.periodPickerHeader}>
            <Text style={styles.periodPickerTitle}>Wybierz Okres</Text>
            <TouchableOpacity onPress={() => setShowPeriodPicker(false)}>
              <Ionicons name="close" size={24} color="#2A2520" />
            </TouchableOpacity>
          </View>
          <View style={styles.monthGrid}>
            {['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'].map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.monthButton,
                  selectedMonth === index + 1 && styles.monthButtonActive,
                ]}
                onPress={() => {
                  setSelectedMonth(index + 1);
                  setShowPeriodPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.monthButtonText,
                    selectedMonth === index + 1 && styles.monthButtonTextActive,
                  ]}
                >
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.yearSelector}>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setSelectedYear(selectedYear - 1)}
            >
              <Ionicons name="chevron-back" size={24} color="#D4AF37" />
            </TouchableOpacity>
            <Text style={styles.yearText}>{selectedYear}</Text>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setSelectedYear(selectedYear + 1)}
            >
              <Ionicons name="chevron-forward" size={24} color="#D4AF37" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#D4AF37" />
          <Text style={styles.balanceLabel}>Całkowity Bilans</Text>
        </View>
        <Text style={styles.balanceAmount}>{stats?.total_balance?.toFixed(2) || '0.00'} PLN</Text>
        
        <View style={styles.divider} />
        
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="trending-up" size={20} color="#2C5F2D" />
            </View>
            <Text style={styles.balanceItemLabel}>Przychody</Text>
            <Text style={[styles.balanceItemAmount, { color: '#2C5F2D' }]}>
              +{stats?.total_income?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="trending-down" size={20} color="#800020" />
            </View>
            <Text style={styles.balanceItemLabel}>Wydatki</Text>
            <Text style={[styles.balanceItemAmount, { color: '#800020' }]}>
              -{stats?.total_expenses?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/add-transaction')}>
        <Ionicons name="add-circle" size={22} color="#FFFFFF" />
        <Text style={styles.actionButtonText}>Nowa Transakcja</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.transferButton} onPress={() => router.push('/transfer')}>
        <Ionicons name="swap-horizontal" size={22} color="#D4AF37" />
        <Text style={styles.transferButtonText}>Przelew między kontami</Text>
      </TouchableOpacity>

      {pieData[0].value > 0 || pieData[1].value > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Struktura Przepływów</Text>
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
                  <View>
                    <Text style={styles.legendLabel}>{item.text}</Text>
                    <Text style={styles.legendValue}>{item.value.toFixed(2)} PLN</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ostatnie Operacje</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAllText}>Zobacz wszystkie →</Text>
          </TouchableOpacity>
        </View>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={48} color="#9B8B7E" />
            </View>
            <Text style={styles.emptyStateText}>Brak transakcji</Text>
            <Text style={styles.emptyStateSubtext}>Dodaj swoją pierwszą operację</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={[
                styles.transactionIcon,
                { backgroundColor: transaction.type === 'income' ? '#2C5F2D15' : '#80002015' }
              ]}>
                <Ionicons
                  name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={transaction.type === 'income' ? '#2C5F2D' : '#800020'}
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
                  { color: transaction.type === 'income' ? '#2C5F2D' : '#800020' },
                ]}
              >
                {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/accounts')}>
          <View style={styles.statIcon}>
            <Ionicons name="wallet" size={28} color="#D4AF37" />
          </View>
          <Text style={styles.statNumber}>{stats?.accounts_count || 0}</Text>
          <Text style={styles.statLabel}>Konta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/credits')}>
          <View style={styles.statIcon}>
            <Ionicons name="card" size={28} color="#1B2845" />
          </View>
          <Text style={styles.statNumber}>{stats?.credits_count || 0}</Text>
          <Text style={styles.statLabel}>Kredyty</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FAF8F3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  exportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  periodPicker: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  periodPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  periodPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  monthButton: {
    width: '22%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: '#D4AF37',
  },
  monthButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B5D52',
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  yearButton: {
    padding: 8,
  },
  yearText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2A2520',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2A2520',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B5D52',
    marginTop: 6,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#6B5D52',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 20,
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0D5C7',
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  balanceItemLabel: {
    fontSize: 12,
    color: '#6B5D52',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  balanceItemAmount: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  actionButton: {
    backgroundColor: '#D4AF37',
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  transferButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  transferButtonText: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2A2520',
  },
  legend: {
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 13,
    color: '#6B5D52',
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A2520',
  },
  section: {
    padding: 20,
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
    color: '#2A2520',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '500',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    color: '#2A2520',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B5D52',
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B5D52',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B5D52',
    letterSpacing: 0.3,
  },
});
