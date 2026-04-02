import React, { useState, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { budgetsDB } from '../../lib/database';

export default function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBudgets = async () => {
    try {
      const now = new Date();
      const data = await budgetsDB.getAll(now.getMonth() + 1, now.getFullYear());
      setBudgets(data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBudgets();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBudgets();
  };

  const deleteBudget = async (id: string) => {
    try {
      await budgetsDB.delete(id);
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const getPercentage = (spent: number, limit: number) => {
    return limit > 0 ? (spent / limit) * 100 : 0;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return '#800020';
    if (percentage >= 80) return '#FF9800';
    return '#D4AF37';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const totalLimit = budgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0);
  const overallPercentage = getPercentage(totalSpent, totalLimit);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Budżety Miesięczne</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {budgets.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Całkowity Budżet</Text>
            <Text style={styles.summaryAmount}>{totalLimit.toFixed(2)} PLN</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(overallPercentage, 100)}%`, backgroundColor: getStatusColor(overallPercentage) },
                ]}
              />
            </View>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summarySmallLabel}>Wydano</Text>
                <Text style={[styles.summarySmallValue, { color: getStatusColor(overallPercentage) }]}>
                  {totalSpent.toFixed(2)} PLN
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.summarySmallLabel}>Pozostało</Text>
                <Text style={styles.summarySmallValue}>{(totalLimit - totalSpent).toFixed(2)} PLN</Text>
              </View>
            </View>
          </View>
        )}

        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={64} color="#9B8B7E" />
            <Text style={styles.emptyStateText}>Brak budżetów</Text>
            <Text style={styles.emptyStateSubtext}>Ustaw budżety dla swoich kategorii wydatków</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-budget')}>
              <Text style={styles.addButtonText}>Dodaj Budżet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.budgetsList}>
            {budgets.map((budget) => {
              const percentage = getPercentage(budget.spent_amount || 0, budget.limit_amount || 0);
              const statusColor = getStatusColor(percentage);
              
              return (
                <View key={budget.id} style={styles.budgetCard}>
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetIcon}>
                      <Ionicons name="pricetag" size={24} color="#D4AF37" />
                    </View>
                    <View style={styles.budgetDetails}>
                      <Text style={styles.budgetCategory}>{budget.category}</Text>
                      <Text style={styles.budgetAmount}>
                        {(budget.spent_amount || 0).toFixed(2)} / {(budget.limit_amount || 0).toFixed(2)} PLN
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteBudget(budget.id)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={18} color="#800020" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${Math.min(percentage, 100)}%`, backgroundColor: statusColor },
                      ]}
                    />
                  </View>
                  
                  <View style={styles.budgetFooter}>
                    <Text style={[styles.percentageText, { color: statusColor }]}>
                      {percentage.toFixed(0)}% wykorzystane
                    </Text>
                    <Text style={styles.remainingText}>
                      Pozostało: {((budget.limit_amount || 0) - (budget.spent_amount || 0)).toFixed(2)} PLN
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-budget')}>
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
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2A2520',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B5D52',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B5D52',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2A2520',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F5F1E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summarySmallLabel: {
    fontSize: 12,
    color: '#6B5D52',
    marginBottom: 4,
  },
  summarySmallValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2520',
  },
  budgetsList: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4AF3720',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  budgetDetails: {
    flex: 1,
  },
  budgetCategory: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 14,
    color: '#6B5D52',
  },
  deleteButton: {
    padding: 4,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 14,
    color: '#6B5D52',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B5D52',
    marginTop: 8,
    textAlign: 'center',
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
