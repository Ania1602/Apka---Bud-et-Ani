import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { plansDB } from '../lib/database';

const MONTH_NAMES = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

export default function Upcoming() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'income' | 'expense'>('expense');
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemDay, setItemDay] = useState('');
  const [itemRecurring, setItemRecurring] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'income' | 'expense'>('expense');

  const fetchData = async () => {
    try {
      let p = await plansDB.getByMonth(selectedMonth, selectedYear);
      if (!p) p = await plansDB.createForMonth(selectedMonth, selectedYear);
      setPlan(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [selectedMonth, selectedYear]));

  const changeMonth = (dir: number) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m); setSelectedYear(y); setLoading(true);
  };

  const openAddModal = (type: 'income' | 'expense') => {
    setAddType(type); setItemName(''); setItemAmount(''); setItemDay('');
    setItemRecurring(false); setEditingItem(null); setShowAddModal(true);
  };

  const openEditModal = (item: any, type: 'income' | 'expense') => {
    setAddType(type); setItemName(item.name); setItemAmount(String(item.amount));
    setItemDay(item.day ? String(item.day) : ''); setItemRecurring(item.is_recurring || false);
    setEditingItem(item); setEditingType(type); setShowAddModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemName || !itemAmount || !plan) return;
    const data = {
      name: itemName,
      amount: parseFloat(itemAmount),
      day: itemDay ? parseInt(itemDay) : null,
      is_recurring: itemRecurring,
    };
    if (editingItem) {
      await plansDB.updateItem(plan.id, addType, editingItem.id, data);
    } else {
      await plansDB.addItem(plan.id, addType, data);
    }
    setShowAddModal(false);
    fetchData();
  };

  const handleDeleteItem = (itemId: string, type: 'income' | 'expense', name: string) => {
    Alert.alert('Usuń', `Usunąć "${name}"?`, [
      { text: 'Anuluj' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await plansDB.deleteItem(plan.id, type, itemId);
        fetchData();
      }},
    ]);
  };

  const handleTogglePaid = async (itemId: string, type: 'income' | 'expense') => {
    if (!plan) return;
    await plansDB.togglePaid(plan.id, type, itemId);
    fetchData();
  };

  const handleCopyNext = () => {
    if (!plan) return;
    Alert.alert('Kopiuj plan', 'Na ile miesięcy chcesz skopiować?', [
      { text: 'Anuluj' },
      { text: '1 miesiąc', onPress: async () => {
        let m = selectedMonth + 1, y = selectedYear;
        if (m > 12) { m = 1; y++; }
        await plansDB.copyToMonth(plan.id, m, y);
        Alert.alert('Sukces', `Plan skopiowany na ${MONTH_NAMES[m-1]} ${y}`);
      }},
      { text: '3 miesiące', onPress: async () => {
        await plansDB.copyToMultipleMonths(plan.id, 3);
        Alert.alert('Sukces', 'Plan skopiowany na 3 kolejne miesiące');
      }},
      { text: '6 miesięcy', onPress: async () => {
        await plansDB.copyToMultipleMonths(plan.id, 6);
        Alert.alert('Sukces', 'Plan skopiowany na 6 kolejnych miesięcy');
      }},
    ]);
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#D4AF37" /></View>;

  const totalIncome = plan?.incomes?.reduce((s: number, i: any) => s + i.amount, 0) || 0;
  const totalExpense = plan?.expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
  const freeAmount = totalIncome - totalExpense;
  const unpaidExpenses = plan?.expenses?.filter((e: any) => !e.paid).reduce((s: number, e: any) => s + e.amount, 0) || 0;
  const paidExpenses = totalExpense - unpaidExpenses;
  const unpaidIncome = plan?.incomes?.filter((i: any) => !i.paid).reduce((s: number, i: any) => s + i.amount, 0) || 0;
  const availableAfter = totalIncome - unpaidExpenses;

  return (
    <View style={s.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#D4AF37" />}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#2A2520" />
          </TouchableOpacity>
          <Text style={s.title}>Planowanie</Text>
          <TouchableOpacity onPress={() => router.push('/plan-year')}>
            <Ionicons name="grid" size={22} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        {/* Month Selector */}
        <View style={s.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthArrow}>
            <Ionicons name="chevron-back" size={24} color="#6B5D52" />
          </TouchableOpacity>
          <View style={s.monthCenter}>
            <Text style={s.monthName}>{MONTH_NAMES[selectedMonth - 1]}</Text>
            <Text style={s.monthYear}>{selectedYear}</Text>
          </View>
          <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthArrow}>
            <Ionicons name="chevron-forward" size={24} color="#6B5D52" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={s.summaryGrid}>
          <View style={[s.summaryCard, { borderLeftColor: '#2C5F2D' }]}>
            <Text style={s.summaryLabel}>Planowane wpływy</Text>
            <Text style={[s.summaryValue, { color: '#2C5F2D' }]}>{totalIncome.toFixed(2)}</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#800020' }]}>
            <Text style={s.summaryLabel}>Planowane wydatki</Text>
            <Text style={[s.summaryValue, { color: '#800020' }]}>{totalExpense.toFixed(2)}</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: freeAmount >= 0 ? '#D4AF37' : '#D32F2F' }]}>
            <Text style={s.summaryLabel}>Kwota wolna</Text>
            <Text style={[s.summaryValue, { color: freeAmount >= 0 ? '#D4AF37' : '#D32F2F' }]}>{freeAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Status Bar */}
        <View style={s.statusBar}>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Do zapłaty</Text>
            <Text style={[s.statusValue, { color: '#FF9800' }]}>{unpaidExpenses.toFixed(2)} PLN</Text>
          </View>
          <View style={s.statusDivider} />
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Zapłacone</Text>
            <Text style={[s.statusValue, { color: '#2C5F2D' }]}>{paidExpenses.toFixed(2)} PLN</Text>
          </View>
          <View style={s.statusDivider} />
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Dostępne po</Text>
            <Text style={[s.statusValue, { color: availableAfter >= 0 ? '#2C5F2D' : '#D32F2F' }]}>{availableAfter.toFixed(2)} PLN</Text>
          </View>
        </View>

        {/* Incomes */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="arrow-down-circle" size={20} color="#2C5F2D" />
              <Text style={s.sectionTitle}>Wpływy ({plan?.incomes?.length || 0})</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => openAddModal('income')}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          {plan?.incomes?.map((item: any) => (
            <TouchableOpacity key={item.id} style={s.itemRow} onPress={() => handleTogglePaid(item.id, 'income')}
              onLongPress={() => openEditModal(item, 'income')}>
              <Ionicons name={item.paid ? 'checkbox' : 'square-outline'} size={24} color={item.paid ? '#2C5F2D' : '#9B8B7E'} />
              <View style={[s.itemDetails, item.paid && s.itemPaid]}>
                <View style={s.itemNameRow}>
                  <Text style={[s.itemName, item.paid && s.textPaid]}>{item.name}</Text>
                  {item.is_recurring && <Ionicons name="repeat" size={14} color="#9C27B0" />}
                </View>
                {item.day && <Text style={s.itemDay}>Dzień {item.day}</Text>}
              </View>
              <Text style={[s.itemAmount, { color: '#2C5F2D' }, item.paid && s.textPaid]}>+{item.amount.toFixed(2)}</Text>
              <TouchableOpacity onPress={() => handleDeleteItem(item.id, 'income', item.name)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color="#D32F2F50" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {(!plan?.incomes || plan.incomes.length === 0) && (
            <Text style={s.emptyText}>Brak zaplanowanych wpływów</Text>
          )}
        </View>

        {/* Expenses */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="arrow-up-circle" size={20} color="#800020" />
              <Text style={s.sectionTitle}>Wydatki ({plan?.expenses?.length || 0})</Text>
            </View>
            <TouchableOpacity style={[s.addBtn, { backgroundColor: '#800020' }]} onPress={() => openAddModal('expense')}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          {plan?.expenses?.sort((a: any, b: any) => (a.day || 99) - (b.day || 99)).map((item: any) => (
            <TouchableOpacity key={item.id} style={s.itemRow} onPress={() => handleTogglePaid(item.id, 'expense')}
              onLongPress={() => openEditModal(item, 'expense')}>
              <Ionicons name={item.paid ? 'checkbox' : 'square-outline'} size={24} color={item.paid ? '#2C5F2D' : '#9B8B7E'} />
              <View style={[s.itemDetails, item.paid && s.itemPaid]}>
                <View style={s.itemNameRow}>
                  <Text style={[s.itemName, item.paid && s.textPaid]}>{item.name}</Text>
                  {item.is_recurring && <Ionicons name="repeat" size={14} color="#9C27B0" />}
                </View>
                {item.day && <Text style={s.itemDay}>Dzień {item.day}</Text>}
              </View>
              <Text style={[s.itemAmount, { color: '#800020' }, item.paid && s.textPaid]}>-{item.amount.toFixed(2)}</Text>
              <TouchableOpacity onPress={() => handleDeleteItem(item.id, 'expense', item.name)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color="#D32F2F50" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {(!plan?.expenses || plan.expenses.length === 0) && (
            <Text style={s.emptyText}>Brak zaplanowanych wydatków</Text>
          )}
        </View>

        {/* Actions */}
        <View style={s.actionsSection}>
          <TouchableOpacity style={s.copyBtn} onPress={handleCopyNext}>
            <Ionicons name="copy" size={20} color="#D4AF37" />
            <Text style={s.copyBtnText}>Skopiuj plan na kolejne miesiące</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.yearBtn} onPress={() => router.push('/plan-year')}>
            <Ionicons name="grid" size={20} color="#1B2845" />
            <Text style={s.yearBtnText}>Widok roczny</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Item Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editingItem ? 'Edytuj pozycję' : addType === 'income' ? 'Nowy wpływ' : 'Nowy wydatek'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#2A2520" />
              </TouchableOpacity>
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Nazwa *</Text>
              <TextInput style={s.modalInput} value={itemName} onChangeText={setItemName}
                placeholder={addType === 'income' ? 'np. Wynagrodzenie' : 'np. Rata PKO'}
                placeholderTextColor="#9B8B7E" />
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Kwota *</Text>
              <TextInput style={s.modalInput} value={itemAmount}
                onChangeText={(t) => setItemAmount(t.replace(',', '.'))}
                placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>Dzień miesiąca (opcjonalnie)</Text>
              <TextInput style={s.modalInput} value={itemDay} onChangeText={setItemDay}
                placeholder="np. 10" placeholderTextColor="#9B8B7E" keyboardType="numeric" maxLength={2} />
            </View>

            <TouchableOpacity style={s.recurringToggle} onPress={() => setItemRecurring(!itemRecurring)}>
              <Ionicons name={itemRecurring ? 'checkbox' : 'square-outline'} size={22} color={itemRecurring ? '#9C27B0' : '#9B8B7E'} />
              <Text style={s.recurringLabel}>Powtarzaj co miesiąc</Text>
              <Ionicons name="repeat" size={16} color="#9C27B0" />
            </TouchableOpacity>

            <TouchableOpacity style={[s.modalSaveBtn, { backgroundColor: addType === 'income' ? '#2C5F2D' : '#800020' }]}
              onPress={handleSaveItem}>
              <Text style={s.modalSaveBtnText}>{editingItem ? 'Zapisz zmiany' : 'Dodaj'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#2A2520' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 16 },
  monthArrow: { padding: 12 },
  monthCenter: { alignItems: 'center', minWidth: 160 },
  monthName: { fontSize: 22, fontWeight: '700', color: '#2A2520' },
  monthYear: { fontSize: 14, color: '#6B5D52' },
  summaryGrid: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  summaryCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, borderLeftWidth: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#6B5D52' },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  statusBar: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 16, gap: 0 },
  statusItem: { flex: 1, alignItems: 'center' },
  statusLabel: { fontSize: 10, color: '#9B8B7E', marginBottom: 4, textTransform: 'uppercase' },
  statusValue: { fontSize: 13, fontWeight: '700' },
  statusDivider: { width: 1, backgroundColor: '#E0D5C7' },
  section: { marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2A2520' },
  addBtn: { backgroundColor: '#2C5F2D', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F1E8', gap: 10 },
  itemDetails: { flex: 1 },
  itemPaid: { opacity: 0.5 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 15, fontWeight: '500', color: '#2A2520' },
  textPaid: { textDecorationLine: 'line-through', color: '#9B8B7E' },
  itemDay: { fontSize: 12, color: '#9B8B7E', marginTop: 2 },
  itemAmount: { fontSize: 15, fontWeight: '700', minWidth: 80, textAlign: 'right' },
  emptyText: { fontSize: 13, color: '#9B8B7E', textAlign: 'center', paddingVertical: 16 },
  actionsSection: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#D4AF37' },
  copyBtnText: { fontSize: 15, fontWeight: '600', color: '#D4AF37' },
  yearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#1B2845' },
  yearBtnText: { fontSize: 15, fontWeight: '600', color: '#1B2845' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000060' },
  modalContent: { backgroundColor: '#FAF8F3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2A2520' },
  modalField: { marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '500', color: '#6B5D52', marginBottom: 8 },
  modalInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7' },
  recurringToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, padding: 14, backgroundColor: '#FFF', borderRadius: 12 },
  recurringLabel: { flex: 1, fontSize: 14, color: '#2A2520' },
  modalSaveBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  modalSaveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
