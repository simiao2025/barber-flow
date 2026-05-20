// ============================================================
// BARBEAR-FLOW: Root Layout com fonts, QueryClient, auth guard, notifications
// ============================================================

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { useAuthStore } from '../stores/auth.store';
import { View, ActivityIndicator, Platform } from 'react-native';

// Importações condicionais para web vs nativo
let SplashScreen: any = null;
if (Platform.OS !== 'web') {
  SplashScreen = require('expo-splash-screen');
  SplashScreen.preventAutoHideAsync?.();
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { initialize, session, isLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      await initialize();

      // Setup notificações apenas no mobile
      if (Platform.OS !== 'web' && session) {
        try {
          const { setupNotifications } = require('../lib/notifications');
          setupNotifications(router);
        } catch (e) {
          console.log('Notificações indisponíveis no web');
        }
      }

      setIsReady(true);

      // Hide splash screen apenas no mobile
      if (Platform.OS !== 'web' && SplashScreen?.hideAsync) {
        await SplashScreen.hideAsync();
      }
    };

    init();
  }, []);

  // Auth guard
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }

  }, [session, isReady]);

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="conversas" options={{ presentation: 'modal' }} />
        <Stack.Screen name="appointments/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="appointments/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="clients/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profissionais/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profissionais/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="servicos/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="servicos/new" options={{ presentation: 'modal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
