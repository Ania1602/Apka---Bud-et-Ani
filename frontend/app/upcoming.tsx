import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { creditsDB, recurringDB, accountsDB } from '../lib/database';

export default function Upcoming() {
  const [credits, setCredits] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [cr, rec, acc] = await Promise.all([creditsDB.getAll(), recurringDB.getAll(), accountsDB.getAll()]);
      setCredits(cr.filter((c: any) => c.remaining_amount > 0));
      setRecurring(rec.filter((r: any) => r.is_active));
      setTotalBalance(acc.reduce((s: number, a: any) => s + (a.balance || 0), 0));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();

  const creditPayments = credits.map(c => ({
    name: `Rata: ${c.name}`, amount: c.monthly_payment, day: 1,
    type: 'credit', remaining: c.remaining_amount,
  }));

  const recurringPayments = recurring.filter(r => r.type === 'expense').map(r => ({
    name: r.name, amount: r.amount, day: r.day_of_month || 1,
    type: 'recurring', category: r.category,
  }));

  const allPayments = [...creditPayments, ...recurringPayments].sort((a, b) => a.day - b.day);
  const upcomingPayments = allPayments.filter(p => p.day >= currentDay);
  const totalPlanned = allPayments.reduce((s, p) => s + p.amount, 0);
  const remainingPlanned = upcomingPayments.reduce((s, p) => s + p.amount, 0);
  const availableAfter = totalBalance - remainingPlanned;

  // Calendar dots
  const calendarDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const hasPayment = allPayments.some(p => p.day === d);
    calendarDays.push({ day: d, hasPayment, isPast: d < currentDay, isToday: d === currentDay });
  }

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#D4AF37" />}>
      <View style={s.header}>
        <Ionicons name="arrow-back" size={24} color="#2A2520" />
        <Text style={s.title}>Planowanie Wydatków</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.summaryCards}>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Planowane wydatki</Text>
          <Text style={[s.summaryValue, { color: '#800020' }]}>{totalPlanned.toFixed(2)} PLN</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Do zapłaty</Text>
          <Text style={[s.summaryValue, { color: '#FF9800' }]}>{remainingPlanned.toFixed(2)} PLN</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Dostępne po płatnościach</Text>
          <Text style={[s.summaryValue, { color: availableAfter >= 0 ? '#2C5F2D' : '#D32F2F' }]}>{availableAfter.toFixed(2)} PLN</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Kalendarz płatności</Text>
        <View style={s.calendarGrid}>
          {calendarDays.map(d => (
            <View key={d.day} style={[s.calDay, d.isToday && s.calDayToday, d.isPast && s.calDayPast]}>
              <Text style={[s.calDayText, d.isToday && { color: '#FFF' }]}>{d.day}</Text>
              {d.hasPayment && <View style={s.calDot} />}
            </View>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Nadchodzące płatności</Text>
        {allPayments.length === 0 ? (
          <Text style={s.emptyText}>Brak zaplanowanych płatności</Text>
        ) : (
          allPayments.map((p, i) => (
            <View key={i} style={[s.paymentRow, p.day < currentDay && { opacity: 0.4 }]}>
              <View style={[s.paymentIcon, { backgroundColor: p.type === 'credit' ? '#1B284515' : '#9C27B015' }]}>
                <Ionicons name={p.type === 'credit' ? 'card' : 'repeat'} size={20} color={p.type === 'credit' ? '#1B2845' : '#9C27B0'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.paymentName}>{p.name}</Text>
                <Text style={s.paymentDay}>Dzień {p.day} miesiąca {p.day < currentDay ? '(zapłacone)' : ''}</Text>
              </View>
              <Text style={s.paymentAmount}>{p.amount.toFixed(2)} PLN</Text>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  summaryCards: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  summaryCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12 },
  summaryLabel: { fontSize: 12, color: '#6B5D52', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 16, padding: 20, borderRadius: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#2A2520', marginBottom: 16 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calDay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calDayToday: { backgroundColor: '#D4AF37' },
  calDayPast: { opacity: 0.4 },
  calDayText: { fontSize: 13, color: '#2A2520', fontWeight: '500' },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#800020', position: 'absolute', bottom: 3 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F1E8', gap: 12 },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentName: { fontSize: 14, fontWeight: '500', color: '#2A2520' },
  paymentDay: { fontSize: 12, color: '#6B5D52', marginTop: 2 },
  paymentAmount: { fontSize: 15, fontWeight: '600', color: '#800020' },
  emptyText: { fontSize: 14, color: '#6B5D52', textAlign: 'center', paddingVertical: 20 },
});
