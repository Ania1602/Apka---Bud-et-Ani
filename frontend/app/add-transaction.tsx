import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { transactionsDB, transactionUpdate, accountsDB, categoriesDB, creditsDB, budgetsDB, getLastAccountForCategory } from '../lib/database';
import Snackbar from '../components/Snackbar';

export default function AddTransaction() {
  const params = useLocalSearchParams();
  const isEdit = !!params.edit;
  const editId = params.edit as string;
  
  const [type, setType] = useState<'income' | 'expense'>((params.type as any) || 'expense');
  const [amount, setAmount] = useState(params.amount ? String(params.amount) : '');
  const [category, setCategory] = useState(params.category ? decodeURIComponent(params.category as string) : '');
  const [description, setDescription] = useState(params.description ? decodeURIComponent(params.description as string) : '');
  const [accountId, setAccountId] = useState(params.account_id ? String(params.account_id) : '');
  const [creditId, setCreditId] = useState(params.credit_id ? String(params.credit_id) : '');
  const [selectedDate, setSelectedDate] = useState(params.date ? String(params.date).split('T')[0] : new Date().toISOString().split('T')[0]);
  const [capitalPart, setCapitalPart] = useState('');
  const [interestPart, setInterestPart] = useState('');
  const [tags, setTags] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [subcategory, setSubcategory] = useState(params.subcategory ? decodeURIComponent(params.subcategory as string) : '');
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [manualAccountSelected, setManualAccountSelected] = useState(!!params.account_id);
  const [budgets, setBudgets] = useState<any[]>([]);
  // Category/subcategory creation modals (change 2)
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#D4AF37');
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const CAT_COLORS = ['#D4AF37', '#800020', '#2C5F2D', '#1E5F8B', '#C2410C', '#7C3AED', '#9B8B7E', '#2A2520'];

  useEffect(() => {
    fetchData();
    // Load recent expense transactions for quick-add chips
    if (!params.edit) {
      transactionsDB.getAll().then(all => {
        const expenses = all.filter((t: any) => t.type === 'expense' && !t.is_transfer && !t.is_limit_refund).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
        const seen = new Set<string>();
        const unique: any[] = [];
        expenses.forEach((t: any) => {
          const key = `${t.category}|${t.subcategory || ''}|${t.description || ''}`.toLowerCase();
          if (!seen.has(key)) { seen.add(key); unique.push(t); }
        });
        setRecentTx(unique.slice(0, 8));
      });
    }
  }, [type]);

  // Auto-set account when category changes (change 4)
  useEffect(() => {
    if (category && !manualAccountSelected && !params.edit) {
      getLastAccountForCategory(category).then(accId => {
        if (accId) setAccountId(accId);
      });
    }
  }, [category]);

  const fetchData = async () => {
    try {
      const [accountsData, categoriesData, creditsData, budgetsData] = await Promise.all([
        accountsDB.getAll(),
        categoriesDB.getAll(type),
        creditsDB.getAll(),
        budgetsDB.getAll(new Date().getMonth() + 1, new Date().getFullYear()),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setCredits(creditsData);
      setBudgets(budgetsData);
      if (accountsData.length > 0 && !accountId) {
        setAccountId(accountsData[0].id);
      }
      if (categoriesData.length > 0 && !category) {
        setCategory(categoriesData[0].name);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !category || !accountId) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    // Validate credit split
    if (creditId && capitalPart && interestPart) {
      const cap = parseFloat(capitalPart) || 0;
      const interest = parseFloat(interestPart) || 0;
      const total = parseFloat(amount);
      if (Math.abs((cap + interest) - total) > 0.01) {
        alert(`Suma kapitału (${cap.toFixed(2)}) i odsetek (${interest.toFixed(2)}) musi równać się kwocie transakcji (${total.toFixed(2)})`);
        return;
      }
    }

    setLoading(true);
    try {
      const tagsList = tags ? tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean) : [];
      
      // Check if account is a limit account
      const selectedAccount = accounts.find((a: any) => a.id === accountId);
      const isLimitAccount = (selectedAccount?.type === 'credit_card' || selectedAccount?.type === 'revolving') && selectedAccount?.credit_limit;
      
      const txData: any = {
        type,
        amount: parseFloat(amount),
        category,
        account_id: accountId,
        description,
        credit_id: creditId || null,
        date: new Date(selectedDate + 'T12:00:00').toISOString(),
        tags: tagsList,
        subcategory: subcategory || null,
        capital_part: creditId && capitalPart ? parseFloat(capitalPart) : null,
        interest_part: creditId && interestPart ? parseFloat(interestPart) : null,
      };
      
      // Income on limit accounts is a refund, not real income
      if (type === 'income' && isLimitAccount) {
        txData.is_limit_refund = true;
      }

      if (isEdit) {
        await transactionUpdate(editId, txData);
        router.back();
      } else {
        const newId = await transactionsDB.create(txData);
        // If credit installment with capital part, reduce remaining_amount
        if (creditId && capitalPart) {
          const credit = credits.find(c => c.id === creditId);
          if (credit) {
            const newRemaining = (credit.remaining_amount || 0) - (parseFloat(capitalPart) || 0);
            await creditsDB.update(creditId, { ...credit, remaining_amount: Math.max(0, newRemaining) });
          }
        }
        // Snackbar with undo (change 5)
        setLastAddedId(newId);
        Alert.alert(
          `Dodano: ${type === 'expense' ? '-' : '+'}${parseFloat(amount).toFixed(2)} zł`,
          category,
          [
            { text: 'COFNIJ', style: 'destructive', onPress: async () => {
              if (newId) { await transactionsDB.delete(newId); }
              router.back();
            }},
            { text: 'OK', onPress: () => router.back() },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Błąd podczas zapisywania transakcji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#2A2520" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edytuj Transakcję' : 'Dodaj Transakcję'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
            onPress={() => setType('expense')}
          >
            <Ionicons name="arrow-up" size={20} color={type === 'expense' ? '#FFFFFF' : '#6B5D52'} />
            <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
              Wydatek
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
            onPress={() => setType('income')}
          >
            <Ionicons name="arrow-down" size={20} color={type === 'income' ? '#FFFFFF' : '#6B5D52'} />
            <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
              Przychód
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick-add from recent (change 3) */}
        {!isEdit && type === 'expense' && recentTx.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: '#9B8B7E', marginBottom: 6, marginLeft: 4 }}>Ostatnio dodane</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentTx.map((t, idx) => (
                <TouchableOpacity key={idx} style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 10, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E0D5C7', minWidth: 100 }}
                  onPress={() => { setCategory(t.category); setSubcategory(t.subcategory || ''); setDescription(t.description || ''); if (t.account_id) { setAccountId(t.account_id); setManualAccountSelected(true); } }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="repeat" size={14} color="#D4AF37" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: '#2A2520', fontWeight: '600' }} numberOfLines={1}>{t.subcategory || t.description || t.category}</Text>
                    <Text style={{ fontSize: 10, color: '#9B8B7E' }}>{t.amount.toFixed(0)} zł</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>PLN</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(',', '.'))}
            placeholder="0.00"
            placeholderTextColor="#9B8B7E"
            keyboardType="numeric"
          />
        </View>

        {/* Budget warning (change 8) */}
        {type === 'expense' && parseFloat(amount) > 200 && (() => {
          const bgt = budgets.find((b: any) => (b.categories || [b.category]).some((c: string) => c === category));
          if (!bgt) return null;
          const pct = (parseFloat(amount) / bgt.amount) * 100;
          if (pct <= 5) return null;
          const isHigh = pct > 25;
          return (
            <View style={{ backgroundColor: isHigh ? '#F8D7DA' : '#FFF3CD', padding: 10, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="warning" size={16} color={isHigh ? '#721C24' : '#856404'} />
              <Text style={{ fontSize: 12, color: isHigh ? '#721C24' : '#856404', flex: 1 }}>{isHigh ? 'UWAGA' : ''} To {pct.toFixed(0)}% budżetu na ten miesiąc ({bgt.amount.toFixed(0)} zł)</Text>
            </View>
          );
        })()}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Data transakcji</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateButton} onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}>
                <Ionicons name="chevron-back" size={20} color="#D4AF37" />
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Ionicons name="calendar" size={18} color="#D4AF37" />
                <TextInput
                  style={styles.dateInput}
                  value={selectedDate}
                  onChangeText={(text: string) => {
                    const digits = text.replace(/[^0-9]/g, '');
                    let formatted = digits;
                    if (digits.length > 4) formatted = digits.slice(0, 4) + '-' + digits.slice(4);
                    if (digits.length > 6) formatted = digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8);
                    setSelectedDate(formatted.slice(0, 10));
                  }}
                  placeholder="RRRR-MM-DD"
                  placeholderTextColor="#9B8B7E"
                />
              </View>
              <TouchableOpacity style={styles.dateButton} onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}>
                <Ionicons name="chevron-forward" size={20} color="#D4AF37" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.todayButton} onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                <Text style={styles.todayButtonText}>Dziś</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kategoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.name && { backgroundColor: cat.color },
                  ]}
                  onPress={() => { setCategory(cat.name); setSubcategory(''); }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.name && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.categoryChip, { borderWidth: 1, borderColor: '#D4AF37', borderStyle: 'dashed' }]} onPress={() => { setNewCatName(''); setNewCatColor('#D4AF37'); setCatModalVisible(true); }}>
                <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: '600' }}>+ Nowa</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Subcategory picker */}
          {(() => {
            const selectedCat = categories.find(c => c.name === category);
            if (!selectedCat) return null;
            const subs = selectedCat?.subcategories || [];
            return (
              <View style={styles.field}>
                <Text style={styles.label}>Podkategoria (opcjonalnie)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.subChip, !subcategory && styles.subChipActive]}
                    onPress={() => setSubcategory('')}
                  >
                    <Text style={[styles.subChipText, !subcategory && styles.subChipTextActive]}>Brak</Text>
                  </TouchableOpacity>
                  {subs.map((sub: any) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[styles.subChip, subcategory === sub.name && styles.subChipActive]}
                      onPress={() => setSubcategory(sub.name)}
                    >
                      <Text style={[styles.subChipText, subcategory === sub.name && styles.subChipTextActive]}>{sub.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.subChip, { borderWidth: 1, borderColor: '#2C5F2D', borderStyle: 'dashed' }]} onPress={() => { setNewSubName(''); setSubModalVisible(true); }}>
                    <Text style={{ color: '#2C5F2D', fontSize: 12, fontWeight: '600' }}>+ Nowa</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            );
          })()}

          <View style={styles.field}>
            <Text style={styles.label}>Konto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.accountChip,
                    accountId === acc.id && styles.accountChipActive,
                  ]}
                  onPress={() => setAccountId(acc.id)}
                >
                  <Text
                    style={[
                      styles.accountChipText,
                      accountId === acc.id && styles.accountChipTextActive,
                    ]}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Opis (opcjonalnie)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Dodaj opis..."
              placeholderTextColor="#9B8B7E"
              multiline
            />
          </View>

          {type === 'expense' && credits.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Rata Kredytu (opcjonalnie)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity
                  style={[styles.accountChip, !creditId && styles.accountChipActive]}
                  onPress={() => { setCreditId(''); setCapitalPart(''); setInterestPart(''); }}
                >
                  <Text style={[styles.accountChipText, !creditId && styles.accountChipTextActive]}>Brak</Text>
                </TouchableOpacity>
                {credits.map((credit) => (
                  <TouchableOpacity
                    key={credit.id}
                    style={[styles.accountChip, creditId === credit.id && styles.accountChipActive]}
                    onPress={() => setCreditId(credit.id)}
                  >
                    <Text style={[styles.accountChipText, creditId === credit.id && styles.accountChipTextActive]}>{credit.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {creditId ? (
            <View style={styles.creditSplitCard}>
              <Text style={styles.creditSplitTitle}>Podział raty</Text>
              <View style={styles.creditSplitRow}>
                <View style={styles.creditSplitField}>
                  <Text style={styles.creditSplitLabel}>Kapitał</Text>
                  <TextInput style={styles.creditSplitInput} value={capitalPart}
                    onChangeText={(t) => {
                      const val = t.replace(',', '.');
                      setCapitalPart(val);
                      if (amount && val) setInterestPart((parseFloat(amount) - (parseFloat(val) || 0)).toFixed(2));
                    }}
                    placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
                </View>
                <View style={styles.creditSplitField}>
                  <Text style={styles.creditSplitLabel}>Odsetki</Text>
                  <TextInput style={styles.creditSplitInput} value={interestPart}
                    onChangeText={(t) => {
                      const val = t.replace(',', '.');
                      setInterestPart(val);
                      if (amount && val) setCapitalPart((parseFloat(amount) - (parseFloat(val) || 0)).toFixed(2));
                    }}
                    placeholder="0.00" placeholderTextColor="#9B8B7E" keyboardType="numeric" />
                </View>
              </View>
              {capitalPart && interestPart && amount && (
                <Text style={[styles.creditSplitInfo, Math.abs((parseFloat(capitalPart) + parseFloat(interestPart)) - parseFloat(amount)) > 0.01 ? { color: '#D32F2F' } : {}]}>
                  Suma: {((parseFloat(capitalPart) || 0) + (parseFloat(interestPart) || 0)).toFixed(2)} / {parseFloat(amount).toFixed(2)} PLN
                </Text>
              )}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Tagi (opcjonalnie, oddziel przecinkami)</Text>
            <TextInput style={[styles.input, { minHeight: 48 }]} value={tags} onChangeText={setTags}
              placeholder="#wakacje, #remont, #prezent" placeholderTextColor="#9B8B7E" />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{isEdit ? 'Zapisz Zmiany' : 'Dodaj Transakcję'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal: Nowa Kategoria */}
      <Modal visible={catModalVisible} transparent animationType="fade" onRequestClose={() => setCatModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nowa Kategoria</Text>
            <TextInput
              style={styles.modalInput}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Nazwa kategorii"
              placeholderTextColor="#9B8B7E"
              autoFocus
            />
            <Text style={styles.modalLabel}>Kolor</Text>
            <View style={styles.colorRow}>
              {CAT_COLORS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setNewCatColor(c)}
                  style={[styles.colorOption, { backgroundColor: c }, newCatColor === c && styles.colorOptionActive]}>
                  {newCatColor === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setCatModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={async () => {
                const name = newCatName.trim();
                if (!name) { Alert.alert('Błąd', 'Wpisz nazwę kategorii'); return; }
                try {
                  await categoriesDB.create({ name, type, color: newCatColor, icon: 'pricetag' });
                  setCatModalVisible(false);
                  await fetchData();
                  setCategory(name);
                  setSubcategory('');
                } catch (e) { Alert.alert('Błąd', 'Nie udało się utworzyć kategorii'); }
              }}>
                <Text style={styles.modalBtnSaveText}>Dodaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Nowa Podkategoria */}
      <Modal visible={subModalVisible} transparent animationType="fade" onRequestClose={() => setSubModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nowa Podkategoria</Text>
            <Text style={styles.modalSubtitle}>dla: {category}</Text>
            <TextInput
              style={styles.modalInput}
              value={newSubName}
              onChangeText={setNewSubName}
              placeholder="Nazwa podkategorii"
              placeholderTextColor="#9B8B7E"
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setSubModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={async () => {
                const name = newSubName.trim();
                if (!name) { Alert.alert('Błąd', 'Wpisz nazwę podkategorii'); return; }
                const selectedCat = categories.find((c: any) => c.name === category);
                if (!selectedCat) { Alert.alert('Błąd', 'Nie znaleziono kategorii'); return; }
                try {
                  await categoriesDB.addSubcategory(selectedCat.id, name);
                  setSubModalVisible(false);
                  await fetchData();
                  setSubcategory(name);
                } catch (e) { Alert.alert('Błąd', 'Nie udało się utworzyć podkategorii'); }
              }}>
                <Text style={styles.modalBtnSaveText}>Dodaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C7',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
  },
  content: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#800020',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B5D52',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B5D52',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2A2520',
    minWidth: 150,
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2A2520',
    minHeight: 80,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#2A2520',
  },
  todayButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  accountChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  accountChipActive: {
    backgroundColor: '#D4AF37',
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
  },
  accountChipTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
  },
  submitButton: {
    backgroundColor: '#D4AF37',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  creditSplitCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#D4AF3730' },
  creditSplitTitle: { fontSize: 14, fontWeight: '600', color: '#D4AF37', marginBottom: 12 },
  creditSplitRow: { flexDirection: 'row', gap: 12 },
  creditSplitField: { flex: 1 },
  creditSplitLabel: { fontSize: 12, color: '#6B5D52', marginBottom: 6 },
  creditSplitInput: { backgroundColor: '#FAF8F3', borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7' },
  creditSplitInfo: { fontSize: 12, color: '#2C5F2D', marginTop: 10, textAlign: 'center', fontWeight: '500' },
  subChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', marginRight: 8, borderWidth: 1, borderColor: '#E0D5C7' },
  subChipActive: { backgroundColor: '#2C5F2D', borderColor: '#2C5F2D' },
  subChipText: { fontSize: 13, fontWeight: '500', color: '#6B5D52' },
  subChipTextActive: { color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(42,37,32,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FAF8F3', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#2A2520', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#9B8B7E', marginBottom: 16 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, fontSize: 16, color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7', marginTop: 12, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '500', color: '#6B5D52', marginBottom: 8 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  colorOption: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorOptionActive: { borderWidth: 3, borderColor: '#2A2520' },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtnCancel: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: '#E0D5C7' },
  modalBtnCancelText: { fontSize: 15, fontWeight: '600', color: '#6B5D52' },
  modalBtnSave: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#D4AF37', alignItems: 'center' },
  modalBtnSaveText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
