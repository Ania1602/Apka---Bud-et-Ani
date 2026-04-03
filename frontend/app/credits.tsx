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
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { creditsDB } from '../lib/database';

export default function Credits() {
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());

  const fetchCredits = async () => {
    try {
      const data = await creditsDB.getAll(selectedMonth, selectedYear);
      setCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCredits();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCredits();
  };

  const deleteCredit = async (id: string) => {
    try {
      await creditsDB.delete(id);
      fetchCredits();
    } catch (error) {
      console.error('Error deleting credit:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const totalRemaining = credits.reduce((sum, credit) => sum + credit.remaining_amount, 0);
  const totalBorrowed = credits.reduce((sum, credit) => sum + credit.total_amount, 0);
  const totalMonthlyPaid = credits.reduce((sum, credit) => sum + (credit.monthly_paid || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2A2520" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Kredyty</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Całkowita Kwota</Text>
            <Text style={styles.summaryAmount}>{totalBorrowed.toFixed(2)} PLN</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Do Spłaty</Text>
            <Text style={[styles.summaryAmount, { color: '#800020' }]}>{totalRemaining.toFixed(2)} PLN</Text>
          </View>
        </View>
        
        {totalMonthlyPaid > 0 && (
          <View style={styles.monthlyTotalCard}>
            <Ionicons name="checkmark-circle" size={24} color="#2C5F2D" />
            <View style={styles.monthlyTotalContent}>
              <Text style={styles.monthlyTotalLabel}>Spłacono w tym miesiącu</Text>
              <Text style={styles.monthlyTotalAmount}>{totalMonthlyPaid.toFixed(2)} PLN</Text>
            </View>
          </View>
        )}
        
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalBorrowed > 0 ? ((totalBorrowed - totalRemaining) / totalBorrowed) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Spłacono: {totalBorrowed > 0 ? (((totalBorrowed - totalRemaining) / totalBorrowed) * 100).toFixed(1) : 0}%
        </Text>
      </View>

      <FlatList
        data={credits}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color="#9B8B7E" />
            <Text style={styles.emptyStateText}>Brak kredytów</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-credit')}>
              <Text style={styles.addButtonText}>Dodaj Kredyt</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const progress = item.total_amount > 0 ? (item.total_amount - item.remaining_amount) / item.total_amount : 0;
          return (
            <View style={styles.creditItem}>
              <View style={styles.creditHeader}>
                <View style={styles.creditIcon}>
                  <Ionicons name="card" size={24} color="#2196F3" />
                </View>
                <View style={styles.creditDetails}>
                  <Text style={styles.creditName}>{item.name}</Text>
                  <Text style={styles.creditDate}>
                    {format(new Date(item.start_date), 'dd MMM yyyy', { locale: pl })} -{' '}
                    {format(new Date(item.end_date), 'dd MMM yyyy', { locale: pl })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push({ pathname: '/add-credit', params: { edit: item.id } })} style={styles.editButton}>
                  <Ionicons name="create-outline" size={18} color="#D4AF37" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteCredit(item.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color="#800020" />
                </TouchableOpacity>
              </View>

              <View style={styles.creditAmounts}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Całkowita kwota</Text>
                  <Text style={styles.amountValue}>{item.total_amount.toFixed(2)} PLN</Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Do spłaty</Text>
                  <Text style={[styles.amountValue, { color: '#800020' }]}>
                    {item.remaining_amount.toFixed(2)} PLN
                  </Text>
                </View>
              </View>

              {item.monthly_paid !== undefined && item.monthly_paid !== null && (
                <View style={styles.monthlyPaymentCard}>
                  <Ionicons name="calendar-outline" size={16} color="#2C5F2D" />
                  <Text style={styles.monthlyPaymentText}>
                    Spłacono w tym miesiącu: <Text style={styles.monthlyPaymentAmount}>{item.monthly_paid.toFixed(2)} PLN</Text>
                  </Text>
                </View>
              )}

              <View style={styles.creditProgressBar}>
                <View style={[styles.creditProgressFill, { width: `${progress * 100}%` }]} />
              </View>

              <View style={styles.creditFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="calendar" size={16} color="#6B5D52" />
                  <Text style={styles.footerText}>{item.monthly_payment.toFixed(2)} PLN/mies.</Text>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="trending-up" size={16} color="#6B5D52" />
                  <Text style={styles.footerText}>{item.interest_rate}% oprocentowanie</Text>
                </View>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-credit')}>
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B5D52',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  monthlyTotalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C5F2D15',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2C5F2D',
  },
  monthlyTotalContent: {
    flex: 1,
  },
  monthlyTotalLabel: {
    fontSize: 13,
    color: '#6B5D52',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  monthlyTotalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C5F2D',
    letterSpacing: -0.5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F5F1E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
  },
  progressText: {
    fontSize: 12,
    color: '#6B5D52',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  creditItem: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F320',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creditDetails: {
    flex: 1,
  },
  creditName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 4,
  },
  creditDate: {
    fontSize: 12,
    color: '#6B5D52',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 4,
  },
  editButton: {
    padding: 4,
    marginRight: 8,
  },
  creditAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B5D52',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2520',
  },
  monthlyPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C5F2D15',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2C5F2D',
  },
  monthlyPaymentText: {
    fontSize: 13,
    color: '#6B5D52',
    flex: 1,
  },
  monthlyPaymentAmount: {
    fontWeight: '600',
    color: '#2C5F2D',
  },
  creditProgressBar: {
    height: 6,
    backgroundColor: '#F5F1E8',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  creditProgressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
  },
  creditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#6B5D52',
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
