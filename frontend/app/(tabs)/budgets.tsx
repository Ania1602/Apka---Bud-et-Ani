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
import { budgetsDB, transactionsDB, accountsDB, plansDB } from '../../lib/database';

export default function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTx, setAllTx] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  const fetchBudgets = async () => {
    try {
      const now = new Date();
      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();
      const [data, allTxData, accountsData, plansData] = await Promise.all([
        budgetsDB.getAll(curMonth, curYear),
        transactionsDB.getAll(),
        accountsDB.getAll(),
        plansDB.getByMonth(curMonth, curYear),
      ]);
      setBudgets(data);
      setAllTx(allTxData);
      setAccounts(accountsData);
      setPlans(plansData ? [plansData] : []);
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
    if (percentage >= 100) return '#D32F2F';
    if (percentage >= 80) return '#FF9800';
    if (percentage >= 50) return '#FFC107';
    return '#2C5F2D';
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate() + 1; // include today
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

        {/* Quick metric widgets */}
        {(() => {
          const now = new Date();
          const curMonth = now.getMonth() + 1;
          const curYear = now.getFullYear();
          const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
          const weekExp = allTx.filter((t: any) => t.type === 'expense' && !t.is_transfer && !t.is_limit_refund && new Date(t.date) >= monday).reduce((s: number, t: any) => s + t.amount, 0);
          const monthStart = new Date(curYear, curMonth - 1, 1);
          const monthExp = allTx.filter((t: any) => t.type === 'expense' && !t.is_transfer && !t.is_limit_refund && new Date(t.date) >= monthStart && new Date(t.date).getMonth() + 1 === curMonth).reduce((s: number, t: any) => s + t.amount, 0);
          const totalBudgetAmt = budgets.reduce((s: number, b: any) => s + (b.limit_amount || b.amount || b.limit || 0), 0);
          const budgetCats = budgets.flatMap((b: any) => b.categories || [b.category]);
          const budgetExp = allTx.filter((t: any) => t.type === 'expense' && !t.is_transfer && !t.is_limit_refund && budgetCats.includes(t.category) && new Date(t.date) >= monthStart && new Date(t.date).getMonth() + 1 === curMonth).reduce((s: number, t: any) => s + t.amount, 0);
          const remaining = totalBudgetAmt > 0 ? totalBudgetAmt - budgetExp : null;
          return (
            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#9B8B7E', textTransform: 'uppercase' }}>Ten tydzień</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#800020', marginTop: 4 }}>-{weekExp.toFixed(0)} zł</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#9B8B7E', textTransform: 'uppercase' }}>Ten miesiąc</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#800020', marginTop: 4 }}>-{monthExp.toFixed(0)} zł</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#9B8B7E', textTransform: 'uppercase' }}>Zostało</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: remaining === null ? '#9B8B7E' : remaining >= 0 ? '#2C5F2D' : '#800020', marginTop: 4 }}>{remaining === null ? '—' : `${remaining.toFixed(0)} zł`}</Text>
              </View>
            </View>
          );
        })()}

        {/* Payday counter */}
        {(() => {
          const now = new Date();
          const curMonth = now.getMonth() + 1;
          const curYear = now.getFullYear();
          const plan = plans[0];
          if (!plan || !plan.incomes || plan.incomes.length === 0) return null;
          const topIncome = plan.incomes.reduce((max: any, inc: any) => (inc.amount || 0) > (max.amount || 0) ? inc : max, plan.incomes[0]);
          const payDay = topIncome.day || 30;
          const today = now.getDate();
          let daysToPayday = 0;
          if (today <= payDay) { daysToPayday = payDay - today; }
          else { const nextMonth = new Date(curYear, curMonth, 0); daysToPayday = nextMonth.getDate() - today + payDay; }
          const ownAccounts = accounts.filter((a: any) => a.type !== 'credit_card' && a.type !== 'revolving');
          const freeBalance = ownAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
          const unpaidExpenses = plan.expenses ? plan.expenses.filter((e: any) => !e.paid).reduce((s: number, e: any) => s + (e.amount || 0), 0) : 0;
          const available = freeBalance - unpaidExpenses;
          const dailyBudget = daysToPayday > 0 ? available / daysToPayday : available;
          const budgetColor = dailyBudget < 0 ? '#800020' : dailyBudget < 30 ? '#800020' : dailyBudget < 100 ? '#D4AF37' : '#2C5F2D';
          return (
            <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="wallet" size={24} color="#D4AF37" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: '#2A2520' }}>Do wypłaty: <Text style={{ fontWeight: '700' }}>{daysToPayday} dni</Text></Text>
                <Text style={{ fontSize: 13, color: budgetColor, fontWeight: '600', marginTop: 2 }}>Dzienny budżet: {dailyBudget < 0 ? 'Uważaj — przekroczono' : `${dailyBudget.toFixed(0)} zł`}</Text>
              </View>
            </View>
          );
        })()}

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
              const remaining = (budget.limit_amount || 0) - (budget.spent_amount || 0);
              const daysLeft = getDaysRemaining();
              const perDay = daysLeft > 0 ? remaining / daysLeft : 0;
              const alertText = percentage >= 100 ? 'PRZEKROCZONO LIMIT!' : percentage >= 80 ? 'Zbliżasz się do limitu!' : null;
              
              return (
                <View key={budget.id} style={styles.budgetCard}>
                  {alertText && (
                    <View style={[styles.alertBanner, { backgroundColor: percentage >= 100 ? '#D32F2F15' : '#FF980015' }]}>
                      <Ionicons name={percentage >= 100 ? 'alert-circle' : 'warning'} size={16} color={statusColor} />
                      <Text style={[styles.alertText, { color: statusColor }]}>{alertText}</Text>
                    </View>
                  )}
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetIcon}>
                      <Ionicons name="pricetag" size={24} color="#D4AF37" />
                    </View>
                    <View style={styles.budgetDetails}>
                      <Text style={styles.budgetCategory}>{budget.name || budget.categories?.join(', ') || budget.category}</Text>
                      <Text style={styles.budgetAmount}>
                        {(budget.spent_amount || 0).toFixed(2)} / {(budget.limit_amount || 0).toFixed(2)} PLN
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/add-budget', params: { edit: budget.id } })} style={styles.editButton}>
                      <Ionicons name="create-outline" size={18} color="#D4AF37" />
                    </TouchableOpacity>
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
                      Pozostało: {remaining.toFixed(2)} PLN
                    </Text>
                  </View>
                  <View style={styles.perDayRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6B5D52" />
                    <Text style={styles.perDayText}>
                      {perDay > 0 ? `${perDay.toFixed(2)} zł/dzień` : 'Limit wyczerpany'} ({daysLeft} dni do końca miesiąca)
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
  editButton: {
    padding: 4,
    marginRight: 8,
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
  perDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F1E8',
  },
  perDayText: {
    fontSize: 13,
    color: '#6B5D52',
    fontWeight: '500',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
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
