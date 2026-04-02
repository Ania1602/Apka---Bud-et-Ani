import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportToCSV } from '../lib/database';

export default function ExportScreen() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const csv = await exportToCSV();
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'budzet_ani_export.csv'; a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Sukces', 'Plik CSV został pobrany');
      } else {
        const path = FileSystem.documentDirectory + 'budzet_ani_export.csv';
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Eksportuj Dane' });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Błąd', 'Nie udało się wyeksportować danych');
    } finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#2A2520" /></TouchableOpacity>
        <Text style={s.headerTitle}>Eksport Danych</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={s.content}>
        <View style={s.iconContainer}><Ionicons name="document-text" size={80} color="#D4AF37" /></View>
        <Text style={s.title}>Eksportuj do CSV</Text>
        <Text style={s.description}>Pobierz wszystkie transakcje, konta i kredyty w formacie CSV. Możesz otworzyć plik w Excelu lub Google Sheets.</Text>
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark" size={20} color="#2C5F2D" />
          <Text style={s.infoText}>Dane są generowane lokalnie na Twoim urządzeniu. Żadne informacje nie są wysyłane przez internet.</Text>
        </View>
        <TouchableOpacity style={[s.exportBtn, loading && { opacity: 0.5 }]} onPress={handleExport} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="download" size={22} color="#FFF" /><Text style={s.exportBtnText}>Pobierz CSV</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  content: { flex: 1, alignItems: 'center', padding: 40, paddingTop: 40 },
  iconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2A2520', marginBottom: 12 },
  description: { fontSize: 15, color: '#6B5D52', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  infoCard: { flexDirection: 'row', backgroundColor: '#2C5F2D15', padding: 16, borderRadius: 12, gap: 12, marginBottom: 32, borderLeftWidth: 4, borderLeftColor: '#2C5F2D' },
  infoText: { fontSize: 13, color: '#2C5F2D', flex: 1, lineHeight: 18 },
  exportBtn: { flexDirection: 'row', backgroundColor: '#D4AF37', padding: 18, borderRadius: 12, alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' },
  exportBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
