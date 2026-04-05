import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { plansDB } from '../lib/database';

const MONTH_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

export default function PlanYear() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const all = await plansDB.getAll();
      setPlans(all.filter((p: any) => p.year === year));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [year]));

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  // Collect all unique expense/income names across all months
  const allExpenseNames = new Set<string>();
  const allIncomeNames = new Set<string>();
  plans.forEach(p => {
    p.incomes?.forEach((i: any) => allIncomeNames.add(i.name));
    p.expenses?.forEach((e: any) => allExpenseNames.add(e.name));
  });

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const plan = plans.find(p => p.month === i + 1);
    const totalIncome = plan?.incomes?.reduce((s: number, inc: any) => s + inc.amount, 0) || 0;
    const totalExpense = plan?.expenses?.reduce((s: number, exp: any) => s + exp.amount, 0) || 0;
    return { month: i + 1, plan, totalIncome, totalExpense, diff: totalIncome - totalExpense };
  });

  const yearTotalIncome = monthlyData.reduce((s, m) => s + m.totalIncome, 0);
  const yearTotalExpense = monthlyData.reduce((s, m) => s + m.totalExpense, 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2A2520" />
        </TouchableOpacity>
        <View style={s.yearSelector}>
          <TouchableOpacity onPress={() => { setYear(year - 1); setLoading(true); }}>
            <Ionicons name="chevron-back" size={22} color="#6B5D52" />
          </TouchableOpacity>
          <Text style={s.yearText}>{year}</Text>
          <TouchableOpacity onPress={() => { setYear(year + 1); setLoading(true); }}>
            <Ionicons name="chevron-forward" size={22} color="#6B5D52" />
          </TouchableOpacity>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#D4AF37" />}>

        {/* Year Summary */}
        <View style={s.yearSummary}>
          <View style={s.yearSummaryItem}>
            <Text style={s.yearSummaryLabel}>Roczne wpływy</Text>
            <Text style={[s.yearSummaryValue, { color: '#2C5F2D' }]}>{yearTotalIncome.toFixed(0)} PLN</Text>
          </View>
          <View style={s.yearSummaryItem}>
            <Text style={s.yearSummaryLabel}>Roczne wydatki</Text>
            <Text style={[s.yearSummaryValue, { color: '#800020' }]}>{yearTotalExpense.toFixed(0)} PLN</Text>
          </View>
          <View style={s.yearSummaryItem}>
            <Text style={s.yearSummaryLabel}>Roczna różnica</Text>
            <Text style={[s.yearSummaryValue, { color: yearTotalIncome - yearTotalExpense >= 0 ? '#D4AF37' : '#D32F2F' }]}>
              {(yearTotalIncome - yearTotalExpense).toFixed(0)} PLN
            </Text>
          </View>
        </View>

        {/* Monthly Grid - Excel style */}
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={s.table}>
            {/* Header Row */}
            <View style={s.tableRow}>
              <View style={[s.tableCell, s.tableCellHeader, s.tableCellLabel]}><Text style={s.tableHeaderText}>Pozycja</Text></View>
              {MONTH_SHORT.map((m, i) => (
                <TouchableOpacity key={i} style={[s.tableCell, s.tableCellHeader,
                  i + 1 === now.getMonth() + 1 && year === now.getFullYear() && { backgroundColor: '#D4AF3720' }]}
                  onPress={() => router.push({ pathname: '/upcoming', params: { month: String(i + 1), year: String(year) } })}>
                  <Text style={s.tableHeaderText}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Income Rows */}
            {Array.from(allIncomeNames).map(name => (
              <View key={`inc-${name}`} style={s.tableRow}>
                <View style={[s.tableCell, s.tableCellLabel]}>
                  <Text style={[s.tableCellText, { color: '#2C5F2D' }]} numberOfLines={1}>{name}</Text>
                </View>
                {monthlyData.map((md, i) => {
                  const item = md.plan?.incomes?.find((inc: any) => inc.name === name);
                  return (
                    <View key={i} style={[s.tableCell,
                      i + 1 === now.getMonth() + 1 && year === now.getFullYear() && { backgroundColor: '#D4AF3708' }]}>
                      <Text style={[s.tableCellText, item ? { color: '#2C5F2D' } : { color: '#E0D5C7' }]}>
                        {item ? item.amount.toFixed(0) : '-'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Income Total Row */}
            <View style={[s.tableRow, { backgroundColor: '#2C5F2D08' }]}>
              <View style={[s.tableCell, s.tableCellLabel]}><Text style={[s.tableTotalText, { color: '#2C5F2D' }]}>WPŁYWY</Text></View>
              {monthlyData.map((md, i) => (
                <View key={i} style={s.tableCell}>
                  <Text style={[s.tableTotalText, { color: '#2C5F2D' }]}>{md.totalIncome > 0 ? md.totalIncome.toFixed(0) : '-'}</Text>
                </View>
              ))}
            </View>

            {/* Expense Rows */}
            {Array.from(allExpenseNames).map(name => (
              <View key={`exp-${name}`} style={s.tableRow}>
                <View style={[s.tableCell, s.tableCellLabel]}>
                  <Text style={[s.tableCellText, { color: '#800020' }]} numberOfLines={1}>{name}</Text>
                </View>
                {monthlyData.map((md, i) => {
                  const item = md.plan?.expenses?.find((exp: any) => exp.name === name);
                  return (
                    <View key={i} style={[s.tableCell,
                      i + 1 === now.getMonth() + 1 && year === now.getFullYear() && { backgroundColor: '#D4AF3708' }]}>
                      <Text style={[s.tableCellText, item ? { color: '#800020' } : { color: '#E0D5C7' }]}>
                        {item ? item.amount.toFixed(0) : '-'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Expense Total Row */}
            <View style={[s.tableRow, { backgroundColor: '#80002008' }]}>
              <View style={[s.tableCell, s.tableCellLabel]}><Text style={[s.tableTotalText, { color: '#800020' }]}>WYDATKI</Text></View>
              {monthlyData.map((md, i) => (
                <View key={i} style={s.tableCell}>
                  <Text style={[s.tableTotalText, { color: '#800020' }]}>{md.totalExpense > 0 ? md.totalExpense.toFixed(0) : '-'}</Text>
                </View>
              ))}
            </View>

            {/* Difference Row */}
            <View style={[s.tableRow, { backgroundColor: '#D4AF3710' }]}>
              <View style={[s.tableCell, s.tableCellLabel]}><Text style={s.tableTotalText}>RÓŻNICA</Text></View>
              {monthlyData.map((md, i) => (
                <View key={i} style={s.tableCell}>
                  <Text style={[s.tableTotalText, { color: md.diff >= 0 ? '#2C5F2D' : '#D32F2F' }]}>
                    {(md.totalIncome > 0 || md.totalExpense > 0) ? md.diff.toFixed(0) : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {plans.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={64} color="#9B8B7E" />
            <Text style={s.emptyText}>Brak planów na {year}</Text>
            <Text style={s.emptySubtext}>Przejdź do Planowania i utwórz plan miesięczny</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backBtn: { padding: 4 },
  yearSelector: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  yearText: { fontSize: 24, fontWeight: '700', color: '#2A2520' },
  yearSummary: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  yearSummaryItem: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 12, alignItems: 'center' },
  yearSummaryLabel: { fontSize: 10, color: '#9B8B7E', marginBottom: 4, textTransform: 'uppercase' },
  yearSummaryValue: { fontSize: 15, fontWeight: '700' },
  table: { paddingHorizontal: 10, paddingBottom: 20 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F5F1E8' },
  tableCell: { width: 70, padding: 8, alignItems: 'center', justifyContent: 'center' },
  tableCellHeader: { backgroundColor: '#FFF', paddingVertical: 12 },
  tableCellLabel: { width: 120, alignItems: 'flex-start' },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#2A2520' },
  tableCellText: { fontSize: 12 },
  tableTotalText: { fontSize: 12, fontWeight: '700', color: '#2A2520' },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#6B5D52', marginTop: 4, textAlign: 'center' },
});
