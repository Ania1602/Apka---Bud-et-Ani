import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { investmentsDB, creditsDB, userSettingsDB } from '../lib/database';

const IKE_LIMIT_2026 = 26019;
const IKZE_LIMIT_2026 = 10407;

const INVESTMENT_TYPES = [
  { value: 'ppk', label: 'PPK', icon: 'shield-checkmark', color: '#1565C0' },
  { value: 'ike', label: 'IKE', icon: 'umbrella', color: '#2E7D32' },
  { value: 'ikze', label: 'IKZE', icon: 'umbrella', color: '#6A1B9A' },
  { value: 'obligacje', label: 'Obligacje skarbowe', icon: 'document-text', color: '#C62828' },
  { value: 'akcje_etf', label: 'Akcje / ETF', icon: 'trending-up', color: '#00838F' },
  { value: 'fundusze', label: 'Fundusze inwestycyjne', icon: 'pie-chart', color: '#EF6C00' },
  { value: 'lokaty', label: 'Lokaty', icon: 'lock-closed', color: '#4E342E' },
  { value: 'krypto', label: 'Kryptowaluty', icon: 'logo-bitcoin', color: '#F9A825' },
  { value: 'inne', label: 'Inne', icon: 'ellipsis-horizontal', color: '#607D8B' },
];
const PPK_SOURCES = [
  { value: 'own', label: 'Wpłata własna (pracownika)' },
  { value: 'own_additional', label: 'Wpłata dodatkowa (pracownika)' },
  { value: 'employer', label: 'Wpłata pracodawcy' },
  { value: 'state_annual', label: 'Dopłata roczna od państwa' },
  { value: 'state_welcome', label: 'Wpłata powitalna od państwa' },
];
const TAX_BRACKETS = [
  { value: 12, label: '12%' },
  { value: 32, label: '32%' },
  { value: 19, label: '19%' },
];
const CURRENCIES = ['PLN', 'EUR', 'USD'];

function getTypeInfo(type: string) { return INVESTMENT_TYPES.find(t => t.value === type) || INVESTMENT_TYPES[8]; }
function fmtDate(text: string): string {
  const d = text.replace(/[^0-9]/g, '');
  if (d.length <= 4) return d;
  if (d.length <= 6) return d.slice(0, 4) + '-' + d.slice(4);
  return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
}
function xirr(cf: { date: Date; amount: number }[], guess = 0.1): number {
  if (cf.length < 2) return 0;
  let rate = guess;
  const t0 = cf[0].date.getTime();
  for (let i = 0; i < 100; i++) {
    let npv = 0, dnpv = 0;
    cf.forEach(c => { const y = (c.date.getTime() - t0) / (365.25*24*3600000); npv += c.amount / Math.pow(1+rate, y); dnpv -= y * c.amount / Math.pow(1+rate, y+1); });
    if (Math.abs(npv) < 1e-7) return rate;
    if (dnpv === 0) break;
    rate -= npv / dnpv;
    if (rate < -0.99) rate = -0.5; if (rate > 10) rate = 5;
  }
  return rate;
}
function calcXIRR(payments: any[], val: number): number | null {
  if (!payments?.length || !val || val <= 0) return null;
  const sorted = [...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const cf = sorted.map(p => ({ date: new Date(p.date), amount: -p.amount }));
  cf.push({ date: new Date(), amount: val });
  try { const r = xirr(cf); return isNaN(r) || !isFinite(r) || Math.abs(r) > 10 ? null : r * 100; } catch { return null; }
}
const today = () => new Date().toISOString().split('T')[0];

export default function Investments() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formModal, setFormModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fName, setFName] = useState('');
  const [fType, setFType] = useState('ppk');
  const [fStartDate, setFStartDate] = useState(today());
  const [fCurrentValue, setFCurrentValue] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fCurrency, setFCurrency] = useState('PLN');
  const [fGoal, setFGoal] = useState('');
  const [fTaxBracket, setFTaxBracket] = useState(12);
  const [fInterestRates, setFInterestRates] = useState<{ period: string; rate: string }[]>([]);
  const [fInitialPayments, setFInitialPayments] = useState<{ amount: string; date: string; source: string }[]>([{ amount: '', date: today(), source: 'own' }]);
  const [showGoalSuggestions, setShowGoalSuggestions] = useState(false);

  const [payModal, setPayModal] = useState(false);
  const [payInvId, setPayInvId] = useState('');
  const [payInvType, setPayInvType] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(today());
  const [paySource, setPaySource] = useState('own');
  // PPK multi-field
  const [ppkOwn, setPpkOwn] = useState('');
  const [ppkOwnAdd, setPpkOwnAdd] = useState('');
  const [ppkEmployer, setPpkEmployer] = useState('');
  const [ppkState, setPpkState] = useState('');

  const [valueModal, setValueModal] = useState(false);
  const [valueInvId, setValueInvId] = useState('');
  const [valueAmount, setValueAmount] = useState('');

  const fetch_ = async () => {
    try {
      const [inv, cred, by] = await Promise.all([investmentsDB.getAll(), creditsDB.getAll(), userSettingsDB.get('birth_year')]);
      setInvestments(inv); setCredits(cred);
      if (by) setBirthYear(parseInt(by));
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { fetch_(); }, []));

  const allGoals = [...new Set(investments.map(i => i.goal).filter(Boolean))];
  const currentYear = new Date().getFullYear();

  const openAddModal = () => {
    setEditId(null); setFName(''); setFType('ppk'); setFStartDate(today());
    setFCurrentValue(''); setFNotes(''); setFCurrency('PLN'); setFGoal(''); setFTaxBracket(12);
    setFInterestRates([]); setFInitialPayments([{ amount: '', date: today(), source: 'own' }]);
    setFormModal(true);
  };
  const openEditModal = (inv: any) => {
    setEditId(inv.id); setFName(inv.name); setFType(inv.type); setFStartDate(inv.start_date || '');
    setFCurrentValue(String(inv.current_value || '')); setFNotes(inv.notes || '');
    setFCurrency(inv.currency || 'PLN'); setFGoal(inv.goal || ''); setFTaxBracket(inv.tax_bracket || 12);
    setFInterestRates(inv.interest_rates || []); setFInitialPayments([]);
    setFormModal(true);
  };
  const handleSave = async () => {
    if (!fName.trim()) { Alert.alert('Błąd', 'Podaj nazwę inwestycji'); return; }
    const data: any = { name: fName.trim(), type: fType, start_date: fStartDate, current_value: parseFloat(fCurrentValue) || 0, notes: fNotes.trim(), currency: fCurrency, goal: fGoal.trim(), tax_bracket: fType === 'ikze' ? fTaxBracket : undefined, interest_rates: fType === 'obligacje' ? fInterestRates : undefined };
    if (editId) { await investmentsDB.update(editId, data); }
    else {
      const vp = fInitialPayments.filter(p => parseFloat(p.amount) > 0);
      data.payments = vp.map(p => ({ amount: parseFloat(p.amount), date: p.date, source: fType === 'ppk' ? p.source : 'own', id: Date.now().toString() + Math.random().toString(36).slice(2) }));
      data.total_paid = data.payments.reduce((s: number, p: any) => s + p.amount, 0);
      await investmentsDB.create(data);
    }
    setFormModal(false); fetch_();
  };
  const handleAddPayment = async () => {
    if (payInvType === 'ppk') {
      const entries = [
        { amount: parseFloat(ppkOwn) || 0, source: 'own' },
        { amount: parseFloat(ppkOwnAdd) || 0, source: 'own_additional' },
        { amount: parseFloat(ppkEmployer) || 0, source: 'employer' },
        { amount: parseFloat(ppkState) || 0, source: 'state_annual' },
      ].filter(e => e.amount > 0);
      if (entries.length === 0) { Alert.alert('Błąd', 'Podaj kwotę przynajmniej jednej wpłaty'); return; }
      for (const e of entries) { await investmentsDB.addPayment(payInvId, { amount: e.amount, date: payDate, source: e.source }); }
    } else {
      const amt = parseFloat(payAmount);
      if (amt <= 0) { Alert.alert('Błąd', 'Podaj kwotę wpłaty'); return; }
      await investmentsDB.addPayment(payInvId, { amount: amt, date: payDate, source: 'own' });
    }
    setPayModal(false); fetch_();
  };
  const handleUpdateValue = async () => {
    const val = parseFloat(valueAmount);
    if (isNaN(val)) { Alert.alert('Błąd', 'Podaj aktualną wartość'); return; }
    await investmentsDB.updateValue(valueInvId, val);
    setValueModal(false); fetch_();
  };
  const handleDelete = (inv: any) => Alert.alert('Usuń inwestycję', `Usunąć "${inv.name}"?`, [{ text: 'Anuluj' }, { text: 'Usuń', style: 'destructive', onPress: async () => { await investmentsDB.delete(inv.id); fetch_(); } }]);
  const handleRemovePayment = (iid: string, pid: string) => Alert.alert('Usuń wpłatę', 'Usunąć tę wpłatę?', [{ text: 'Anuluj' }, { text: 'Usuń', style: 'destructive', onPress: async () => { await investmentsDB.removePayment(iid, pid); fetch_(); } }]);

  // === CALCULATIONS ===
  const totalPaid = investments.reduce((s, i) => s + (i.total_paid || 0), 0);
  const totalValue = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalPL = totalValue - totalPaid;
  const totalPLPct = totalPaid > 0 ? (totalPL / totalPaid) * 100 : 0;

  // From others (employer + state) — own_additional is still "yours"
  const totalFromOthers = investments.reduce((s, i) => s + ((i.payments || []).filter((p: any) => p.source && p.source !== 'own' && p.source !== 'own_additional').reduce((ss: number, p: any) => ss + p.amount, 0)), 0);

  // By goal
  const byGoal: Record<string, { paid: number; value: number }> = {};
  investments.forEach(i => { const g = (i.goal || '').trim().toLowerCase(); if (!g) return; if (!byGoal[g]) byGoal[g] = { paid: 0, value: 0 }; byGoal[g].paid += i.total_paid || 0; byGoal[g].value += i.current_value || 0; });

  // IKE/IKZE yearly
  const ikeYearly = investments.filter(i => i.type === 'ike').reduce((s, i) => s + ((i.payments || []).filter((p: any) => new Date(p.date).getFullYear() === currentYear).reduce((ss: number, p: any) => ss + p.amount, 0)), 0);
  const ikzeYearly = investments.filter(i => i.type === 'ikze').reduce((s, i) => s + ((i.payments || []).filter((p: any) => new Date(p.date).getFullYear() === currentYear).reduce((ss: number, p: any) => ss + p.amount, 0)), 0);
  const hasIKE = investments.some(i => i.type === 'ike');
  const hasIKZE = investments.some(i => i.type === 'ikze');

  // Avg monthly investment (last 12 months)
  const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const recentPayments = investments.reduce((s, i) => s + ((i.payments || []).filter((p: any) => new Date(p.date) >= twelveMonthsAgo).reduce((ss: number, p: any) => ss + p.amount, 0)), 0);
  const avgMonthlyInvestment = recentPayments / 12;

  // Credit comparison
  const monthlyCredits = credits.filter((c: any) => c.status !== 'paid').reduce((s: number, c: any) => s + (c.monthly_payment || 0), 0);

  // Retirement
  const retirementAge = 60;
  const yearsToRetirement = birthYear ? (birthYear + retirementAge) - currentYear : null;

  if (loading) return <View style={st.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  const renderSummary = () => (
    <View>
      <View style={st.summaryCard}>
        <Text style={st.summaryLabel}>Łącznie zainwestowano</Text>
        <Text style={st.summaryBig}>{totalPaid.toFixed(2)} PLN</Text>
        <View style={st.summaryRow}>
          <View style={st.summaryCol}>
            <Text style={st.smLabel}>Aktualna wartość</Text>
            <Text style={st.smVal}>{totalValue.toFixed(2)} PLN</Text>
          </View>
          <View style={st.summaryCol}>
            <Text style={st.smLabel}>Zysk / Strata</Text>
            <Text style={[st.smVal, { color: totalPL >= 0 ? '#2C5F2D' : '#C62828' }]}>{totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)} ({totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(1)}%)</Text>
          </View>
        </View>
        {totalFromOthers > 0 && <Text style={{ fontSize: 12, color: '#1565C0', marginTop: 8, fontWeight: '500' }}>W tym od pracodawcy/państwa: {totalFromOthers.toFixed(0)} zł</Text>}
      </View>

      {/* Avg monthly + credit comparison */}
      <View style={st.insightCard}>
        <Text style={st.insightText}>W ostatnich 12 mies. inwestujesz średnio <Text style={{ fontWeight: '700', color: '#2C5F2D' }}>{avgMonthlyInvestment.toFixed(0)} zł/mies.</Text></Text>
        {monthlyCredits > 0 && <Text style={[st.insightText, { marginTop: 6 }]}>Spłacasz <Text style={{ fontWeight: '700', color: '#800020' }}>{monthlyCredits.toFixed(0)} zł/mies.</Text> rat | Inwestujesz <Text style={{ fontWeight: '700', color: '#2C5F2D' }}>{avgMonthlyInvestment.toFixed(0)} zł/mies.</Text></Text>}
      </View>

      {/* Retirement countdown */}
      {yearsToRetirement !== null && yearsToRetirement > 0 && (hasIKE || hasIKZE || investments.some(i => i.type === 'ppk')) && (
        <View style={st.insightCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="hourglass-outline" size={16} color="#D4AF37" />
            <Text style={st.insightText}>Do 60. urodzin: <Text style={{ fontWeight: '700', color: '#D4AF37' }}>{yearsToRetirement} lat</Text></Text>
          </View>
        </View>
      )}

      {/* IKE limit */}
      {hasIKE && (
        <View style={st.limitCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="umbrella" size={16} color="#2E7D32" />
            <Text style={st.limitTitle}>IKE {currentYear} — limit roczny</Text>
          </View>
          <Text style={st.limitText}>Wpłacono: {ikeYearly.toFixed(0)} zł / {IKE_LIMIT_2026} zł ({((ikeYearly / IKE_LIMIT_2026) * 100).toFixed(0)}%)</Text>
          <View style={st.limitBar}><View style={[st.limitFill, { width: `${Math.min((ikeYearly / IKE_LIMIT_2026) * 100, 100)}%`, backgroundColor: ikeYearly >= IKE_LIMIT_2026 ? '#D4AF37' : '#2E7D32' }]} /></View>
          {ikeYearly > IKE_LIMIT_2026 && <Text style={{ fontSize: 11, color: '#C62828', marginTop: 4 }}>Przekroczono limit!</Text>}
        </View>
      )}
      {/* IKZE limit + tax */}
      {hasIKZE && (
        <View style={st.limitCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="umbrella" size={16} color="#6A1B9A" />
            <Text style={st.limitTitle}>IKZE {currentYear} — limit roczny</Text>
          </View>
          <Text style={st.limitText}>Wpłacono: {ikzeYearly.toFixed(0)} zł / {IKZE_LIMIT_2026} zł ({((ikzeYearly / IKZE_LIMIT_2026) * 100).toFixed(0)}%)</Text>
          <View style={st.limitBar}><View style={[st.limitFill, { width: `${Math.min((ikzeYearly / IKZE_LIMIT_2026) * 100, 100)}%`, backgroundColor: ikzeYearly >= IKZE_LIMIT_2026 ? '#D4AF37' : '#6A1B9A' }]} /></View>
          {ikzeYearly > IKZE_LIMIT_2026 && <Text style={{ fontSize: 11, color: '#C62828', marginTop: 4 }}>Przekroczono limit!</Text>}
          {(() => { const avg = investments.filter(i => i.type === 'ikze').reduce((s, i) => s + (i.tax_bracket || 12), 0) / Math.max(1, investments.filter(i => i.type === 'ikze').length); return <Text style={{ fontSize: 12, color: '#6A1B9A', marginTop: 6, fontWeight: '600' }}>Szacowana ulga PIT: {(Math.min(ikzeYearly, IKZE_LIMIT_2026) * (avg / 100)).toFixed(0)} zł</Text>; })()}
        </View>
      )}
      {/* By goal */}
      {Object.keys(byGoal).length > 0 && (
        <View style={st.goalSummary}>
          <Text style={st.goalSummaryTitle}>Według celu</Text>
          {Object.entries(byGoal).map(([g, d]) => (
            <View key={g} style={st.goalRow}>
              <Text style={st.goalName}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.goalVal}>{d.value.toFixed(0)} PLN</Text>
                <Text style={{ fontSize: 12, color: d.value - d.paid >= 0 ? '#2C5F2D' : '#C62828' }}>{d.value - d.paid >= 0 ? '+' : ''}{(d.value - d.paid).toFixed(0)} PLN</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const ti = getTypeInfo(item.type);
    const paid = item.total_paid || 0;
    const val = item.current_value || 0;
    const pl = val - paid;
    const plPct = paid > 0 ? (pl / paid) * 100 : 0;
    const isExp = expandedId === item.id;
    const xirrVal = calcXIRR(item.payments, item.current_value);
    const payments = item.payments || [];

    // PPK breakdown
    const ownPaid = payments.filter((p: any) => !p.source || p.source === 'own').reduce((s: number, p: any) => s + p.amount, 0);
    const ownAddPaid = payments.filter((p: any) => p.source === 'own_additional').reduce((s: number, p: any) => s + p.amount, 0);
    const employerPaid = payments.filter((p: any) => p.source === 'employer').reduce((s: number, p: any) => s + p.amount, 0);
    const statePaid = payments.filter((p: any) => p.source === 'state_annual' || p.source === 'state_welcome').reduce((s: number, p: any) => s + p.amount, 0);
    const totalOwnPaid = ownPaid + ownAddPaid;
    const ownReturnPct = totalOwnPaid > 0 ? ((val - totalOwnPaid) / totalOwnPaid) * 100 : 0;

    return (
      <View style={st.card}>
        <TouchableOpacity style={st.cardHeader} onPress={() => setExpandedId(isExp ? null : item.id)} activeOpacity={0.7}>
          <View style={[st.typeIcon, { backgroundColor: ti.color + '20' }]}>
            <Ionicons name={ti.icon as any} size={22} color={ti.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.invName}>{item.name}</Text>
            <Text style={st.invType}>{ti.label} {item.currency !== 'PLN' ? `• ${item.currency}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.invValue}>{val.toFixed(2)} {item.currency || 'PLN'}</Text>
            <Text style={[st.invPL, { color: pl >= 0 ? '#2C5F2D' : '#C62828' }]}>{pl >= 0 ? '+' : ''}{pl.toFixed(2)} ({plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%)</Text>
          </View>
        </TouchableOpacity>

        {/* PPK breakdown */}
        {item.type === 'ppk' && paid > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={st.ppkRow}><Text style={st.ppkLabel}>Twoje wpłaty (podstawowe):</Text><Text style={st.ppkVal}>{ownPaid.toFixed(0)} zł</Text></View>
            {ownAddPaid > 0 && <View style={st.ppkRow}><Text style={st.ppkLabel}>Twoje wpłaty (dodatkowe):</Text><Text style={st.ppkVal}>{ownAddPaid.toFixed(0)} zł</Text></View>}
            {employerPaid > 0 && <View style={st.ppkRow}><Text style={st.ppkLabel}>Pracodawca:</Text><Text style={st.ppkVal}>{employerPaid.toFixed(0)} zł</Text></View>}
            {statePaid > 0 && <View style={st.ppkRow}><Text style={st.ppkLabel}>Państwo:</Text><Text style={st.ppkVal}>{statePaid.toFixed(0)} zł</Text></View>}
            <View style={[st.ppkRow, { borderTopWidth: 1, borderTopColor: '#F5F1E8', marginTop: 4, paddingTop: 4 }]}><Text style={[st.ppkLabel, { fontWeight: '600' }]}>ŁĄCZNIE:</Text><Text style={[st.ppkVal, { fontWeight: '700' }]}>{paid.toFixed(0)} zł</Text></View>
            {totalOwnPaid > 0 && <Text style={{ fontSize: 12, color: ownReturnPct >= 0 ? '#2C5F2D' : '#C62828', fontWeight: '600', marginTop: 4 }}>Zwrot z Twojej wpłaty: {ownReturnPct >= 0 ? '+' : ''}{ownReturnPct.toFixed(1)}%</Text>}
          </View>
        )}

        <View style={st.statsRow}>
          <View style={st.statItem}><Text style={st.statLabel}>Wpłacono</Text><Text style={st.statVal}>{paid.toFixed(0)}</Text></View>
          <View style={st.statItem}><Text style={st.statLabel}>Wartość</Text><Text style={st.statVal}>{val.toFixed(0)}</Text></View>
          <View style={st.statItem}><Text style={st.statLabel}>Zysk/Strata</Text><Text style={[st.statVal, { color: pl >= 0 ? '#2C5F2D' : '#C62828' }]}>{pl >= 0 ? '+' : ''}{pl.toFixed(0)}</Text></View>
        </View>

        {xirrVal !== null && <Text style={{ fontSize: 12, color: '#6B5D52', paddingHorizontal: 16, paddingBottom: 8 }}>Roczna stopa zwrotu (XIRR): <Text style={{ fontWeight: '600', color: xirrVal >= 0 ? '#2C5F2D' : '#C62828' }}>{xirrVal.toFixed(1)}%</Text></Text>}

        {item.type === 'ikze' && <Text style={{ fontSize: 12, color: '#6A1B9A', paddingHorizontal: 16, paddingBottom: 8, fontWeight: '500' }}>Próg: {item.tax_bracket || 12}% • Ulga PIT: {(Math.min(payments.filter((p: any) => new Date(p.date).getFullYear() === currentYear).reduce((s: number, p: any) => s + p.amount, 0), IKZE_LIMIT_2026) * ((item.tax_bracket || 12) / 100)).toFixed(0)} zł</Text>}

        {/* Obligacje - interest rates */}
        {item.type === 'obligacje' && item.interest_rates?.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {item.interest_rates.map((ir: any, idx: number) => (
              <Text key={idx} style={{ fontSize: 12, color: '#C62828' }}>{ir.period}: {ir.rate}%</Text>
            ))}
          </View>
        )}

        {/* Retirement */}
        {yearsToRetirement !== null && yearsToRetirement > 0 && ['ppk', 'ike', 'ikze'].includes(item.type) && (
          <Text style={{ fontSize: 11, color: '#D4AF37', paddingHorizontal: 16, paddingBottom: 8 }}>Do 60. urodzin: {yearsToRetirement} lat</Text>
        )}

        {item.goal ? <Text style={{ fontSize: 12, color: '#9B8B7E', paddingHorizontal: 16, paddingBottom: 8 }}>Cel: {item.goal}</Text> : null}

        <View style={st.actionRow}>
          <TouchableOpacity style={st.actionBtn} onPress={() => { setPayInvId(item.id); setPayInvType(item.type); setPayAmount(''); setPayDate(today()); setPaySource('own'); setPpkOwn(''); setPpkOwnAdd(''); setPpkEmployer(''); setPpkState(''); setPayModal(true); }}>
            <Ionicons name="add-circle" size={16} color="#D4AF37" /><Text style={st.actionText}>Wpłata</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => { setValueInvId(item.id); setValueAmount(String(item.current_value || '')); setValueModal(true); }}>
            <Ionicons name="refresh" size={16} color="#1565C0" /><Text style={[st.actionText, { color: '#1565C0' }]}>Wartość</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => openEditModal(item)}><Ionicons name="create-outline" size={16} color="#6B5D52" /></TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => handleDelete(item)}><Ionicons name="trash-outline" size={16} color="#800020" /></TouchableOpacity>
        </View>

        {isExp && (
          <View style={st.historySection}>
            <Text style={st.historyTitle}>Historia wpłat ({payments.length})</Text>
            {payments.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p: any) => (
              <View key={p.id} style={st.historyRow}>
                <Text style={st.historyDate}>{new Date(p.date).toLocaleDateString('pl-PL')}</Text>
                {item.type === 'ppk' && p.source && p.source !== 'own' && <Text style={{ fontSize: 11, color: '#1565C0', flex: 1 }}>{PPK_SOURCES.find(s => s.value === p.source)?.label || p.source}</Text>}
                {(item.type !== 'ppk' || !p.source || p.source === 'own') && <View style={{ flex: 1 }} />}
                <Text style={st.historyAmt}>+{p.amount.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => handleRemovePayment(item.id, p.id)}><Ionicons name="close-circle" size={18} color="#C6282850" /></TouchableOpacity>
              </View>
            ))}
            {payments.length === 0 && <Text style={st.historyEmpty}>Brak wpłat</Text>}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={st.container}>
      <View style={st.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#2A2520" /></TouchableOpacity>
        <Text style={st.headerTitle}>Inwestycje</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList data={investments} keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch_(); }} tintColor="#D4AF37" />}
        ListHeaderComponent={investments.length > 0 ? renderSummary : null}
        ListEmptyComponent={<View style={st.empty}><Ionicons name="trending-up" size={64} color="#9B8B7E" /><Text style={st.emptyText}>Brak inwestycji</Text><Text style={{ fontSize: 13, color: '#9B8B7E', marginBottom: 24, textAlign: 'center' }}>Dodaj PPK, IKE, IKZE, akcje, obligacje i inne</Text><TouchableOpacity style={st.addEmptyBtn} onPress={openAddModal}><Text style={st.addEmptyBtnText}>Dodaj inwestycję</Text></TouchableOpacity></View>}
        renderItem={renderItem} contentContainerStyle={st.list} />
      <TouchableOpacity style={st.fab} onPress={openAddModal}><Ionicons name="add" size={32} color="#FFF" /></TouchableOpacity>

      {/* === ADD/EDIT MODAL === */}
      <Modal visible={formModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={st.modalOverlay}><View style={[st.modalContent, { maxHeight: '88%' }]}>
            <View style={st.modalHeader}><Text style={st.modalTitle}>{editId ? 'Edytuj' : 'Nowa inwestycja'}</Text><TouchableOpacity onPress={() => setFormModal(false)}><Ionicons name="close" size={24} color="#2A2520" /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.inputLabel}>Nazwa *</Text>
              <TextInput style={st.input} value={fName} onChangeText={setFName} placeholder="np. PPK - PZU, ETF SP500" placeholderTextColor="#9B8B7E" />

              <Text style={st.inputLabel}>Typ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {INVESTMENT_TYPES.map(t => (<TouchableOpacity key={t.value} style={[st.chip, fType === t.value && { backgroundColor: getTypeInfo(t.value).color + '20', borderColor: getTypeInfo(t.value).color }]} onPress={() => setFType(t.value)}><Ionicons name={t.icon as any} size={14} color={fType === t.value ? getTypeInfo(t.value).color : '#6B5D52'} /><Text style={[st.chipText, fType === t.value && { color: getTypeInfo(t.value).color, fontWeight: '600' }]}>{t.label}</Text></TouchableOpacity>))}
              </ScrollView>

              {fType === 'ikze' && (<><Text style={st.inputLabel}>Próg podatkowy</Text><View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>{TAX_BRACKETS.map(tb => (<TouchableOpacity key={tb.value} style={[st.chip, fTaxBracket === tb.value && { backgroundColor: '#6A1B9A20', borderColor: '#6A1B9A' }]} onPress={() => setFTaxBracket(tb.value)}><Text style={[st.chipText, fTaxBracket === tb.value && { color: '#6A1B9A', fontWeight: '600' }]}>{tb.label}</Text></TouchableOpacity>))}</View></>)}

              <Text style={st.inputLabel}>Waluta</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>{CURRENCIES.map(c => (<TouchableOpacity key={c} style={[st.chip, fCurrency === c && { backgroundColor: '#D4AF3720', borderColor: '#D4AF37' }]} onPress={() => setFCurrency(c)}><Text style={[st.chipText, fCurrency === c && { color: '#D4AF37', fontWeight: '600' }]}>{c}</Text></TouchableOpacity>))}</View>

              <Text style={st.inputLabel}>Data rozpoczęcia</Text>
              <TextInput style={st.input} value={fStartDate} onChangeText={t => setFStartDate(fmtDate(t))} placeholder="RRRR-MM-DD" placeholderTextColor="#9B8B7E" maxLength={10} keyboardType="numeric" />

              <Text style={st.inputLabel}>Aktualna wartość</Text>
              <TextInput style={st.input} value={fCurrentValue} onChangeText={v => setFCurrentValue(v.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />

              <Text style={st.inputLabel}>Cel (opcjonalnie)</Text>
              <TextInput style={st.input} value={fGoal} onChangeText={t => { setFGoal(t); setShowGoalSuggestions(t.length > 0); }} placeholder="np. Emerytura, Studia Wiki" placeholderTextColor="#9B8B7E" />
              {showGoalSuggestions && allGoals.filter(g => g.toLowerCase().includes(fGoal.toLowerCase()) && g.toLowerCase() !== fGoal.toLowerCase()).length > 0 && (
                <View style={st.suggestBox}>{allGoals.filter(g => g.toLowerCase().includes(fGoal.toLowerCase()) && g.toLowerCase() !== fGoal.toLowerCase()).map(g => (<TouchableOpacity key={g} style={st.suggestItem} onPress={() => { setFGoal(g); setShowGoalSuggestions(false); }}><Text style={st.suggestText}>{g}</Text></TouchableOpacity>))}</View>
              )}

              {/* Obligacje interest rates */}
              {fType === 'obligacje' && (<>
                <Text style={st.inputLabel}>Oprocentowanie wg okresu</Text>
                {fInterestRates.map((ir, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TextInput style={[st.input, { flex: 2, marginBottom: 0 }]} value={ir.period} onChangeText={v => { const a = [...fInterestRates]; a[idx].period = v; setFInterestRates(a); }} placeholder="np. Rok 1" placeholderTextColor="#9B8B7E" />
                    <TextInput style={[st.input, { flex: 1, marginBottom: 0 }]} value={ir.rate} onChangeText={v => { const a = [...fInterestRates]; a[idx].rate = v.replace(',', '.'); setFInterestRates(a); }} placeholder="%" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
                    <TouchableOpacity onPress={() => setFInterestRates(fInterestRates.filter((_, i) => i !== idx))} style={{ justifyContent: 'center' }}><Ionicons name="close-circle" size={22} color="#C62828" /></TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={st.addPayRow} onPress={() => setFInterestRates([...fInterestRates, { period: '', rate: '' }])}><Ionicons name="add" size={16} color="#C62828" /><Text style={{ color: '#C62828', fontWeight: '600', fontSize: 13 }}>Dodaj okres</Text></TouchableOpacity>
              </>)}

              <Text style={st.inputLabel}>Notatki (opcjonalnie)</Text>
              <TextInput style={[st.input, { height: 60, textAlignVertical: 'top' }]} value={fNotes} onChangeText={setFNotes} placeholder="Dodatkowe informacje..." placeholderTextColor="#9B8B7E" multiline />

              {!editId && (<>
                <Text style={[st.inputLabel, { marginTop: 8 }]}>Wpłaty</Text>
                {fInitialPayments.map((p, idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput style={[st.input, { flex: 1, marginBottom: 0 }]} value={p.amount} onChangeText={v => { const a = [...fInitialPayments]; a[idx].amount = v.replace(',', '.'); setFInitialPayments(a); }} placeholder="Kwota" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
                      <TextInput style={[st.input, { flex: 1, marginBottom: 0 }]} value={p.date} onChangeText={v => { const a = [...fInitialPayments]; a[idx].date = fmtDate(v); setFInitialPayments(a); }} placeholder="RRRR-MM-DD" placeholderTextColor="#9B8B7E" maxLength={10} keyboardType="numeric" />
                      {fInitialPayments.length > 1 && <TouchableOpacity onPress={() => setFInitialPayments(fInitialPayments.filter((_, i) => i !== idx))} style={{ justifyContent: 'center' }}><Ionicons name="close-circle" size={22} color="#C62828" /></TouchableOpacity>}
                    </View>
                    {fType === 'ppk' && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {PPK_SOURCES.map(s => (<TouchableOpacity key={s.value} style={[st.chip, { paddingVertical: 4, paddingHorizontal: 8 }, p.source === s.value && { backgroundColor: '#1565C020', borderColor: '#1565C0' }]} onPress={() => { const a = [...fInitialPayments]; a[idx].source = s.value; setFInitialPayments(a); }}><Text style={[st.chipText, { fontSize: 11 }, p.source === s.value && { color: '#1565C0', fontWeight: '600' }]}>{s.label}</Text></TouchableOpacity>))}
                      </ScrollView>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={st.addPayRow} onPress={() => setFInitialPayments([...fInitialPayments, { amount: '', date: today(), source: 'own' }])}><Ionicons name="add" size={16} color="#D4AF37" /><Text style={{ color: '#D4AF37', fontWeight: '600', fontSize: 13 }}>Dodaj kolejną wpłatę</Text></TouchableOpacity>
              </>)}

              <TouchableOpacity style={st.submitBtn} onPress={handleSave}><Text style={st.submitBtnText}>{editId ? 'Zapisz zmiany' : 'Dodaj inwestycję'}</Text></TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View></View>
        </KeyboardAvoidingView>
      </Modal>

      {/* === ADD PAYMENT MODAL === */}
      <Modal visible={payModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={st.modalOverlay}><View style={st.modalContent}>
          <View style={st.modalHeader}><Text style={st.modalTitle}>Dodaj wpłatę</Text><TouchableOpacity onPress={() => setPayModal(false)}><Ionicons name="close" size={24} color="#2A2520" /></TouchableOpacity></View>
          <Text style={st.inputLabel}>Data wpłaty</Text>
          <TextInput style={st.input} value={payDate} onChangeText={t => setPayDate(fmtDate(t))} placeholder="RRRR-MM-DD" placeholderTextColor="#9B8B7E" maxLength={10} keyboardType="numeric" />
          {payInvType === 'ppk' ? (<>
            <Text style={st.inputLabel}>Wpłata pracownika (podstawowa)</Text>
            <TextInput style={st.input} value={ppkOwn} onChangeText={v => setPpkOwn(v.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
            <Text style={st.inputLabel}>Wpłata dodatkowa pracownika</Text>
            <TextInput style={st.input} value={ppkOwnAdd} onChangeText={v => setPpkOwnAdd(v.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
            <Text style={st.inputLabel}>Wpłata pracodawcy</Text>
            <TextInput style={st.input} value={ppkEmployer} onChangeText={v => setPpkEmployer(v.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
            <Text style={st.inputLabel}>Dopłata od państwa</Text>
            <TextInput style={st.input} value={ppkState} onChangeText={v => setPpkState(v.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
          </>) : (<>
            <Text style={st.inputLabel}>Kwota</Text>
            <TextInput style={st.input} value={payAmount} onChangeText={v => setPayAmount(v.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
          </>)}
          <TouchableOpacity style={st.submitBtn} onPress={handleAddPayment}><Text style={st.submitBtnText}>Dodaj wpłatę</Text></TouchableOpacity>
        </View></View>
        </KeyboardAvoidingView>
      </Modal>

      {/* === UPDATE VALUE MODAL === */}
      <Modal visible={valueModal} transparent animationType="slide">
        <View style={st.modalOverlay}><View style={st.modalContent}>
          <View style={st.modalHeader}><Text style={st.modalTitle}>Aktualizuj wartość</Text><TouchableOpacity onPress={() => setValueModal(false)}><Ionicons name="close" size={24} color="#2A2520" /></TouchableOpacity></View>
          <Text style={st.inputLabel}>Aktualna wartość</Text>
          <TextInput style={st.input} value={valueAmount} onChangeText={v => setValueAmount(v.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
          <TouchableOpacity style={st.submitBtn} onPress={handleUpdateValue}><Text style={st.submitBtnText}>Zapisz</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginTop: 16, marginBottom: 8 },
  addEmptyBtn: { backgroundColor: '#D4AF37', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  addEmptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  summaryCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D4AF3730' },
  summaryLabel: { fontSize: 13, color: '#9B8B7E', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryBig: { fontSize: 28, fontWeight: 'bold', color: '#2A2520', marginTop: 4, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 16 },
  summaryCol: { flex: 1 },
  smLabel: { fontSize: 12, color: '#9B8B7E', marginBottom: 2 },
  smVal: { fontSize: 15, fontWeight: '600', color: '#2A2520' },
  insightCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 12 },
  insightText: { fontSize: 13, color: '#6B5D52' },
  limitCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  limitTitle: { fontSize: 13, fontWeight: '600', color: '#2A2520' },
  limitText: { fontSize: 12, color: '#6B5D52', marginTop: 8 },
  limitBar: { height: 6, backgroundColor: '#E0D5C7', borderRadius: 3, marginTop: 8 },
  limitFill: { height: 6, borderRadius: 3 },
  goalSummary: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  goalSummaryTitle: { fontSize: 13, fontWeight: '600', color: '#9B8B7E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F1E8' },
  goalName: { fontSize: 14, color: '#2A2520', fontWeight: '500' },
  goalVal: { fontSize: 14, fontWeight: '600', color: '#2A2520' },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  typeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  invName: { fontSize: 16, fontWeight: '600', color: '#2A2520', marginBottom: 2 },
  invType: { fontSize: 12, color: '#9B8B7E' },
  invValue: { fontSize: 15, fontWeight: '700', color: '#2A2520' },
  invPL: { fontSize: 12, fontWeight: '600' },
  ppkRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  ppkLabel: { fontSize: 12, color: '#6B5D52' },
  ppkVal: { fontSize: 12, fontWeight: '600', color: '#2A2520' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  statItem: { flex: 1, backgroundColor: '#FAF8F3', padding: 8, borderRadius: 8, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#9B8B7E', marginBottom: 2 },
  statVal: { fontSize: 13, fontWeight: '600', color: '#2A2520' },
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F5F1E8', paddingHorizontal: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 10 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#D4AF37' },
  historySection: { padding: 16, borderTopWidth: 1, borderTopColor: '#F5F1E8' },
  historyTitle: { fontSize: 13, fontWeight: '600', color: '#2A2520', marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  historyDate: { fontSize: 13, color: '#6B5D52', width: 85 },
  historyAmt: { fontSize: 13, fontWeight: '600', color: '#2C5F2D' },
  historyEmpty: { fontSize: 13, color: '#9B8B7E', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FAF8F3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#2A2520' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#2A2520', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7', marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F1E8', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  chipText: { fontSize: 12, color: '#6B5D52' },
  submitBtn: { backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  addPayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, justifyContent: 'center' },
  suggestBox: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E0D5C7', marginTop: -8, marginBottom: 12 },
  suggestItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F5F1E8' },
  suggestText: { fontSize: 14, color: '#2A2520' },
});
