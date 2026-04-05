import React, { useState } from 'react';
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
import { categoriesDB } from '../lib/database';

const COLORS = ['#800020', '#E53935', '#FF6B6B', '#C62828', '#FF8C00', '#FFB74D', '#E65100', '#D4AF37', '#FFD600', '#FFF176', '#2C5F2D', '#4CAF50', '#81C784', '#00897B', '#1B2845', '#2196F3', '#42A5F5', '#0288D1', '#9C27B0', '#673AB7', '#BA68C8', '#E91E63', '#F48FB1', '#607D8B', '#9E9E9E', '#455A64'];

const ICONS = [
  'cart', 'restaurant', 'car', 'home', 'medkit', 'school', 'gift',
  'game-controller', 'musical-notes', 'airplane', 'paw', 'shirt',
  'barbell', 'book', 'briefcase', 'bus', 'cafe', 'call',
  'cash', 'construct', 'desktop', 'film', 'fitness',
  'flash', 'flower', 'globe', 'hammer', 'heart',
  'laptop', 'leaf', 'library', 'people', 'pizza',
  'receipt', 'ribbon', 'rocket', 'star', 'trending-up',
  'trophy', 'wallet', 'water', 'wine', 'pricetag',
];

export default function AddCategory() {
  const params = useLocalSearchParams();
  const isEdit = !!params.edit;
  const editId = params.edit as string;
  
  const [name, setName] = useState(params.name ? decodeURIComponent(params.name as string) : '');
  const [type, setType] = useState<'income' | 'expense'>((params.type as any) || 'expense');
  const [color, setColor] = useState(params.color ? decodeURIComponent(params.color as string) : '#D4AF37');
  const [icon, setIcon] = useState(params.icon ? decodeURIComponent(params.icon as string) : 'pricetag');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name) {
      alert('Proszę wpisać nazwę kategorii');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await categoriesDB.update(editId, {
          name,
          type,
          icon,
          color,
        });
      } else {
        await categoriesDB.create({
          name,
          type,
          icon,
          color,
        });
      }
      router.back();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(isEdit ? 'Błąd podczas edycji kategorii' : 'Błąd podczas dodawania kategorii');
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edytuj Kategorię' : 'Nowa Kategoria'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nazwa Kategorii</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="np. Restauracje, Bonusy..."
              placeholderTextColor="#9B8B7E"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Typ</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                onPress={() => setType('expense')}
              >
                <Ionicons name="trending-down" size={20} color={type === 'expense' ? '#FFFFFF' : '#6B5D52'} />
                <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
                  Wydatek
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                onPress={() => setType('income')}
              >
                <Ionicons name="trending-up" size={20} color={type === 'income' ? '#FFFFFF' : '#6B5D52'} />
                <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
                  Przychód
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ikona</Text>
            <View style={styles.iconGrid}>
              {ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[
                    styles.iconButton,
                    icon === ic && { backgroundColor: color + '30', borderColor: color },
                  ]}
                  onPress={() => setIcon(ic)}
                >
                  <Ionicons name={ic as any} size={22} color={icon === ic ? color : '#6B5D52'} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kolor</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorCircleActive,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && <Ionicons name="checkmark" size={24} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>
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
            <Text style={styles.submitButtonText}>{isEdit ? 'Zapisz Zmiany' : 'Dodaj Kategorię'}</Text>
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
    backgroundColor: '#FFFFFF',
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
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D52',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2A2520',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  typeSelector: {
    flexDirection: 'row',
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
    borderWidth: 1,
    borderColor: '#E0D5C7',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#800020',
    borderColor: '#800020',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B5D52',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0D5C7',
  },
  colorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#2A2520',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
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
});
