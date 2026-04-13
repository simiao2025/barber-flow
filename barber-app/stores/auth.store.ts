// ============================================================
// BARBEAR-FLOW: Auth Store (Zustand + MMKV)
// ============================================================

import { create } from 'zustand';
import { Platform } from 'react-native';
import { supabase, signIn, signOut } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Storage adapter condicional
let storage: any = null;
if (Platform.OS !== 'web') {
  try {
    const { MMKV } = require('react-native-mmkv');
    storage = new MMKV({ id: 'barber-flow-storage' });
  } catch (e) {
    console.log('MMKV indisponível, usando fallback');
    storage = {
      getString: (key: string) => null,
      set: (key: string, value: string) => {},
      delete: (key: string) => {},
    };
  }
} else {
  // Web fallback - usa localStorage
  storage = {
    getString: (key: string) => localStorage.getItem(key),
    set: (key: string, value: string) => localStorage.setItem(key, value),
    delete: (key: string) => localStorage.removeItem(key),
  };
}

interface AuthState {
  session: Session | null;
  barbershopId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setBarbershopId: (id: string) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  barbershopId: storage.getString('barbershopId') || null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, isLoading: false });

      // Listener de mudanças de auth
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
        if (session) {
          storage.set('barbershopId', session.user.id);
        } else {
          storage.delete('barbershopId');
        }
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao inicializar',
        isLoading: false,
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      set({ session: data.session, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao fazer login',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut();
      storage.delete('barbershopId');
      set({ session: null, barbershopId: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao sair' });
      throw error;
    }
  },

  setSession: (session) => set({ session }),

  setBarbershopId: (id) => {
    storage.set('barbershopId', id);
    set({ barbershopId: id });
  },

  clearError: () => set({ error: null }),
}));
