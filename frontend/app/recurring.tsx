import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { recurringDB } from '../lib/database';

const FREQ: Record<string, string> = { monthly: 'Co miesiąc', quarterly: 'Co kwartał', yearly: 'Co rok' };

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = async () => { try { setRecurring(await recurringDB.getAll()); } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); } };
  useFocusEffect(useCallback(() => { fetch_(); }, []));

  const exec = (id: string, name: string) => Alert.alert('Wykonaj Płatność', `Wykonać: ${name}?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Wykonaj', onPress: async () => { try { await recurringDB.execute(id); Alert.alert('Sukces', 'Transakcja utworzona'); fetch_(); } catch { Alert.alert('Błąd', 'Nie udało się'); } } },
  ]);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  return (
    <View style={s.container}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#2A2520" /></TouchableOpacity>
        <Text style={s.headerTitle}>Płatności Cykliczne</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList data={recurring} keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch_(); }} tintColor="#D4AF37" />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="repeat-outline" size={64} color="#9B8B7E" /><Text style={s.emptyText}>Brak płatności cyklicznych</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/add-recurring')}><Text style={s.addBtnText}>Dodaj Płatność</Text></TouchableOpacity></View>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.icon, { backgroundColor: item.type === 'income' ? '#2C5F2D20' : '#80002020' }]}>
                <Ionicons name={item.type === 'income' ? 'arrow-down' : 'arrow-up'} size={24} color={item.type === 'income' ? '#2C5F2D' : '#800020'} />
              </View>
              <View style={{ flex: 1 }}><Text style={s.name}>{item.name}</Text><Text style={s.cat}>{item.category}</Text></View>
              <Text style={[s.amount, { color: item.type === 'income' ? '#2C5F2D' : '#800020' }]}>{item.amount.toFixed(2)} PLN</Text>
            </View>
            <View style={s.info}>
              <View style={s.infoItem}><Ionicons name="repeat" size={14} color="#6B5D52" /><Text style={s.infoText}>{FREQ[item.frequency]}</Text></View>
              <View style={s.infoItem}><Ionicons name="calendar" size={14} color="#6B5D52" /><Text style={s.infoText}>Dzień: {item.day_of_month}</Text></View>
              {item.next_due_date && <View style={s.infoItem}><Ionicons name="time" size={14} color="#6B5D52" /><Text style={s.infoText}>Nast: {format(new Date(item.next_due_date), 'dd MMM', { locale: pl })}</Text></View>}
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => exec(item.id, item.name)}>
                <Ionicons name="play" size={16} color="#D4AF37" /><Text style={[s.actionText, { color: '#D4AF37' }]}>Wykonaj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={async () => { await recurringDB.delete(item.id); fetch_(); }}>
                <Ionicons name="trash-outline" size={16} color="#800020" /><Text style={[s.actionText, { color: '#800020' }]}>Usuń</Text>
              </TouchableOpacity>
            </View>
          </View>
        )} contentContainerStyle={s.list} />
      <TouchableOpacity style={s.fab} onPress={() => router.push('/add-recurring')}><Ionicons name="add" size={32} color="#FFF" /></TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#2A2520' },
  cat: { fontSize: 13, color: '#6B5D52' },
  amount: { fontSize: 16, fontWeight: '600' },
  info: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: '#6B5D52' },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F1E8' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, backgroundColor: '#F5F1E8', gap: 6 },
  actionText: { fontSize: 13, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginTop: 16, marginBottom: 24 },
  addBtn: { backgroundColor: '#D4AF37', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  addBtnText: { color: '#2A2520', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', elevation: 5 },
});
