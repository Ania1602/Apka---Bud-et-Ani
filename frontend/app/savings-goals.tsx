import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { savingsGoalsDB, transactionsDB, accountsDB } from '../lib/database';

export default function SavingsGoals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avgMonthlyExpense, setAvgMonthlyExpense] = useState(0);
  
  const [depositModal, setDepositModal] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState('');
  const [depositGoalName, setDepositGoalName] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');

  const fetch_ = async () => {
    try {
      const [g, a] = await Promise.all([savingsGoalsDB.getAll(), accountsDB.getAll()]);
      setGoals(g);
      setAccounts(a.filter((ac: any) => !((ac.type === 'credit_card' || ac.type === 'revolving') && ac.credit_limit)));
      const allTx = await transactionsDB.getAll(9999);
      const expenses = allTx.filter((t: any) => t.type === 'expense' && !t.is_transfer);
      if (expenses.length > 0) {
        const dates = expenses.map((t: any) => new Date(t.date));
        const oldest = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
        const months = Math.max(1, (new Date().getTime() - oldest.getTime()) / (30 * 24 * 60 * 60 * 1000));
        setAvgMonthlyExpense(expenses.reduce((s: number, t: any) => s + t.amount, 0) / months);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { fetch_(); }, []));

  const openDeposit = (goalId: string, goalName: string) => {
    setDepositGoalId(goalId); setDepositGoalName(goalName);
    setDepositAmount(''); setDepositAccountId(accounts.length > 0 ? accounts[0].id : '');
    setDepositModal(true);
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount || '0');
    if (amt <= 0 || !depositAccountId) { Alert.alert('Błąd', 'Podaj kwotę i wybierz konto'); return; }
    try {
      await savingsGoalsDB.addAmount(depositGoalId, amt);
      await transactionsDB.create({
        type: 'expense', amount: amt, category: 'Oszczędności',
        account_id: depositAccountId, date: new Date().toISOString(),
        description: `Wpłata na cel: ${depositGoalName}`, is_transfer: false,
      });
      setDepositModal(false);
      fetch_();
      Alert.alert('Gotowe', `Wpłacono ${amt.toFixed(2)} PLN na "${depositGoalName}"`);
    } catch (e) { Alert.alert('Błąd', 'Nie udało się wykonać wpłaty'); }
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  return (
    <View style={s.container}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#2A2520" /></TouchableOpacity>
        <Text style={s.headerTitle}>Cele Oszczędnościowe</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList data={goals} keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch_(); }} tintColor="#D4AF37" />}
        ListHeaderComponent={(() => {
          const emergencyGoals = goals.filter(g => g.name.toLowerCase().includes('awaryjn') || g.name.toLowerCase().includes('emergency'));
          const emergencyTotal = emergencyGoals.reduce((s: number, g: any) => s + (g.current_amount || 0), 0);
          const monthsCovered = avgMonthlyExpense > 0 ? emergencyTotal / avgMonthlyExpense : 0;
          if (emergencyGoals.length === 0 && goals.length === 0) return null;
          return (
            <View style={s.emergencyCard}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                <Ionicons name="shield-checkmark" size={22} color="#D4AF37" />
                <Text style={{fontSize:15,fontWeight:'600',color:'#2A2520'}}>Fundusz Awaryjny</Text>
              </View>
              <Text style={{fontSize:24,fontWeight:'bold',color:monthsCovered>=3?'#2C5F2D':'#FF9800'}}>{emergencyTotal.toFixed(2)} PLN</Text>
              <Text style={{fontSize:13,color:'#6B5D52',marginTop:4}}>
                {avgMonthlyExpense > 0 ? `Pokrywa ${monthsCovered.toFixed(1)} miesiąca wydatków (śr. ${avgMonthlyExpense.toFixed(0)} PLN/mies.)` : 'Dodaj transakcje aby obliczyć pokrycie'}
              </Text>
              <View style={{height:6,backgroundColor:'#E0D5C7',borderRadius:3,marginTop:12}}>
                <View style={{height:6,backgroundColor:monthsCovered>=6?'#2C5F2D':monthsCovered>=3?'#FF9800':'#D32F2F',borderRadius:3,width:`${Math.min(monthsCovered/6*100,100)}%`}} />
              </View>
              <Text style={{fontSize:11,color:'#9B8B7E',marginTop:4}}>Cel: 6 miesięcy wydatków</Text>
              {emergencyGoals.length > 0 && (
                <TouchableOpacity style={s.emergencyDepositBtn} onPress={() => openDeposit(emergencyGoals[0].id, 'Fundusz Awaryjny')}>
                  <Ionicons name="add-circle" size={18} color="#D4AF37" />
                  <Text style={s.emergencyDepositText}>Wpłać</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="trophy-outline" size={64} color="#9B8B7E" /><Text style={s.emptyText}>Brak celów</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/add-goal')}><Text style={s.addBtnText}>Dodaj Cel</Text></TouchableOpacity></View>}
        renderItem={({ item }) => {
          const pct = item.target_amount > 0 ? (item.current_amount / item.target_amount) * 100 : 0;
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.goalIcon}><Ionicons name="trophy" size={24} color="#D4AF37" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.goalName}>{item.name}</Text>
                  <Text style={s.goalTarget}>{item.current_amount.toFixed(2)} / {item.target_amount.toFixed(2)} PLN</Text>
                </View>
                <TouchableOpacity onPress={() => router.push({ pathname: '/add-goal', params: { edit: item.id } })}>
                  <Ionicons name="create-outline" size={18} color="#D4AF37" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Usuń', `Usunąć cel "${item.name}"?`, [{ text: 'Anuluj' }, { text: 'Usuń', style: 'destructive', onPress: async () => { await savingsGoalsDB.delete(item.id); fetch_(); } }])}>
                  <Ionicons name="trash-outline" size={18} color="#800020" />
                </TouchableOpacity>
              </View>
              <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` }]} /></View>
              <Text style={s.pctText}>{pct.toFixed(0)}% osiągnięte</Text>
              <TouchableOpacity style={s.depositBtn} onPress={() => openDeposit(item.id, item.name)}>
                <Ionicons name="wallet" size={18} color="#FFF" />
                <Text style={s.depositBtnText}>Wpłać</Text>
              </TouchableOpacity>
              {item.deadline && <Text style={s.deadline}>Termin: {new Date(item.deadline).toLocaleDateString('pl-PL')}</Text>}
            </View>
          );
        }} contentContainerStyle={s.list} />
      <TouchableOpacity style={s.fab} onPress={() => router.push('/add-goal')}><Ionicons name="add" size={32} color="#FFF" /></TouchableOpacity>

      <Modal visible={depositModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Wpłać na: {depositGoalName}</Text>
              <TouchableOpacity onPress={() => setDepositModal(false)}><Ionicons name="close" size={24} color="#2A2520" /></TouchableOpacity>
            </View>
            <Text style={s.inputLabel}>Konto:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
              {accounts.map((acc: any) => (
                <TouchableOpacity key={acc.id} style={[s.accChip, depositAccountId === acc.id && s.accChipActive]} onPress={() => setDepositAccountId(acc.id)}>
                  <Text style={[s.accChipText, depositAccountId === acc.id && s.accChipTextActive]}>{acc.name} ({acc.balance?.toFixed(0)})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.inputLabel}>Kwota:</Text>
            <TextInput style={s.input} value={depositAmount} onChangeText={v => setDepositAmount(v.replace(',','.'))} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#9B8B7E" />
            <TouchableOpacity style={[s.submitBtn, (!depositAmount || !depositAccountId) && {opacity:0.5}]} onPress={handleDeposit} disabled={!depositAmount || !depositAccountId}>
              <Text style={s.submitBtnText}>Wpłać</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 100 },
  emergencyCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginHorizontal: 20, marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: '#D4AF3730' },
  emergencyDepositBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, backgroundColor: '#D4AF3715', borderRadius: 10 },
  emergencyDepositText: { fontSize: 14, fontWeight: '600', color: '#D4AF37' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  goalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  goalName: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginBottom: 4 },
  goalTarget: { fontSize: 14, color: '#6B5D52' },
  progressBar: { height: 10, backgroundColor: '#F5F1E8', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 5 },
  pctText: { fontSize: 13, color: '#D4AF37', fontWeight: '600', marginBottom: 12 },
  depositBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 12 },
  depositBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  deadline: { fontSize: 12, color: '#6B5D52', marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginTop: 16, marginBottom: 24 },
  addBtn: { backgroundColor: '#D4AF37', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  addBtnText: { color: '#2A2520', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FAF8F3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#2A2520' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#2A2520', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 18, color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7', marginBottom: 16 },
  accChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F1E8', marginRight: 8 },
  accChipActive: { backgroundColor: '#D4AF37' },
  accChipText: { fontSize: 13, color: '#6B5D52' },
  accChipTextActive: { color: '#FFF' },
  submitBtn: { backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
