import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function More() {
  const menuItems = [
    {
      icon: 'wallet',
      title: 'Konta',
      subtitle: 'Zarządzaj swoimi kontami',
      color: '#D4AF37',
      route: '/accounts',
    },
    {
      icon: 'card',
      title: 'Kredyty',
      subtitle: 'Kredyty i pożyczki',
      color: '#2196F3',
      route: '/credits',
    },
    {
      icon: 'pricetags',
      title: 'Kategorie',
      subtitle: 'Kategorie wydatków i przychodów',
      color: '#FF9800',
      route: '/categories',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Więcej</Text>
        <Text style={styles.headerSubtitle}>Dodatkowe opcje i ustawienia</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9B8B7E" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>Manager Budżetu</Text>
          <Text style={styles.aboutVersion}>Wersja 1.0.0</Text>
          <Text style={styles.aboutText}>
            Aplikacja do zarządzania budżetem domowym z obsługą wielu kont, kredytów, budżetów i płatności cyklicznych.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2A2520',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B5D52',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  menuSection: {
    padding: 20,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B5D52',
  },
  aboutSection: {
    padding: 20,
    margin: 20,
    marginTop: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A2520',
    marginBottom: 8,
  },
  aboutVersion: {
    fontSize: 14,
    color: '#D4AF37',
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 13,
    color: '#6B5D52',
    textAlign: 'center',
    lineHeight: 20,
  },
});
