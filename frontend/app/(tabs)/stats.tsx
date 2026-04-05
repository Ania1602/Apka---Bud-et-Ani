import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { getStatistics, transactionsDB, categoriesDB } from '../../lib/database';

const COLORS = ['#D4AF37', '#800020', '#2C5F2D', '#1B2845', '#9C27B0', '#E91E63', '#2196F3', '#FF9800', '#607D8B', '#3F51B5'];

export default function Statistics() {
  const [stats, setStats] = useState<any>(null);
  const [prevStats, setPrevStats] = useState<any>(null);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [prevWeekTotal, setPrevWeekTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [subBreakdown, setSubBreakdown] = useState<Record<string, any[]>>({});
  const now = new Date();

  const fetchStats = async () => {
    try {
      const data = await getStatistics(now.getMonth() + 1, now.getFullYear());
      setStats(data);

      // Previous month for comparison
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const prevData = await getStatistics(prevMonth, prevYear);
      setPrevStats(prevData);

      // Weekly data
      const today = new Date();
      const dayOfWeek = today.getDay() || 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek + 1);
      weekStart.setHours(0, 0, 0, 0);

      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);

      const allTx = await transactionsDB.getAll(9999);
      const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
      const dailyData = days.map((label, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayExpenses = allTx.filter((t: any) => !t.is_transfer && t.type === 'expense' && t.date.split('T')[0] === dateStr)
          .reduce((s: number, t: any) => s + t.amount, 0);
        return { value: dayExpenses, label, frontColor: '#800020' };
      });
      setWeekData(dailyData);
      setWeekTotal(dailyData.reduce((s, d) => s + d.value, 0));

      // Previous week total
      const pwTotal = allTx.filter((t: any) => {
        if (t.is_transfer || t.type !== 'expense') return false;
        const td = new Date(t.date);
        return td >= prevWeekStart && td < weekStart;
      }).reduce((s: number, t: any) => s + t.amount, 0);
      setPrevWeekTotal(pwTotal);
      
      // Compute subcategory breakdown from transactions
      const monthTx = allTx.filter((t: any) => {
        if (t.is_transfer || t.type !== 'expense') return false;
        const d = new Date(t.date);
        return d.getMonth() + 1 === now.getMonth() + 1 && d.getFullYear() === now.getFullYear();
      });
      const breakdown: Record<string, any[]> = {};
      monthTx.forEach((t: any) => {
        if (t.subcategory) {
          if (!breakdown[t.category]) breakdown[t.category] = [];
          const existing = breakdown[t.category].find((s: any) => s.name === t.subcategory);
          if (existing) { existing.amount += t.amount; }
          else { breakdown[t.category].push({ name: t.subcategory, amount: t.amount }); }
        }
      });
      setSubBreakdown(breakdown);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  const categoryData = stats ? Object.entries(stats.byCategory)
    .filter(([_, v]: any) => v.type === 'expense')
    .sort((a: any, b: any) => b[1].amount - a[1].amount)
    .map(([name, v]: any, i) => ({ value: v.amount, text: name, color: COLORS[i % COLORS.length], label: name })) : [];

  const trendData = stats?.trends?.map((t: any) => ({ value: t.expenses, label: t.label, frontColor: '#800020' })) || [];

  // Month comparison
  const comparison = categoryData.map(item => {
    const prevAmount = prevStats?.byCategory?.[item.label]?.amount || 0;
    const diff = item.value - prevAmount;
    return { name: item.label, current: item.value, previous: prevAmount, diff, color: item.color };
  });

  return (
    <View style={s.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#D4AF37" />}>
        <View style={s.header}>
          <Text style={s.title}>Statystyki</Text>
          <Text style={s.subtitle}>{now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</Text>
        </View>

        <View style={s.viewToggle}>
          <TouchableOpacity style={[s.viewBtn, view === 'monthly' && s.viewBtnActive]} onPress={() => setView('monthly')}>
            <Text style={[s.viewBtnText, view === 'monthly' && s.viewBtnTextActive]}>Miesięczne</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.viewBtn, view === 'weekly' && s.viewBtnActive]} onPress={() => setView('weekly')}>
            <Text style={[s.viewBtnText, view === 'weekly' && s.viewBtnTextActive]}>Tygodniowe</Text>
          </TouchableOpacity>
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

        {view === 'weekly' ? (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Wydatki w tym tygodniu</Text>
              <Text style={s.weekTotal}>{weekTotal.toFixed(2)} PLN</Text>
              <View style={s.weekCompare}>
                <Ionicons name={weekTotal <= prevWeekTotal ? 'trending-down' : 'trending-up'} size={16}
                  color={weekTotal <= prevWeekTotal ? '#2C5F2D' : '#800020'} />
                <Text style={[s.weekCompareText, { color: weekTotal <= prevWeekTotal ? '#2C5F2D' : '#800020' }]}>
                  {weekTotal <= prevWeekTotal ? 'Mniej' : 'Więcej'} o {Math.abs(weekTotal - prevWeekTotal).toFixed(2)} PLN vs poprzedni tydzień
                </Text>
              </View>
              {weekData.length > 0 && (
                <View style={s.chartCenter}>
                  <BarChart data={weekData} barWidth={30} spacing={14} roundedTop
                    xAxisThickness={0} yAxisThickness={0}
                    yAxisTextStyle={{ color: '#6B5D52', fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: '#6B5D52', fontSize: 10 }}
                    noOfSections={4} maxValue={Math.max(...weekData.map(d => d.value), 1) * 1.2} />
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {categoryData.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Wydatki wg Kategorii</Text>
                <View style={s.chartCenter}>
                  <PieChart data={categoryData} donut radius={90} innerRadius={55}
                    centerLabelComponent={() => <Text style={s.pieCenter}>{categoryData.length}</Text>} />
                </View>
                <View style={s.legendGrid}>
                  {categoryData.map((item, i) => {
                    const subs = subBreakdown[item.label] || [];
                    const isExp = expandedCat === item.label;
                    return (
                      <View key={i}>
                        <TouchableOpacity style={s.legendItem} onPress={() => setExpandedCat(isExp ? null : item.label)} activeOpacity={0.7}>
                          <View style={[s.legendDot, { backgroundColor: item.color }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.legendName} numberOfLines={1}>{item.label}</Text>
                            <Text style={s.legendAmount}>{item.value.toFixed(2)} PLN</Text>
                          </View>
                          {subs.length > 0 && <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={14} color="#9B8B7E" />}
                        </TouchableOpacity>
                        {isExp && subs.length > 0 && (
                          <View style={s.subBreakdown}>
                            {subs.sort((a: any, b: any) => b.amount - a.amount).map((sub: any, j: number) => (
                              <View key={j} style={s.subBreakdownItem}>
                                <View style={s.subBreakdownDot} />
                                <Text style={s.subBreakdownName}>{sub.name}</Text>
                                <Text style={s.subBreakdownAmount}>{sub.amount.toFixed(2)} PLN</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {comparison.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Porównanie z poprzednim miesiącem</Text>
                {comparison.map((item, i) => (
                  <View key={i} style={s.compareRow}>
                    <View style={[s.compareDot, { backgroundColor: item.color }]} />
                    <Text style={s.compareName} numberOfLines={1}>{item.name}</Text>
                    <View style={s.compareRight}>
                      <Text style={s.compareAmount}>{item.current.toFixed(0)} PLN</Text>
                      <View style={[s.compareBadge, { backgroundColor: item.diff > 0 ? '#80002015' : '#2C5F2D15' }]}>
                        <Ionicons name={item.diff > 0 ? 'arrow-up' : 'arrow-down'} size={12}
                          color={item.diff > 0 ? '#800020' : '#2C5F2D'} />
                        <Text style={{ fontSize: 11, color: item.diff > 0 ? '#800020' : '#2C5F2D', fontWeight: '600' }}>
                          {item.diff > 0 ? '+' : ''}{item.diff.toFixed(0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {trendData.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Trend Miesięczny (6 mies.)</Text>
                <View style={s.chartCenter}>
                  <BarChart data={trendData} barWidth={22} spacing={18} roundedTop
                    xAxisThickness={0} yAxisThickness={0}
                    yAxisTextStyle={{ color: '#6B5D52', fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: '#6B5D52', fontSize: 10 }}
                    noOfSections={4} maxValue={Math.max(...trendData.map((d: any) => d.value), 1) * 1.2} />
                </View>
              </View>
            )}

            {stats?.trends && stats.trends.length >= 2 && (() => {
              const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paz', 'Lis', 'Gru'];
              const incomeData = stats.trends.map((t: any) => ({ value: t.income, label: months[t.month - 1] || '' }));
              const expenseData = stats.trends.map((t: any) => ({ value: t.expenses, label: months[t.month - 1] || '' }));
              const diffData = stats.trends.map((t: any) => ({ value: t.income - t.expenses, label: months[t.month - 1] || '' }));
              const allVals = [...incomeData.map((d: any) => d.value), ...expenseData.map((d: any) => d.value), ...diffData.map((d: any) => d.value)];
              const maxVal = Math.max(...allVals, 1) * 1.2;
              return (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Wykres Trendu</Text>
                  <View style={s.chartCenter}>
                    <LineChart
                      data={incomeData} data2={expenseData} data3={diffData}
                      color1="#2C5F2D" color2="#800020" color3="#D4AF37"
                      thickness={2} spacing={50}
                      xAxisThickness={0} yAxisThickness={0}
                      yAxisTextStyle={{ color: '#6B5D52', fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: '#6B5D52', fontSize: 10 }}
                      noOfSections={4} maxValue={maxVal}
                      curved dataPointsColor1="#2C5F2D" dataPointsColor2="#800020" dataPointsColor3="#D4AF37"
                      dataPointsRadius={4}
                    />
                  </View>
                  <View style={s.trendLegend}>
                    <View style={s.trendLegendItem}><View style={[s.trendLegendLine, { backgroundColor: '#2C5F2D' }]} /><Text style={s.trendLegendText}>Przychody</Text></View>
                    <View style={s.trendLegendItem}><View style={[s.trendLegendLine, { backgroundColor: '#800020' }]} /><Text style={s.trendLegendText}>Wydatki</Text></View>
                    <View style={s.trendLegendItem}><View style={[s.trendLegendLine, { backgroundColor: '#D4AF37' }]} /><Text style={s.trendLegendText}>Roznica</Text></View>
                  </View>
                </View>
              );
            })()}
          </>
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
  viewToggle: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 4 },
  viewBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  viewBtnActive: { backgroundColor: '#D4AF37' },
  viewBtnText: { fontSize: 14, fontWeight: '500', color: '#6B5D52' },
  viewBtnTextActive: { color: '#FFF' },
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
  weekTotal: { fontSize: 28, fontWeight: 'bold', color: '#2A2520', marginBottom: 4 },
  weekCompare: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  weekCompareText: { fontSize: 13 },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F1E8', gap: 8 },
  compareDot: { width: 10, height: 10, borderRadius: 5 },
  compareName: { flex: 1, fontSize: 14, color: '#2A2520' },
  compareRight: { alignItems: 'flex-end' },
  compareAmount: { fontSize: 14, fontWeight: '600', color: '#2A2520' },
  compareBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520' },
  emptySubtext: { fontSize: 14, color: '#6B5D52', marginTop: 8 },
  subBreakdown: { marginLeft: 22, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#E0D5C7', marginBottom: 8 },
  subBreakdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  subBreakdownDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D4AF37' },
  subBreakdownName: { flex: 1, fontSize: 13, color: '#6B5D52' },
  subBreakdownAmount: { fontSize: 13, fontWeight: '600', color: '#2A2520' },
  trendLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
  trendLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendLegendLine: { width: 16, height: 3, borderRadius: 2 },
  trendLegendText: { fontSize: 12, color: '#6B5D52' },
});
