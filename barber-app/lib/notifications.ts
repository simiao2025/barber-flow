// ============================================================
// BARBEAR-FLOW: Push Notifications
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';
import type { Router } from 'expo-router';

// Configuração de handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

/**
 * Solicita permissões e registra token
 */
export async function requestPermissionsAndGetToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Notificações não disponíveis em simulador');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de notificações negada');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id',
  })).data;

  return token;
}

/**
 * Registra token no Supabase
 */
export async function registerToken(token: string, barbershopId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return;

  await supabase
    .from('push_tokens')
    .upsert({
      owner_id: session.session.user.id,
      barbershop_id: barbershopId,
      expo_token: token,
      device_os: Platform.OS as 'ios' | 'android' | 'web',
    }, {
      onConflict: 'owner_id,device_os,expo_token',
    });
}

/**
 * Configura handlers de notificações
 */
export function setupNotificationHandlers(router: Router): () => void {
  // Toque na notificação
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const type = response.notification.request.content.data.type;

    switch (type) {
      case 'new_appointment':
        router.push('/(tabs)/agenda');
        break;
      case 'human_handoff':
        router.push('/conversas');
        break;
      case 'low_stock':
        router.push('/produtos');
        break;
      case 'daily_summary':
        router.push('/');
        break;
    }
  });

  return () => subscription.remove();
}

/**
 * Setup completo de notificações
 */
export async function setupNotifications(router: Router): Promise<void> {
  const token = await requestPermissionsAndGetToken();

  if (token) {
    const { barbershopId } = useAuthStore.getState();
    if (barbershopId) {
      await registerToken(token, barbershopId);
    }
  }

  setupNotificationHandlers(router);
}
