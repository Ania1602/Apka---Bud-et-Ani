import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase, pinDB } from '../lib/database';
import { rescheduleRecurringReminders } from '../lib/notifications';
import PinLock from '../components/PinLock';

// Short trips out of the app (file picker, share sheet, biometric prompt) don't re-lock it
const RELOCK_AFTER_MS = 60 * 1000;

export default function RootLayout() {
  // null = not checked yet; cover the app so data doesn't flash before the lock appears
  const [locked, setLocked] = useState<boolean | null>(null);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    initDatabase().then(() => rescheduleRecurringReminders());
    pinDB.exists().then(setLocked);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away >= RELOCK_AFTER_MS && await pinDB.exists()) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-account" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-credit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-budget" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-recurring" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-category" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-goal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="accounts" />
        <Stack.Screen name="credits" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="recurring" />
        <Stack.Screen name="savings-goals" />
        <Stack.Screen name="settings" />
      </Stack>
      {locked === null && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FAF8F3', zIndex: 1000 }]} />}
      {locked && <PinLock onUnlock={() => setLocked(false)} />}
    </GestureHandlerRootView>
  );
}
