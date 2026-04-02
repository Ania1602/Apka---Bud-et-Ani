import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase, pinDB } from '../lib/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
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
        <Stack.Screen name="export" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="pin-lock" />
      </Stack>
    </GestureHandlerRootView>
  );
}
