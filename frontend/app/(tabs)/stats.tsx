import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { getStatistics } from '../../lib/database';

const CATEGORY_COLORS = ['#D4AF37', '#800020', '#2C5F2D', '#1B2845', '#9C27B0', '#E91E63', '#2196F3', '#FF9800', '#607D8B', '#3F51B5'];

export default function Statistics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();

  const fetchStats = async () => {
    try {
      const data = await getStatistics(now.getMonth() + 1, now.getFullYear());
      setStats(data);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  const categoryData = stats ? Object.entries(stats.byCategory)
    .filter(([_, v]: any) => v.type === 'expense')
    .sort((a: any, b: any) => b[1].amount - a[1].amount)
    .map(([name, v]: any, i) => ({ value: v.amount, text: name, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], label: name })) : [];

  const trendData = stats?.trends?.map((t: any) => ({ value: t.expenses, label: t.label, frontColor: '#800020' })) || [];
  const trendIncomeData = stats?.trends?.map((t: any) => ({ value: t.income, label: t.label, frontColor: '#2C5F2D' })) || [];

  return (
    <View style={s.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#D4AF37" />}>
        <View style={s.header}>
          <Text style={s.title}>Statystyki</Text>
          <Text style={s.subtitle}>{now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</Text>
        </View>

        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderLeftColor: '#2C5F2D' }]}>
            <Text style={s.summaryLabel}>Przychody</Text>
            <Text style={[s.summaryValue, { color: '#2C5F2D' }]}>{(stats?.totalIncome || 0).toFixed(2)}</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#800020' }]}>
            <Text style={s.summaryLabel}>Wydatki</Text>
            <Text style={[s.summaryValue, { color: '#800020' }]}>{(stats?.totalExpenses || 0).toFixed(2)}</Text>
          </View>
        </View>

        {categoryData.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Wydatki wg Kategorii</Text>
            <View style={s.chartCenter}>
              <PieChart data={categoryData} donut radius={90} innerRadius={55}
                centerLabelComponent={() => <Text style={s.pieCenter}>{categoryData.length}</Text>} />
            </View>
            <View style={s.legendGrid}>
              {categoryData.map((item, i) => (
                <View key={i} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: item.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.legendName} numberOfLines={1}>{item.label}</Text>
                    <Text style={s.legendAmount}>{item.value.toFixed(2)} PLN</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {trendData.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Trend Miesięczny (6 mies.)</Text>
            <View style={s.chartCenter}>
              <BarChart data={trendData} barWidth={22} spacing={18} roundedTop xAxisThickness={0} yAxisThickness={0}
                yAxisTextStyle={{ color: '#6B5D52', fontSize: 10 }} xAxisLabelTextStyle={{ color: '#6B5D52', fontSize: 10 }}
                noOfSections={4} maxValue={Math.max(...trendData.map((d: any) => d.value), 1) * 1.2} />
            </View>
            <View style={s.trendLegend}>
              <View style={s.trendItem}><View style={[s.trendDot, { backgroundColor: '#800020' }]} /><Text style={s.trendLabel}>Wydatki</Text></View>
            </View>
          </View>
        )}

        {(!categoryData.length && !trendData.length) && (
          <View style={s.empty}>
            <Text style={s.emptyText}>Brak danych do wyświetlenia</Text>
            <Text style={s.emptySubtext}>Dodaj transakcje, aby zobaczyć statystyki</Text>
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
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2A2520' },
  subtitle: { fontSize: 14, color: '#6B5D52', marginTop: 4, textTransform: 'capitalize' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderLeftWidth: 4 },
  summaryLabel: { fontSize: 12, color: '#6B5D52', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: 'bold' },
  card: { backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 16, padding: 20, borderRadius: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginBottom: 20 },
  chartCenter: { alignItems: 'center', marginBottom: 20 },
  pieCenter: { fontSize: 24, fontWeight: 'bold', color: '#2A2520' },
  legendGrid: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendName: { fontSize: 14, color: '#2A2520' },
  legendAmount: { fontSize: 12, color: '#6B5D52' },
  trendLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  trendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendDot: { width: 10, height: 10, borderRadius: 5 },
  trendLabel: { fontSize: 12, color: '#6B5D52' },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520' },
  emptySubtext: { fontSize: 14, color: '#6B5D52', marginTop: 8 },
});
