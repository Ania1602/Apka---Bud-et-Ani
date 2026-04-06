import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Switch, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { pinDB, exportFullBackup, importFullBackup, exportToCSV } from '../lib/database';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';

export default function Settings() {
  const [hasPin, setHasPin] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => { pinDB.exists().then(setHasPin); }, []);

  const handleSetPin = async () => {
    if (pin.length < 4) { Alert.alert('Błąd', 'PIN musi mieć minimum 4 cyfry'); return; }
    if (pin !== confirmPin) { Alert.alert('Błąd', 'Kody PIN nie są identyczne'); return; }
    await pinDB.set(pin);
    setHasPin(true); setShowSetPin(false); setPin(''); setConfirmPin('');
    Alert.alert('Sukces', 'PIN został ustawiony');
  };

  const handleRemovePin = () => {
    Alert.alert('Usuń PIN', 'Czy na pewno chcesz wyłączyć blokadę PIN?', [
      { text: 'Anuluj' },
      { text: 'Wyłącz', style: 'destructive', onPress: async () => { await pinDB.remove(); setHasPin(false); } }
    ]);
  };

  const shareFile = async (content: string, fileName: string, mimeType: string) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      return true;
    }

    // Try multiple directory options
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    
    if (dir) {
      const filePath = dir + fileName;
      await FileSystem.writeAsStringAsync(filePath, content, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, { mimeType, dialogTitle: 'Eksportuj dane' });
      }
      return true;
    }

    // Last resort fallback: use IntentLauncher to create a viewable text
    const { startActivityAsync, ActivityAction } = await import('expo-intent-launcher');
    // Encode content as base64 data URI
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    const dataUri = `data:${mimeType};base64,${base64Content}`;
    await startActivityAsync(ActivityAction.SEND, {
      type: mimeType,
      extra: { 'android.intent.extra.TEXT': content },
    });
    return true;
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const jsonData = await exportFullBackup();
      const date = new Date().toISOString().split('T')[0];
      await shareFile(jsonData, `budzetani_backup_${date}.json`, 'application/json');
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
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
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
        <Text style={s.sectionTitle}>Bezpieczeństwo</Text>
        <View style={s.settingCard}>
          <View style={s.settingRow}>
            <View style={s.settingIcon}><Ionicons name="lock-closed" size={24} color="#800020" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.settingLabel}>Blokada PIN</Text>
              <Text style={s.settingDesc}>{hasPin ? 'Włączony' : 'Wyłączony'}</Text>
            </View>
            <Switch value={hasPin} onValueChange={(v) => { if (v) setShowSetPin(true); else handleRemovePin(); }}
              trackColor={{ false: '#E0D5C7', true: '#D4AF37' }} thumbColor="#FFF" />
          </View>
        </View>

        {showSetPin && (
          <View style={s.pinCard}>
            <Text style={s.pinTitle}>Ustaw nowy PIN</Text>
            <TextInput style={s.pinInput} value={pin} onChangeText={setPin} placeholder="Wpisz PIN (min. 4 cyfry)" placeholderTextColor="#9B8B7E" keyboardType="number-pad" secureTextEntry maxLength={6} />
            <TextInput style={s.pinInput} value={confirmPin} onChangeText={setConfirmPin} placeholder="Potwierdź PIN" placeholderTextColor="#9B8B7E" keyboardType="number-pad" secureTextEntry maxLength={6} />
            <View style={s.pinButtons}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowSetPin(false); setPin(''); setConfirmPin(''); }}>
                <Text style={s.cancelBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSetPin}>
                <Text style={s.saveBtnText}>Zapisz PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  pinCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  pinTitle: { fontSize: 16, fontWeight: '600', color: '#2A2520', marginBottom: 16 },
  pinInput: { backgroundColor: '#F5F1E8', borderRadius: 12, padding: 16, fontSize: 18, color: '#2A2520', marginBottom: 12, textAlign: 'center', letterSpacing: 8 },
  pinButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#F5F1E8', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#6B5D52' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#D4AF37', alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  infoCard: { flexDirection: 'row', backgroundColor: '#2196F320', padding: 16, borderRadius: 12, gap: 12, marginTop: 8 },
  infoText: { fontSize: 13, color: '#2196F3', flex: 1, lineHeight: 18 },
});
