import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function More() {
  const sections = [
    { title: 'Zarządzanie', items: [
      { icon: 'wallet', title: 'Konta', subtitle: 'Zarządzaj swoimi kontami', color: '#D4AF37', route: '/accounts' },
      { icon: 'swap-horizontal', title: 'Przelewy', subtitle: 'Przelewaj między kontami', color: '#2196F3', route: '/transfer' },
      { icon: 'card', title: 'Kredyty', subtitle: 'Kredyty i pożyczki', color: '#1B2845', route: '/credits' },
      { icon: 'pricetags', title: 'Kategorie', subtitle: 'Kategorie wydatków i przychodów', color: '#FF9800', route: '/categories' },
      { icon: 'repeat', title: 'Płatności Cykliczne', subtitle: 'Stałe opłaty i przychody', color: '#9C27B0', route: '/recurring' },
    ]},
    { title: 'Cele i Eksport', items: [
      { icon: 'trophy', title: 'Cele Oszczędnościowe', subtitle: 'Planuj i śledź swoje cele', color: '#2C5F2D', route: '/savings-goals' },
      { icon: 'download', title: 'Eksport Danych', subtitle: 'Pobierz dane jako CSV', color: '#1B2845', route: '/export' },
    ]},
    { title: 'Bezpieczeństwo', items: [
      { icon: 'lock-closed', title: 'Blokada PIN', subtitle: 'Zabezpiecz aplikację kodem PIN', color: '#800020', route: '/settings' },
    ]},
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Więcej</Text>
        <Text style={s.headerSubtitle}>Opcje i ustawienia</Text>
      </View>
      <ScrollView style={s.content}>
        {sections.map((section, si) => (
          <View key={si} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.items.map((item, ii) => (
              <TouchableOpacity key={ii} style={s.menuItem} onPress={() => router.push(item.route as any)}>
                <View style={[s.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={s.menuContent}>
                  <Text style={s.menuTitle}>{item.title}</Text>
                  <Text style={s.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9B8B7E" />
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={s.aboutSection}>
          <Text style={s.aboutTitle}>Budżet Ani</Text>
          <Text style={s.aboutVersion}>Wersja 2.0.0</Text>
          <Text style={s.aboutText}>100% offline • Bezpieczna • Twoje dane zostają na urządzeniu</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  header: { padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#2A2520' },
  headerSubtitle: { fontSize: 14, color: '#6B5D52', marginTop: 4 },
  content: { flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9B8B7E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8 },
  menuIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#2A2520', marginBottom: 2 },
  menuSubtitle: { fontSize: 12, color: '#6B5D52' },
  aboutSection: { padding: 20, margin: 20, marginTop: 20, backgroundColor: '#FFF', borderRadius: 16, alignItems: 'center' },
  aboutTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A2520', marginBottom: 4 },
  aboutVersion: { fontSize: 13, color: '#D4AF37', marginBottom: 8 },
  aboutText: { fontSize: 12, color: '#6B5D52', textAlign: 'center' },
});
