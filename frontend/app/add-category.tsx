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
import { categoriesDB, LOCKED_CATEGORY_NAMES } from '../lib/database';

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
  'ellipsis-horizontal', 'swap-horizontal',
];

export default function AddCategory() {
  const params = useLocalSearchParams();
  const isEdit = !!params.edit;
  const editId = params.edit as string;

  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>((params.type as any) || 'expense');
  const [color, setColor] = useState('#D4AF37');
  const [icon, setIcon] = useState('pricetag');
  const [loading, setLoading] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(isEdit);

  // System categories are referenced by name in code, so only their look can change
  const nameLocked = isEdit && LOCKED_CATEGORY_NAMES.includes(originalName);

  useEffect(() => {
    if (!isEdit) return;
    categoriesDB.getById(editId).then((cat: any) => {
      if (cat) {
        setName(cat.name);
        setOriginalName(cat.name);
        setType(cat.type);
        setColor(cat.color || '#D4AF37');
        setIcon(cat.icon || 'pricetag');
      }
      setLoadingCategory(false);
    });
  }, [editId]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Proszę wpisać nazwę kategorii');
      return;
    }

    setLoading(true);
    try {
      const existing = await categoriesDB.getAll(type);
      const duplicate = existing.some((c: any) => c.id !== editId && c.name.trim().toLowerCase() === trimmed.toLowerCase());
      if (duplicate) {
        alert(`Kategoria "${trimmed}" już istnieje`);
        return;
      }

      if (isEdit) {
        // Type stays fixed: existing transactions keep their type
        await categoriesDB.update(editId, {
          name: nameLocked ? originalName : trimmed,
          icon,
          color,
        });
      } else {
        await categoriesDB.create({
          name: trimmed,
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

      {loadingCategory ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color="#D4AF37" /></View>
      ) : (
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.preview}>
            <View style={[styles.previewIcon, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon as any} size={28} color={color} />
            </View>
            <Text style={styles.previewName} numberOfLines={1}>{name.trim() || 'Nazwa kategorii'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nazwa Kategorii</Text>
            <TextInput
              style={[styles.input, nameLocked && styles.inputDisabled]}
              value={name}
              onChangeText={setName}
              placeholder="np. Restauracje, Bonusy..."
              placeholderTextColor="#9B8B7E"
              editable={!nameLocked}
              autoFocus={!isEdit}
              maxLength={40}
            />
            {nameLocked && (
              <Text style={styles.hint}>To kategoria systemowa — możesz zmienić ikonę i kolor, ale nie nazwę.</Text>
            )}
            {isEdit && !nameLocked && name.trim() !== originalName && name.trim() !== '' && (
              <Text style={styles.hint}>Zmiana nazwy zaktualizuje też istniejące transakcje, budżety i płatności cykliczne.</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Typ</Text>
            <View style={[styles.typeSelector, isEdit && styles.typeSelectorDisabled]}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                onPress={() => setType('expense')}
                disabled={isEdit}
              >
                <Ionicons name="trending-down" size={20} color={type === 'expense' ? '#FFFFFF' : '#6B5D52'} />
                <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
                  Wydatek
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                onPress={() => setType('income')}
                disabled={isEdit}
              >
                <Ionicons name="trending-up" size={20} color={type === 'income' ? '#FFFFFF' : '#6B5D52'} />
                <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
                  Przychód
                </Text>
              </TouchableOpacity>
            </View>
            {isEdit && <Text style={styles.hint}>Typu istniejącej kategorii nie można zmienić.</Text>}
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
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (loading || loadingCategory) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || loadingCategory}
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
  typeSelectorDisabled: {
    opacity: 0.5,
  },
  inputDisabled: {
    backgroundColor: '#F5F1E8',
    color: '#6B5D52',
  },
  hint: {
    fontSize: 12,
    color: '#9B8B7E',
    marginTop: 8,
    lineHeight: 17,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    marginBottom: 28,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#2A2520',
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
