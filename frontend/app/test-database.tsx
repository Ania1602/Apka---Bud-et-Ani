import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { runDatabaseTests } from '../lib/database-test';

export default function TestDatabase() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    // Capture console.log
    const originalLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args) => {
      const message = args.join(' ');
      logs.push(message);
      setResults([...logs]);
      originalLog(...args);
    };
    
    try {
      await runDatabaseTests();
    } catch (error) {
      logs.push(`❌ Error: ${error}`);
      setResults([...logs]);
    }
    
    console.log = originalLog;
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Test Bazy Danych</Text>
        <Text style={styles.subtitle}>Offline SQLite Database</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runTests}
        disabled={testing}
      >
        {testing ? (
          <>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.buttonText}>Testowanie...</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>▶ Uruchom Testy</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.results}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C7',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B5D52',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#D4AF37',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
    backgroundColor: '#2A2520',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#F5F1E8',
    marginBottom: 4,
    lineHeight: 18,
  },
});
