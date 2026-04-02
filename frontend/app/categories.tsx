import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { categoriesDB } from '../lib/database';

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await categoriesDB.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const deleteCategory = async (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      Alert.alert('B\u0142\u0105d', 'Nie mo\u017cna usun\u0105\u0107 domy\u015blnej kategorii');
      return;
    }

    Alert.alert(
      'Usu\u0144 Kategori\u0119',
      `Czy na pewno chcesz usun\u0105\u0107 kategori\u0119 "${name}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usu\u0144',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoriesDB.delete(id);
              fetchCategories();
            } catch (error) {
              Alert.alert('B\u0142\u0105d', 'Nie uda\u0142o si\u0119 usun\u0105\u0107 kategorii');
            }
          },
        },
      ]
    );
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2A2520" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kategorie</Text>
        <TouchableOpacity onPress={() => router.push('/add-category')} style={styles.addHeaderButton}>
          <Ionicons name="add" size={24} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[
          { title: 'Przychody', data: incomeCategories },
          { title: 'Wydatki', data: expenseCategories },
        ]}
        keyExtractor={(item) => item.title}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryItem}
                onPress={() => !cat.is_default && router.push(`/add-category?edit=${cat.id}&name=${encodeURIComponent(cat.name)}&type=${cat.type}&color=${encodeURIComponent(cat.color)}`)}
                disabled={cat.is_default}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  {cat.is_default && <Text style={styles.defaultBadge}>Domy\u015blna</Text>}
                </View>
                {!cat.is_default && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => {
                        router.push(`/add-category?edit=${cat.id}&name=${encodeURIComponent(cat.name)}&type=${cat.type}&color=${encodeURIComponent(cat.color)}`);
                      }}
                      style={styles.editButton}
                    >
                      <Ionicons name="pencil" size={18} color="#D4AF37" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        deleteCategory(cat.id, cat.name, cat.is_default);
                      }}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#800020" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-category')}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2A2520',
  },
  addHeaderButton: {
    padding: 4,
  },
  listContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2A2520',
  },
  defaultBadge: {
    fontSize: 11,
    color: '#2C5F2D',
    backgroundColor: '#2C5F2D20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
