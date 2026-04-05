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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { categoriesDB } from '../lib/database';

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [editingSub, setEditingSub] = useState<{ catId: string; subId: string; name: string } | null>(null);

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

  useFocusEffect(useCallback(() => { fetchCategories(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchCategories(); };

  const deleteCategory = async (id: string, name: string, isDefault: boolean) => {
    if (isDefault) { Alert.alert('Błąd', 'Nie można usunąć domyślnej kategorii'); return; }
    Alert.alert('Usuń kategorię', `Czy na pewno chcesz usunąć kategorię "${name}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await categoriesDB.delete(id); fetchCategories();
      }},
    ]);
  };

  const handleAddSubcategory = async (catId: string) => {
    if (!newSubName.trim()) return;
    await categoriesDB.addSubcategory(catId, newSubName.trim());
    setNewSubName('');
    setAddingSubTo(null);
    fetchCategories();
  };

  const handleEditSubcategory = async () => {
    if (!editingSub || !editingSub.name.trim()) return;
    await categoriesDB.updateSubcategory(editingSub.catId, editingSub.subId, editingSub.name.trim());
    setEditingSub(null);
    fetchCategories();
  };

  const handleDeleteSubcategory = (catId: string, subId: string, subName: string) => {
    Alert.alert('Usuń podkategorię', `Usunąć "${subName}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await categoriesDB.deleteSubcategory(catId, subId); fetchCategories();
      }},
    ]);
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#D4AF37" /></View>;
  }

  const renderCategory = (cat: any) => {
    const isExpanded = expandedId === cat.id;
    const subs = cat.subcategories || [];
    const isAddingSub = addingSubTo === cat.id;

    return (
      <View key={cat.id} style={styles.catBlock}>
        <TouchableOpacity
          style={styles.categoryItem}
          onPress={() => setExpandedId(isExpanded ? null : cat.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
            <Ionicons name={(cat.icon || 'pricetag') as any} size={22} color={cat.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            {subs.length > 0 && <Text style={styles.subCount}>{subs.length} podkat.</Text>}
            {cat.is_default && <Text style={styles.defaultBadge}>Domyslna</Text>}
          </View>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9B8B7E" />
          {!cat.is_default && (
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => router.push(`/add-category?edit=${cat.id}&name=${encodeURIComponent(cat.name)}&type=${cat.type}&color=${encodeURIComponent(cat.color)}&icon=${encodeURIComponent(cat.icon || 'pricetag')}`)} style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#D4AF37" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCategory(cat.id, cat.name, cat.is_default)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={16} color="#800020" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.subSection}>
            {subs.map((sub: any) => (
              <View key={sub.id} style={styles.subItem}>
                {editingSub?.subId === sub.id ? (
                  <View style={styles.subEditRow}>
                    <TextInput
                      style={styles.subEditInput}
                      value={editingSub.name}
                      onChangeText={(t) => setEditingSub({ ...editingSub, name: t })}
                      autoFocus
                      onSubmitEditing={handleEditSubcategory}
                    />
                    <TouchableOpacity onPress={handleEditSubcategory} style={styles.subSaveBtn}>
                      <Ionicons name="checkmark" size={18} color="#2C5F2D" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingSub(null)} style={styles.subCancelBtn}>
                      <Ionicons name="close" size={18} color="#800020" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.subDot} />
                    <Text style={styles.subName}>{sub.name}</Text>
                    <TouchableOpacity onPress={() => setEditingSub({ catId: cat.id, subId: sub.id, name: sub.name })} style={styles.subActionBtn}>
                      <Ionicons name="pencil" size={14} color="#D4AF37" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSubcategory(cat.id, sub.id, sub.name)} style={styles.subActionBtn}>
                      <Ionicons name="trash-outline" size={14} color="#800020" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}

            {isAddingSub ? (
              <View style={styles.subAddRow}>
                <TextInput
                  style={styles.subAddInput}
                  value={newSubName}
                  onChangeText={setNewSubName}
                  placeholder="Nazwa podkategorii..."
                  placeholderTextColor="#9B8B7E"
                  autoFocus
                  onSubmitEditing={() => handleAddSubcategory(cat.id)}
                />
                <TouchableOpacity onPress={() => handleAddSubcategory(cat.id)} style={styles.subSaveBtn}>
                  <Ionicons name="checkmark" size={18} color="#2C5F2D" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAddingSubTo(null); setNewSubName(''); }} style={styles.subCancelBtn}>
                  <Ionicons name="close" size={18} color="#800020" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addSubBtn} onPress={() => { setAddingSubTo(cat.id); setNewSubName(''); }}>
                <Ionicons name="add-circle-outline" size={16} color="#D4AF37" />
                <Text style={styles.addSubBtnText}>Dodaj podkategorię</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((cat: any) => renderCategory(cat))}
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
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F3' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0D5C7' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  addHeaderButton: { padding: 4 },
  listContent: { padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2A2520', marginBottom: 16, letterSpacing: -0.3 },
  catBlock: { marginBottom: 8 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0D5C7' },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryName: { fontSize: 15, fontWeight: '500', color: '#2A2520' },
  subCount: { fontSize: 11, color: '#9B8B7E', backgroundColor: '#F5F1E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  defaultBadge: { fontSize: 11, color: '#2C5F2D', backgroundColor: '#2C5F2D20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: '500', overflow: 'hidden' },
  actionButtons: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  editButton: { padding: 6 },
  deleteButton: { padding: 6 },
  subSection: { marginLeft: 20, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E0D5C7', marginTop: 4 },
  subItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, gap: 8 },
  subDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4AF37' },
  subName: { flex: 1, fontSize: 14, color: '#2A2520' },
  subActionBtn: { padding: 6 },
  subEditRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  subEditInput: { flex: 1, backgroundColor: '#FAF8F3', borderRadius: 8, padding: 8, fontSize: 14, color: '#2A2520', borderWidth: 1, borderColor: '#D4AF37' },
  subSaveBtn: { padding: 6, backgroundColor: '#2C5F2D15', borderRadius: 8 },
  subCancelBtn: { padding: 6, backgroundColor: '#80002015', borderRadius: 8 },
  subAddRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 8 },
  subAddInput: { flex: 1, backgroundColor: '#FAF8F3', borderRadius: 8, padding: 8, fontSize: 14, color: '#2A2520', borderWidth: 1, borderColor: '#E0D5C7' },
  addSubBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 8, marginTop: 4 },
  addSubBtnText: { fontSize: 13, color: '#D4AF37', fontWeight: '500' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
