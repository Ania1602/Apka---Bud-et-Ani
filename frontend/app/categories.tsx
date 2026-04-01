import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kategorie</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={[{ title: 'Przychody', data: incomeCategories }, { title: 'Wydatki', data: expenseCategories }]}
        keyExtractor={(item) => item.title}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((cat: any) => (
              <View key={cat.id} style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
                {cat.is_default && <Text style={styles.defaultBadge}>Domyślna</Text>}
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0c0c0c' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#333' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  listContent: { padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 8 },
  categoryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { flex: 1, fontSize: 16, fontWeight: '500', color: '#fff' },
  defaultBadge: { fontSize: 12, color: '#4CAF50', backgroundColor: '#4CAF5020', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
});
