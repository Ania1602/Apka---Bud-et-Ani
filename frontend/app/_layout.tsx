import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
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
        <Stack.Screen name="accounts" />
        <Stack.Screen name="credits" />
        <Stack.Screen name="categories" />
      </Stack>
    </GestureHandlerRootView>
  );
}
