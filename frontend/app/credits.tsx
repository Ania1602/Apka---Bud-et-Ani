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
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { creditsDB, accountsDB, transactionsDB, recurringDB } from '../lib/database';

type CreditFilter = 'active' | 'paid' | 'all';

export default function Credits() {
  const [credits, setCredits] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overpayModal, setOverpayModal] = useState(false);
  const [overpayCredit, setOverpayCredit] = useState<any>(null);
  const [overpayAmount, setOverpayAmount] = useState('');
  const [selectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState<CreditFilter>('active');
  
  // Overpayment execution state
  const [execModal, setExecModal] = useState(false);
  const [execCredit, setExecCredit] = useState<any>(null);
  const [execAmount, setExecAmount] = useState('');
  const [execAccountId, setExecAccountId] = useState('');
  const [execLoading, setExecLoading] = useState(false);
  
  // Post-overpayment rate update state
  const [rateModal, setRateModal] = useState(false);
  const [rateCredit, setRateCredit] = useState<any>(null);
  const [firstRate, setFirstRate] = useState('');
  const [regularRate, setRegularRate] = useState('');
  const [lastRate, setLastRate] = useState('');

  const fetchCredits = async () => {
    try {
      const [data, accs] = await Promise.all([
        creditsDB.getAll(selectedMonth, selectedYear),
        accountsDB.getAll(),
      ]);
      setCredits(data);
      setAccounts(accs);
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

  const handleMarkAsPaid = (id: string, name: string) => {
    Alert.alert(
      'Oznacz jako spłacony',
      `Czy na pewno chcesz oznaczyć kredyt "${name}" jako spłacony?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Tak, spłacony',
          onPress: async () => {
            try {
              await creditsDB.markAsPaid(id);
              await recurringDB.deactivateByCreditId(id);
              fetchCredits();
            } catch (error) {
              console.error('Error marking credit as paid:', error);
            }
          },
        },
      ]
    );
  };

  const handleRestoreActive = (id: string, name: string) => {
    Alert.alert(
      'Przywróć jako aktywny',
      `Czy na pewno chcesz przywrócić kredyt "${name}" jako aktywny?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Tak, przywróć',
          onPress: async () => {
            try {
              await creditsDB.restoreActive(id);
              fetchCredits();
            } catch (error) {
              console.error('Error restoring credit:', error);
            }
          },
        },
      ]
    );
  };

  const handleOpenOverpay = (credit: any) => {
    setExecCredit(credit);
    setExecAmount('');
    setExecAccountId(accounts.length > 0 ? accounts[0].id : '');
    setExecModal(true);
  };

  const handleExecuteOverpay = async () => {
    if (!execCredit || !execAmount || !execAccountId) return;
    const amount = parseFloat(execAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Błąd', 'Podaj prawidłową kwotę'); return; }
    
    const account = accounts.find(a => a.id === execAccountId);
    if (!account) return;
    
    setExecLoading(true);
    try {
      // Create expense transaction
      await transactionsDB.create({
        type: 'expense',
        amount,
        category: 'Nadpłata kredytu',
        account_id: execAccountId,
        date: new Date().toISOString(),
        description: `Nadpłata kredytu: ${execCredit.name}`,
        credit_id: execCredit.id,
        capital_part: amount,
        interest_part: 0,
      });
      
      // Update credit remaining amount
      await creditsDB.overpay(execCredit.id, amount);
      
      setExecModal(false);
      fetchCredits();
      
      // Ask about overpayment strategy
      Alert.alert(
        'Nadpłata zapisana!',
        `Pomniejszono dług o ${amount.toFixed(2)} PLN.\n\nCo chcesz zrobić?`,
        [
          {
            text: 'Obniżyć ratę',
            onPress: () => {
              setRateCredit(execCredit);
              setFirstRate(''); setRegularRate(''); setLastRate('');
              setRateModal(true);
            },
          },
          {
            text: 'Skrócić okres',
            onPress: () => {
              const newRemaining = Math.max(0, (execCredit.remaining_amount || 0) - amount);
              const monthlyPmt = execCredit.monthly_payment || 0;
              if (monthlyPmt > 0) {
                const newMonths = Math.ceil(newRemaining / monthlyPmt);
                const now = new Date();
                const endDate = new Date(now.getFullYear(), now.getMonth() + newMonths, now.getDate());
                Alert.alert('Skrócony okres', `Nowa data końca spłaty: ${endDate.toLocaleDateString('pl-PL')}\nPozostało ${newMonths} rat`);
              } else {
                Alert.alert('Info', 'Okres skrócony - rata bez zmian');
              }
            },
          },
          { text: 'Bez zmian', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error executing overpayment:', error);
      Alert.alert('Błąd', 'Nie udało się wykonać nadpłaty');
    } finally {
      setExecLoading(false);
    }
  };

  const handleSaveRate = async () => {
    if (!rateCredit) return;
    try {
      const rateInfo: any = {};
      if (firstRate) rateInfo.first_rate = parseFloat(firstRate);
      if (regularRate) rateInfo.regular_rate = parseFloat(regularRate);
      if (lastRate) rateInfo.last_rate = parseFloat(lastRate);
      if (regularRate) rateInfo.monthly_payment = parseFloat(regularRate);
      
      await creditsDB.overpay(rateCredit.id, 0, rateInfo);
      
      // Update recurring transaction if exists
      if (regularRate) {
        const recurrings = await recurringDB.getAll();
        const linked = recurrings.find((r: any) => r.credit_id === rateCredit.id && r.is_active);
        if (linked) {
          await recurringDB.update(linked.id, { amount: parseFloat(regularRate) });
        }
      }
      
      setRateModal(false);
      fetchCredits();
      Alert.alert('Gotowe', 'Raty zostały zaktualizowane');
    } catch (error) {
      console.error('Error updating rate:', error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować raty');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const activeCredits = credits.filter(c => c.status !== 'paid');
  const paidCredits = credits.filter(c => c.status === 'paid');
  const totalRemaining = activeCredits.reduce((sum, credit) => sum + credit.remaining_amount, 0);
  const totalBorrowed = activeCredits.reduce((sum, credit) => sum + credit.total_amount, 0);
  const totalMonthlyPaid = activeCredits.reduce((sum, credit) => sum + (credit.monthly_paid || 0), 0);

  const filteredCredits = filter === 'active' ? activeCredits 
    : filter === 'paid' ? paidCredits 
    : [...activeCredits, ...paidCredits];

  // Debt calculator
  const calcCredit = (credit: any) => {
    const rate = (credit.interest_rate || 0) / 100 / 12;
    const remaining = credit.remaining_amount || 0;
    const monthly = credit.monthly_payment || 0;
    if (monthly <= 0 || remaining <= 0) return { months: 0, totalInterest: 0, totalPaid: 0 };
    
    let balance = remaining;
    let totalInterest = 0;
    let months = 0;
    while (balance > 0 && months < 600) {
      const interest = balance * rate;
      const capital = Math.min(monthly - interest, balance);
      totalInterest += interest;
      balance -= capital;
      months++;
    }
    return { months, totalInterest, totalPaid: remaining + totalInterest };
  };

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

      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        {([
          { key: 'active' as CreditFilter, label: 'Aktywne', count: activeCredits.length },
          { key: 'paid' as CreditFilter, label: 'Spłacone', count: paidCredits.length },
          { key: 'all' as CreditFilter, label: 'Wszystkie', count: credits.length },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredCredits}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color="#9B8B7E" />
            <Text style={styles.emptyStateText}>{filter === 'paid' ? 'Brak spłaconych kredytów' : filter === 'active' ? 'Brak aktywnych kredytów' : 'Brak kredytów'}</Text>
            {filter === 'active' && (
              <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-credit')}>
                <Text style={styles.addButtonText}>Dodaj Kredyt</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isPaid = item.status === 'paid';
          const progress = item.total_amount > 0 ? (item.total_amount - item.remaining_amount) / item.total_amount : 0;
          return (
            <View style={[styles.creditItem, isPaid && styles.creditItemPaid]}>
              {isPaid && (
                <View style={styles.paidBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#2C5F2D" />
                  <Text style={styles.paidBadgeText}>Spłacony</Text>
                </View>
              )}
              <View style={styles.creditHeader}>
                <View style={[styles.creditIcon, isPaid && { opacity: 0.5 }]}>
                  <Ionicons name="card" size={24} color={isPaid ? '#9B8B7E' : '#2196F3'} />
                </View>
                <View style={styles.creditDetails}>
                  <Text style={[styles.creditName, isPaid && { color: '#9B8B7E' }]}>{item.name}</Text>
                  <Text style={styles.creditDate}>
                    {format(new Date(item.start_date), 'dd MMM yyyy', { locale: pl })} -{' '}
                    {format(new Date(item.end_date), 'dd MMM yyyy', { locale: pl })}
                  </Text>
                </View>
                {!isPaid && (
                  <>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/add-credit', params: { edit: item.id } })} style={styles.editButton}>
                      <Ionicons name="create-outline" size={18} color="#D4AF37" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteCredit(item.id)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={18} color="#800020" />
                    </TouchableOpacity>
                  </>
                )}
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

              {(() => {
                const calc = calcCredit(item);
                if (calc.months === 0 || isPaid) return null;
                return (
                  <View style={styles.calcCard}>
                    <Text style={styles.calcTitle}>Kalkulator spłaty</Text>
                    <View style={styles.calcRow}>
                      <View style={styles.calcItem}>
                        <Text style={styles.calcLabel}>Miesięcy do spłaty</Text>
                        <Text style={styles.calcValue}>{calc.months}</Text>
                      </View>
                      <View style={styles.calcItem}>
                        <Text style={styles.calcLabel}>Odsetki łącznie</Text>
                        <Text style={[styles.calcValue, { color: '#800020' }]}>{calc.totalInterest.toFixed(2)}</Text>
                      </View>
                      <View style={styles.calcItem}>
                        <Text style={styles.calcLabel}>Zapłacisz łącznie</Text>
                        <Text style={styles.calcValue}>{calc.totalPaid.toFixed(2)}</Text>
                      </View>
                    </View>
                    {item.monthly_payment > 0 && (
                      <View style={styles.calcExtraRow}>
                        <Ionicons name="bulb" size={14} color="#D4AF37" />
                        <Text style={styles.calcExtra}>
                          +100 PLN/mies.: oszczędzisz ~{(calc.totalInterest * 0.3).toFixed(0)} PLN odsetek
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.overpayBtn} onPress={() => { setOverpayCredit(item); setOverpayAmount(''); setOverpayModal(true); }}>
                      <Ionicons name="calculator" size={16} color="#D4AF37" />
                      <Text style={styles.overpayBtnText}>Co jeśli nadpłacę?</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* Mark as paid / Restore button */}
              {isPaid ? (
                <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestoreActive(item.id, item.name)}>
                  <Ionicons name="refresh" size={16} color="#D4AF37" />
                  <Text style={styles.restoreBtnText}>Przywróć jako aktywny</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.overpayExecBtn} onPress={() => handleOpenOverpay(item)}>
                    <Ionicons name="cash" size={16} color="#D4AF37" />
                    <Text style={styles.overpayExecBtnText}>Nadpłać</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.markPaidBtn} onPress={() => handleMarkAsPaid(item.id, item.name)}>
                    <Ionicons name="checkmark-done" size={16} color="#2C5F2D" />
                    <Text style={styles.markPaidBtnText}>Spłacony</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-credit')}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Overpayment Calculator Modal */}
      <Modal visible={overpayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kalkulator nadpłaty</Text>
              <TouchableOpacity onPress={() => setOverpayModal(false)}>
                <Ionicons name="close" size={24} color="#2A2520" />
              </TouchableOpacity>
            </View>
            {overpayCredit && (
              <ScrollView>
                <Text style={styles.modalSubtitle}>{overpayCredit.name}</Text>
                <Text style={styles.modalInfo}>Pozostało: {overpayCredit.remaining_amount?.toFixed(2)} PLN | Rata: {overpayCredit.monthly_payment?.toFixed(2)} PLN</Text>
                
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Kwota jednorazowej nadpłaty</Text>
                  <TextInput style={styles.modalInput} value={overpayAmount}
                    onChangeText={(t) => setOverpayAmount(t.replace(',', '.'))}
                    placeholder="np. 5000" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
                </View>

                {overpayAmount && parseFloat(overpayAmount) > 0 && (() => {
                  const extra = parseFloat(overpayAmount);
                  const rate = (overpayCredit.interest_rate || 0) / 100 / 12;
                  const remaining = overpayCredit.remaining_amount || 0;
                  const monthly = overpayCredit.monthly_payment || 0;

                  // Current scenario
                  let bal1 = remaining, int1 = 0, m1 = 0;
                  while (bal1 > 0 && m1 < 600) { const i = bal1 * rate; int1 += i; bal1 -= Math.min(monthly - i, bal1); m1++; }

                  // Scenario 1: Same payment, shorter period
                  let bal2 = remaining - extra, int2 = 0, m2 = 0;
                  while (bal2 > 0 && m2 < 600) { const i = bal2 * rate; int2 += i; bal2 -= Math.min(monthly - i, bal2); m2++; }

                  // Scenario 2: Same period, lower payment
                  const newRemaining = remaining - extra;
                  let newMonthly = monthly;
                  if (m1 > 0 && rate > 0) {
                    newMonthly = newRemaining * rate * Math.pow(1 + rate, m1) / (Math.pow(1 + rate, m1) - 1);
                  } else if (m1 > 0) {
                    newMonthly = newRemaining / m1;
                  }
                  let bal3 = newRemaining, int3 = 0, m3 = 0;
                  while (bal3 > 0 && m3 < 600) { const i = bal3 * rate; int3 += i; bal3 -= Math.min(newMonthly - i, bal3); m3++; }

                  const savedMonths = m1 - m2;
                  const savedInterest1 = int1 - int2;
                  const savedInterest2 = int1 - int3;
                  const rateDiff = monthly - newMonthly;

                  return (
                    <View>
                      <View style={styles.scenarioCard}>
                        <View style={styles.scenarioHeader}>
                          <Ionicons name="time" size={18} color="#2C5F2D" />
                          <Text style={styles.scenarioTitle}>Krótsza spłata (ta sama rata)</Text>
                        </View>
                        <View style={styles.scenarioGrid}>
                          <View style={styles.scenarioItem}>
                            <Text style={styles.scenarioLabel}>Krócej o</Text>
                            <Text style={[styles.scenarioValue, { color: '#2C5F2D' }]}>{savedMonths} mies.</Text>
                          </View>
                          <View style={styles.scenarioItem}>
                            <Text style={styles.scenarioLabel}>Oszczędność odsetek</Text>
                            <Text style={[styles.scenarioValue, { color: '#2C5F2D' }]}>{savedInterest1.toFixed(0)} PLN</Text>
                          </View>
                          <View style={styles.scenarioItem}>
                            <Text style={styles.scenarioLabel}>Spłata w</Text>
                            <Text style={styles.scenarioValue}>{m2} mies.</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.scenarioCard}>
                        <View style={styles.scenarioHeader}>
                          <Ionicons name="wallet" size={18} color="#2196F3" />
                          <Text style={styles.scenarioTitle}>Niższa rata (ten sam okres)</Text>
                        </View>
                        <View style={styles.scenarioGrid}>
                          <View style={styles.scenarioItem}>
                            <Text style={styles.scenarioLabel}>Nowa rata</Text>
                            <Text style={[styles.scenarioValue, { color: '#2196F3' }]}>{newMonthly.toFixed(2)} PLN</Text>
                          </View>
                          <View style={styles.scenarioItem}>
                            <Text style={styles.scenarioLabel}>Mniej o</Text>
                            <Text style={[styles.scenarioValue, { color: '#2196F3' }]}>{rateDiff.toFixed(2)} PLN/mies.</Text>
                          </View>
                          <View style={styles.scenarioItem}>
                            <Text style={styles.scenarioLabel}>Oszczędność odsetek</Text>
                            <Text style={[styles.scenarioValue, { color: '#2C5F2D' }]}>{savedInterest2.toFixed(0)} PLN</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.scenarioTip}>
                        <Ionicons name="bulb" size={16} color="#D4AF37" />
                        <Text style={styles.scenarioTipText}>
                          Krótsza spłata oszczędza więcej odsetek ({savedInterest1.toFixed(0)} vs {savedInterest2.toFixed(0)} PLN)
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Overpayment Execution Modal */}
      <Modal visible={execModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nadpłać kredyt</Text>
              <TouchableOpacity onPress={() => setExecModal(false)}>
                <Ionicons name="close" size={24} color="#2A2520" />
              </TouchableOpacity>
            </View>
            {execCredit && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.execCreditName}>{execCredit.name}</Text>
                <Text style={styles.execCreditInfo}>Do spłaty: {execCredit.remaining_amount?.toFixed(2)} PLN</Text>
                
                <Text style={styles.inputLabel}>Konto do obciążenia:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountPicker}>
                  {accounts.filter(a => !((a.type === 'credit_card' || a.type === 'revolving') && a.credit_limit)).map((acc: any) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.accountChip, execAccountId === acc.id && styles.accountChipActive]}
                      onPress={() => setExecAccountId(acc.id)}
                    >
                      <Text style={[styles.accountChipText, execAccountId === acc.id && styles.accountChipTextActive]}>
                        {acc.name} ({acc.balance?.toFixed(0)} PLN)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <Text style={styles.inputLabel}>Kwota nadpłaty:</Text>
                <TextInput
                  style={styles.input}
                  value={execAmount}
                  onChangeText={setExecAmount}
                  keyboardType="decimal-pad"
                  placeholder="np. 5000"
                  placeholderTextColor="#9B8B7E"
                />
                
                <TouchableOpacity
                  style={[styles.execButton, (!execAmount || !execAccountId || execLoading) && { opacity: 0.5 }]}
                  onPress={handleExecuteOverpay}
                  disabled={!execAmount || !execAccountId || execLoading}
                >
                  {execLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.execButtonText}>Wykonaj nadpłatę</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Rate Update Modal */}
      <Modal visible={rateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Aktualizuj raty</Text>
              <TouchableOpacity onPress={() => setRateModal(false)}>
                <Ionicons name="close" size={24} color="#2A2520" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.rateHint}>Pola opcjonalne - puste = bez zmian</Text>
              
              <Text style={styles.inputLabel}>Pierwsza rata po nadpłacie:</Text>
              <TextInput
                style={styles.input}
                value={firstRate}
                onChangeText={setFirstRate}
                keyboardType="decimal-pad"
                placeholder="kwota (opcjonalnie)"
                placeholderTextColor="#9B8B7E"
              />
              
              <Text style={styles.inputLabel}>Kolejne raty (standardowa):</Text>
              <TextInput
                style={styles.input}
                value={regularRate}
                onChangeText={setRegularRate}
                keyboardType="decimal-pad"
                placeholder="kwota (opcjonalnie)"
                placeholderTextColor="#9B8B7E"
              />
              
              <Text style={styles.inputLabel}>Ostatnia rata (wyrównanie):</Text>
              <TextInput
                style={styles.input}
                value={lastRate}
                onChangeText={setLastRate}
                keyboardType="decimal-pad"
                placeholder="kwota (opcjonalnie)"
                placeholderTextColor="#9B8B7E"
              />
              
              <TouchableOpacity style={styles.execButton} onPress={handleSaveRate}>
                <Text style={styles.execButtonText}>Zapisz raty</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
  calcCard: { marginTop: 12, padding: 12, backgroundColor: '#FAF8F3', borderRadius: 10, borderWidth: 1, borderColor: '#E0D5C7' },
  calcTitle: { fontSize: 13, fontWeight: '600', color: '#D4AF37', marginBottom: 8 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calcItem: { alignItems: 'center', flex: 1 },
  calcLabel: { fontSize: 10, color: '#6B5D52', marginBottom: 2 },
  calcValue: { fontSize: 14, fontWeight: '700', color: '#2A2520' },
  calcExtraRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E0D5C7' },
  calcExtra: { fontSize: 12, color: '#6B5D52', flex: 1 },
  overpayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E0D5C7', padding: 8 },
  overpayBtnText: { fontSize: 13, fontWeight: '600', color: '#D4AF37' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000060' },
  modalContent: { backgroundColor: '#FAF8F3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2A2520' },
  modalSubtitle: { fontSize: 16, fontWeight: '600', color: '#D4AF37', marginBottom: 4 },
  modalInfo: { fontSize: 13, color: '#6B5D52', marginBottom: 16 },
  modalField: { marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '500', color: '#6B5D52', marginBottom: 8 },
  modalInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 18, fontWeight: '600', color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7' },
  scenarioCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  scenarioHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  scenarioTitle: { fontSize: 14, fontWeight: '600', color: '#2A2520' },
  scenarioGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  scenarioItem: { alignItems: 'center', flex: 1 },
  scenarioLabel: { fontSize: 10, color: '#6B5D52', marginBottom: 2 },
  scenarioValue: { fontSize: 14, fontWeight: '700', color: '#2A2520' },
  scenarioTip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#D4AF3710', borderRadius: 10, marginBottom: 16 },
  scenarioTipText: { fontSize: 12, color: '#6B5D52', flex: 1 },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F5F1E8',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9B8B7E',
  },
  filterTabTextActive: {
    color: '#2A2520',
    fontWeight: '600',
  },
  creditItemPaid: {
    opacity: 0.65,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C5F2D15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C5F2D',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    flex: 1,
  },
  markPaidBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C5F2D',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F1E8',
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4AF37',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F1E8',
  },
  overpayExecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#F5F1E8',
  },
  overpayExecBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4AF37',
  },
  execCreditName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2520',
    marginBottom: 4,
  },
  execCreditInfo: {
    fontSize: 13,
    color: '#6B5D52',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 6,
    marginTop: 12,
  },
  accountPicker: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  accountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F1E8',
    marginRight: 8,
  },
  accountChipActive: {
    backgroundColor: '#D4AF37',
  },
  accountChipText: {
    fontSize: 13,
    color: '#6B5D52',
    fontWeight: '500',
  },
  accountChipTextActive: {
    color: '#FFF',
  },
  execButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  execButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  rateHint: {
    fontSize: 12,
    color: '#9B8B7E',
    fontStyle: 'italic',
    marginBottom: 8,
  },
});
