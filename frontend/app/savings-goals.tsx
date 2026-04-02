import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { savingsGoalsDB } from '../lib/database';

export default function SavingsGoals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addAmount, setAddAmount] = useState<Record<string, string>>({});

  const fetch_ = async () => { try { setGoals(await savingsGoalsDB.getAll()); } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); } };
  useFocusEffect(useCallback(() => { fetch_(); }, []));

  const handleAdd = async (id: string) => {
    const amt = parseFloat(addAmount[id] || '0');
    if (amt <= 0) return;
    await savingsGoalsDB.addAmount(id, amt);
    setAddAmount({ ...addAmount, [id]: '' });
    fetch_();
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
        ListEmptyComponent={<View style={s.empty}><Ionicons name="trophy-outline" size={64} color="#9B8B7E" /><Text style={s.emptyText}>Brak celów</Text><Text style={s.emptySubtext}>Ustaw cele oszczędnościowe!</Text>
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
                <TouchableOpacity onPress={() => Alert.alert('Usuń', `Usunąć cel "${item.name}"?`, [{ text: 'Anuluj' }, { text: 'Usuń', style: 'destructive', onPress: async () => { await savingsGoalsDB.delete(item.id); fetch_(); } }])}>
                  <Ionicons name="trash-outline" size={18} color="#800020" />
                </TouchableOpacity>
              </View>
              <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` }]} /></View>
              <Text style={s.pctText}>{pct.toFixed(0)}% osiągnięte</Text>
              <View style={s.addRow}>
                <TextInput style={s.addInput} value={addAmount[item.id] || ''} onChangeText={v => setAddAmount({ ...addAmount, [item.id]: v })} placeholder="Kwota" placeholderTextColor="#9B8B7E" keyboardType="decimal-pad" />
                <TouchableOpacity style={s.addAmtBtn} onPress={() => handleAdd(item.id)}><Text style={s.addAmtBtnText}>Dopłać</Text></TouchableOpacity>
              </View>
              {item.deadline && <Text style={s.deadline}>Termin: {new Date(item.deadline).toLocaleDateString('pl-PL')}</Text>}
            </View>
          );
        }} contentContainerStyle={s.list} />
      <TouchableOpacity style={s.fab} onPress={() => router.push('/add-goal')}><Ionicons name="add" size={32} color="#FFF" /></TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  goalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  goalName: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginBottom: 4 },
  goalTarget: { fontSize: 14, color: '#6B5D52' },
  progressBar: { height: 10, backgroundColor: '#F5F1E8', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 5 },
  pctText: { fontSize: 13, color: '#D4AF37', fontWeight: '600', marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, backgroundColor: '#F5F1E8', borderRadius: 10, padding: 12, fontSize: 15, color: '#2A2520' },
  addAmtBtn: { backgroundColor: '#D4AF37', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  addAmtBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  deadline: { fontSize: 12, color: '#6B5D52', marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B5D52', marginTop: 4, marginBottom: 24 },
  addBtn: { backgroundColor: '#D4AF37', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  addBtnText: { color: '#2A2520', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', elevation: 5 },
});
