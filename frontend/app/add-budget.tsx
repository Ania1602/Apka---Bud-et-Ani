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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { budgetsDB, categoriesDB } from '../lib/database';
import { parseAmount } from '../lib/utils';

export default function AddBudget() {
  const params = useLocalSearchParams();
  const isEdit = !!params.edit;
  const editId = params.edit as string;

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [budgetName, setBudgetName] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    fetchCategories();
    if (isEdit) { loadBudgetData(); }
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoriesDB.getAll('expense');
      setCategories(data);
    } catch (error) { console.error('Error fetching categories:', error); }
  };

  const loadBudgetData = async () => {
    try {
      const allBudgets = await budgetsDB.getAll();
      const budget = allBudgets.find((b: any) => b.id === editId);
      if (budget) {
        setBudgetName(budget.name || '');
        setSelectedCategories(budget.categories || (budget.category ? [budget.category] : []));
        setLimitAmount(String(budget.limit_amount));
        setMonth(budget.month); setYear(budget.year);
      }
    } catch (error) { console.error('Error loading budget:', error); }
  };

  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev => prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]);
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0 || !limitAmount) {
      alert('Wybierz kategorię i podaj kwotę'); return;
    }

    setLoading(true);
    try {
      const budgetData = {
        name: budgetName || selectedCategories.join(', '),
        category: selectedCategories[0],
        categories: selectedCategories,
        month, year,
        limit_amount: parseAmount(limitAmount),
      };
      if (isEdit) { await budgetsDB.update(editId, budgetData); }
      else { await budgetsDB.create(budgetData); }
      router.back();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Błąd podczas zapisywania budżetu');
    } finally { setLoading(false); }
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edytuj Budżet' : 'Dodaj Budżet'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Budżet na {new Date().toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.infoText}>
            Ustaw limit wydatków dla wybranej kategorii w bieżącym miesiącu
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nazwa budżetu (opcjonalnie)</Text>
            <TextInput style={styles.input} value={budgetName} onChangeText={setBudgetName} placeholder="np. Codzienne" placeholderTextColor="#9B8B7E" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kategorie ({selectedCategories.length} wybrano)</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && { backgroundColor: cat.color }]}
                    onPress={() => toggleCategory(cat.name)}
                  >
                    <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={18} color={isSelected ? '#FFF' : '#6B5D52'} />
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Limit wydatków (PLN)</Text>
            <TextInput
              style={styles.input}
              value={limitAmount}
              onChangeText={(t) => setLimitAmount(t.replace(',', '.'))}
              placeholder="0.00"
              placeholderTextColor="#9B8B7E"
              keyboardType="numeric"
            />
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
            <Text style={styles.submitButtonText}>{isEdit ? 'Zapisz Zmiany' : 'Dodaj Budżet'}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  infoCard: {
    backgroundColor: '#D4AF3720',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  infoText: {
    fontSize: 14,
    color: '#6B5D52',
    lineHeight: 20,
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
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
  },
  submitButton: {
    backgroundColor: '#A8862B',
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
});
