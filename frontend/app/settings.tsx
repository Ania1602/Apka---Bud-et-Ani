import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { exportFullBackup, importFullBackup, exportToCSV, userSettingsDB } from '../lib/database';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function Settings() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [birthYear, setBirthYear] = useState('');

  useEffect(() => {
    userSettingsDB.get('birth_year').then(v => { if (v) setBirthYear(v); });
  }, []);

  const shareFile = async (content: string, fileName: string, mimeType: string) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      return true;
    }

    const file = new FileSystem.File(FileSystem.Paths.cache, fileName);
    await file.write(content);
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Eksportuj dane' });
      return true;
    }

    // Fallback: use React Native Share API (always works)
    await Share.share({
      message: content,
      title: fileName,
    });
    return true;
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const jsonData = await exportFullBackup();
      const date = new Date().toISOString().split('T')[0];
      await shareFile(jsonData, `budzetani_backup_${date}.json`, 'application/json');
      await userSettingsDB.set('last_backup', new Date().toISOString());
      Alert.alert('Sukces', 'Backup wyeksportowany');
    } catch (error) {
      console.error('Export backup error:', error);
      Alert.alert('Błąd', 'Nie udało się wyeksportować danych: ' + String(error));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setCsvLoading(true);
    try {
      const csv = await exportToCSV();
      const date = new Date().toISOString().split('T')[0];
      await shareFile(csv, `budzetani_export_${date}.csv`, 'text/csv');
      Alert.alert('Sukces', 'CSV wyeksportowany');
    } catch (error) {
      console.error('Export CSV error:', error);
      Alert.alert('Błąd', 'Nie udało się wyeksportować CSV: ' + String(error));
    } finally {
      setCsvLoading(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      const content = await new FileSystem.File(file.uri).text();
      try { JSON.parse(content); } catch { Alert.alert('Błąd', 'Niepoprawny plik JSON'); return; }
      Alert.alert('Importuj backup', 'Co chcesz zrobić z istniejącymi danymi?', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Nadpisz', style: 'destructive', onPress: async () => {
          setBackupLoading(true);
          try { await importFullBackup(content, 'overwrite'); Alert.alert('Sukces', 'Dane zostały nadpisane'); }
          catch (e) { Alert.alert('Błąd', 'Nie udało się zaimportować danych'); }
          finally { setBackupLoading(false); }
        }},
        { text: 'Dołącz', onPress: async () => {
          setBackupLoading(true);
          try { await importFullBackup(content, 'append'); Alert.alert('Sukces', 'Dane zostały dołączone'); }
          catch (e) { Alert.alert('Błąd', 'Nie udało się zaimportować danych'); }
          finally { setBackupLoading(false); }
        }},
      ]);
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Błąd', 'Nie udało się otworzyć pliku');
    }
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#2A2520" /></TouchableOpacity>
        <Text style={s.headerTitle}>Ustawienia</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        <Text style={s.sectionTitle}>Profil</Text>
        <View style={s.settingCard}>
          <View style={[s.settingRow, { paddingVertical: 12 }]}>
            <View style={[s.settingIcon, { backgroundColor: '#1565C020' }]}>
              <Ionicons name="calendar-outline" size={24} color="#1565C0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>Rok urodzenia</Text>
              <Text style={s.settingDesc}>Do obliczenia lat do emerytury</Text>
            </View>
            <TextInput style={{ backgroundColor: '#FAF8F3', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 16, color: '#2A2520', width: 80, textAlign: 'center', borderWidth: 1, borderColor: '#E0D5C7' }}
              value={birthYear} onChangeText={v => { const d = v.replace(/[^0-9]/g, '').slice(0, 4); setBirthYear(d); if (d.length === 4) userSettingsDB.set('birth_year', d); }}
              placeholder="np. 1990" placeholderTextColor="#9B8B7E" keyboardType="numeric" maxLength={4} />
          </View>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>Eksport danych</Text>

        <View style={s.settingCard}>
          <TouchableOpacity style={s.settingRow} onPress={handleExportBackup} disabled={backupLoading}>
            <View style={[s.settingIcon, { backgroundColor: '#2C5F2D20' }]}>
              {backupLoading ? <ActivityIndicator color="#2C5F2D" /> : <Ionicons name="cloud-upload" size={24} color="#2C5F2D" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>Eksportuj backup (JSON)</Text>
              <Text style={s.settingDesc}>Wszystkie dane do pliku JSON</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9B8B7E" />
          </TouchableOpacity>
        </View>

        <View style={s.settingCard}>
          <TouchableOpacity style={s.settingRow} onPress={handleExportCSV} disabled={csvLoading}>
            <View style={[s.settingIcon, { backgroundColor: '#D4AF3720' }]}>
              {csvLoading ? <ActivityIndicator color="#D4AF37" /> : <Ionicons name="document-text" size={24} color="#D4AF37" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>Eksportuj CSV</Text>
              <Text style={s.settingDesc}>Transakcje do Excela/Sheets</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9B8B7E" />
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>Import danych</Text>

        <View style={s.settingCard}>
          <TouchableOpacity style={s.settingRow} onPress={handleImportBackup} disabled={backupLoading}>
            <View style={[s.settingIcon, { backgroundColor: '#2196F320' }]}>
              {backupLoading ? <ActivityIndicator color="#2196F3" /> : <Ionicons name="cloud-download" size={24} color="#2196F3" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>Importuj backup</Text>
              <Text style={s.settingDesc}>Wczytaj dane z pliku JSON</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9B8B7E" />
          </TouchableOpacity>
        </View>

        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={s.infoText}>Dane są przechowywane lokalnie. Backup pozwala przenieść dane na inne urządzenie lub zabezpieczyć przed utratą.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F3' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2A2520' },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9B8B7E', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#80002020', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: '#2A2520' },
  settingDesc: { fontSize: 12, color: '#6B5D52', marginTop: 2 },
  infoCard: { flexDirection: 'row', backgroundColor: '#2196F320', padding: 16, borderRadius: 12, gap: 12, marginTop: 8 },
  infoText: { fontSize: 13, color: '#2196F3', flex: 1, lineHeight: 18 },
});
