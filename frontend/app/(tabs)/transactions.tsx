import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { transactionsDB } from '../../lib/database';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const fetchTransactions = async () => {
    try { setTransactions(await transactionsDB.getAll(200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchTransactions(); }, []));

  const deleteTransaction = (id: string, category: string) => {
    Alert.alert('Usuń', `Usunąć transakcję "${category}"?`, [
      { text: 'Anuluj' },
      { text: 'Usuń', style: 'destructive', onPress: async () => { await transactionsDB.delete(id); fetchTransactions(); } },
    ]);
  };

  const filtered = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => !searchQuery || t.category.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()));

  // Group by date
  const grouped: Record<string, any[]> = {};
  filtered.forEach(t => {
    const day = format(new Date(t.date), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(t);
  });
  const sections = Object.entries(grouped).map(([date, items]) => ({ date, items }));

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Transakcje</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <Ionicons name={showSearch ? "close" : "search"} size={24} color="#2A2520" />
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={s.searchContainer}>
          <Ionicons name="search" size={18} color="#9B8B7E" />
          <TextInput style={s.searchInput} value={searchQuery} onChangeText={setSearchQuery}
            placeholder="Szukaj po kategorii lub opisie..." placeholderTextColor="#9B8B7E" autoFocus />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#9B8B7E" /></TouchableOpacity> : null}
        </View>
      )}

      <View style={s.filterRow}>
        {(['all', 'income', 'expense'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'all' ? 'Wszystkie' : f === 'income' ? 'Przychody' : 'Wydatki'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={sections} keyExtractor={i => i.date}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTransactions(); }} tintColor="#D4AF37" />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="document-text-outline" size={64} color="#9B8B7E" /><Text style={s.emptyText}>{searchQuery ? 'Brak wyników' : 'Brak transakcji'}</Text>
          {!searchQuery && <TouchableOpacity style={s.addBtn} onPress={() => router.push('/add-transaction')}><Text style={s.addBtnText}>Dodaj Transakcję</Text></TouchableOpacity>}</View>}
        renderItem={({ item: section }) => (
          <View style={s.section}>
            <Text style={s.sectionDate}>{format(new Date(section.date), 'EEEE, dd MMMM', { locale: pl })}</Text>
            {section.items.map(item => (
              <TouchableOpacity key={item.id} style={s.txItem}
                onPress={() => router.push(`/add-transaction?edit=${item.id}&type=${item.type}&amount=${item.amount}&category=${encodeURIComponent(item.category)}&description=${encodeURIComponent(item.description || '')}&account_id=${item.account_id || ''}&credit_id=${item.credit_id || ''}&date=${item.date}`)}
                onLongPress={() => deleteTransaction(item.id, item.category)}>
                <View style={[s.txIcon, { backgroundColor: item.type === 'income' ? '#2C5F2D15' : '#80002015' }]}>
                  <Ionicons name={item.type === 'income' ? 'arrow-down' : 'arrow-up'} size={20} color={item.type === 'income' ? '#2C5F2D' : '#800020'} />
                </View>
                <View style={s.txDetails}>
                  <Text style={s.txCategory}>{item.category}</Text>
                  {item.description ? <Text style={s.txDesc} numberOfLines={1}>{item.description}</Text> : null}
                  <Text style={s.txTime}>{format(new Date(item.date), 'HH:mm')}</Text>
                </View>
                <View style={s.txRight}>
                  <Text style={[s.txAmount, { color: item.type === 'income' ? '#2C5F2D' : '#800020' }]}>
                    {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)}
                  </Text>
                  {item.credit_id && <View style={s.creditBadge}><Text style={s.creditBadgeText}>Rata</Text></View>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        contentContainerStyle={s.list}
      />

      <TouchableOpacity style={s.fab} onPress={() => router.push('/add-transaction')}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#2A2520' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#2A2520' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  filterBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#FFF', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#D4AF37' },
  filterText: { color: '#6B5D52', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#FFF' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 100 },
  section: { marginBottom: 16 },
  sectionDate: { fontSize: 13, fontWeight: '600', color: '#9B8B7E', marginBottom: 8, textTransform: 'capitalize' },
  txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 6 },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txCategory: { fontSize: 15, fontWeight: '600', color: '#2A2520', marginBottom: 2 },
  txDesc: { fontSize: 12, color: '#6B5D52', marginBottom: 2 },
  txTime: { fontSize: 11, color: '#9B8B7E' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '600' },
  creditBadge: { backgroundColor: '#2196F320', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  creditBadgeText: { fontSize: 10, color: '#2196F3', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginTop: 16, marginBottom: 24 },
  addBtn: { backgroundColor: '#D4AF37', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  addBtnText: { color: '#2A2520', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', elevation: 5 },
});
