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
  // Web fallback - usa localStorage com check de SSR
  storage = {
    getString: (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    },
    set: (key: string, value: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    },
    delete: (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    },
  };
}

interface AuthState {
  session: Session | null;
  barbershopId: string | null;
  barbershopName: string | null;
  barbershopPlan: string | null;
  isLoading: boolean;
  error: string | null;
  user: import('@supabase/supabase-js').User | null;
  barbershopCreatedAt: string | null;
  role: 'owner' | 'professional' | null;
  professionalId: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setBarbershopId: (id: string) => void;
  setBarbershopName: (name: string) => void;
  setBarbershopPlan: (plan: string) => void;
  setBarbershopCreatedAt: (date: string) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  barbershopId: storage.getString('barbershopId') || null,
  barbershopName: storage.getString('barbershopName') || null,
  barbershopPlan: storage.getString('barbershopPlan') || null,
  barbershopCreatedAt: storage.getString('barbershopCreatedAt') || null,
  role: (storage.getString('userRole') as 'owner' | 'professional' | null) || null,
  professionalId: storage.getString('professionalId') || null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let barbershopInfo: any = { id: null, name: null, plan: 'free', created_at: null };
      let userRole: 'owner' | 'professional' | null = null;
      let userProfessionalId: string | null = null;
      
      if (session) {
        // Buscar o perfil do usuário para RBAC
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, professional_id, barbershop_id')
          .eq('user_id', session.user.id)
          .single();
        
        if (profile) {
          userRole = profile.role as 'owner' | 'professional';
          userProfessionalId = profile.professional_id || null;
          storage.set('userRole', profile.role);
          if (profile.professional_id) {
            storage.set('professionalId', profile.professional_id);
          } else {
            storage.delete('professionalId');
          }

          if (profile.role === 'professional') {
            const { data: bsData } = await supabase
              .from('barbershops')
              .select('id, name, plan, created_at')
              .eq('id', profile.barbershop_id)
              .single();
            if (bsData) {
              barbershopInfo = bsData;
              storage.set('barbershopId', bsData.id);
              storage.set('barbershopName', bsData.name);
              storage.set('barbershopPlan', bsData.plan);
              storage.set('barbershopCreatedAt', bsData.created_at);
            }
          } else {
            const { data: bsData } = await supabase
              .from('barbershops')
              .select('id, name, plan, created_at')
              .eq('owner_id', session.user.id)
              .single();
            if (bsData) {
              barbershopInfo = bsData;
              storage.set('barbershopId', bsData.id);
              storage.set('barbershopName', bsData.name);
              storage.set('barbershopPlan', bsData.plan);
              storage.set('barbershopCreatedAt', bsData.created_at);
            }
          }
        } else {
          userRole = 'owner';
          storage.set('userRole', 'owner');
          storage.delete('professionalId');

          const { data: bsData } = await supabase
            .from('barbershops')
            .select('id, name, plan, created_at')
            .eq('owner_id', session.user.id)
            .single();
          
          if (bsData) {
            barbershopInfo = bsData;
            storage.set('barbershopId', bsData.id);
            storage.set('barbershopName', bsData.name);
            storage.set('barbershopPlan', bsData.plan);
            storage.set('barbershopCreatedAt', bsData.created_at);
          }
        }
      }

      set({ 
        session, 
        user: session?.user || null, 
        barbershopId: barbershopInfo.id,
        barbershopName: barbershopInfo.name,
        barbershopPlan: barbershopInfo.plan as any,
        barbershopCreatedAt: barbershopInfo.created_at || null,
        role: userRole,
        professionalId: userProfessionalId,
        isLoading: false 
      });

      // Listener de mudanças de auth
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session) {
          storage.delete('barbershopId');
          storage.delete('barbershopName');
          storage.delete('barbershopPlan');
          storage.delete('barbershopCreatedAt');
          storage.delete('userRole');
          storage.delete('professionalId');
          set({ 
            session: null, 
            user: null, 
            barbershopId: null, 
            barbershopName: null, 
            barbershopPlan: null,
            barbershopCreatedAt: null,
            role: null,
            professionalId: null
          });
        } else {
          set({ session, user: session.user });
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
      
      let barbershopInfo: any = { id: null, name: null, plan: 'free', created_at: null };
      let userRole: 'owner' | 'professional' | null = null;
      let userProfessionalId: string | null = null;

      if (data.session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, professional_id, barbershop_id')
          .eq('user_id', data.session.user.id)
          .single();

        if (profile) {
          userRole = profile.role as 'owner' | 'professional';
          userProfessionalId = profile.professional_id || null;
          storage.set('userRole', profile.role);
          if (profile.professional_id) {
            storage.set('professionalId', profile.professional_id);
          } else {
            storage.delete('professionalId');
          }

          if (profile.role === 'professional') {
            const { data: bsData } = await supabase
              .from('barbershops')
              .select('id, name, plan, created_at')
              .eq('id', profile.barbershop_id)
              .single();
            if (bsData) {
              barbershopInfo = bsData;
              storage.set('barbershopId', bsData.id);
              storage.set('barbershopName', bsData.name);
              storage.set('barbershopPlan', bsData.plan);
              storage.set('barbershopCreatedAt', bsData.created_at);
            }
          } else {
            const { data: bsData } = await supabase
              .from('barbershops')
              .select('id, name, plan, created_at')
              .eq('owner_id', data.session.user.id)
              .single();
            if (bsData) {
              barbershopInfo = bsData;
              storage.set('barbershopId', bsData.id);
              storage.set('barbershopName', bsData.name);
              storage.set('barbershopPlan', bsData.plan);
              storage.set('barbershopCreatedAt', bsData.created_at);
            }
          }
        } else {
          userRole = 'owner';
          storage.set('userRole', 'owner');
          storage.delete('professionalId');

          const { data: bsData } = await supabase
            .from('barbershops')
            .select('id, name, plan, created_at')
            .eq('owner_id', data.session.user.id)
            .single();
          
          if (bsData) {
            barbershopInfo = bsData;
            storage.set('barbershopId', bsData.id);
            storage.set('barbershopName', bsData.name);
            storage.set('barbershopPlan', bsData.plan);
            storage.set('barbershopCreatedAt', bsData.created_at);
          }
        }
      }

      set({ 
        session: data.session, 
        user: data.session.user,
        barbershopId: barbershopInfo.id,
        barbershopName: barbershopInfo.name,
        barbershopPlan: barbershopInfo.plan as any,
        barbershopCreatedAt: barbershopInfo.created_at || null,
        role: userRole,
        professionalId: userProfessionalId,
        isLoading: false 
      });
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
      storage.delete('barbershopName');
      storage.delete('barbershopPlan');
      storage.delete('barbershopCreatedAt');
      storage.delete('userRole');
      storage.delete('professionalId');
      set({ 
        session: null, 
        user: null,
        barbershopId: null, 
        barbershopName: null, 
        barbershopPlan: null,
        barbershopCreatedAt: null,
        role: null,
        professionalId: null
      });
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

  signOut: async () => {
    try {
      await signOut();
      storage.delete('barbershopId');
      storage.delete('barbershopName');
      storage.delete('barbershopPlan');
      storage.delete('barbershopCreatedAt');
      storage.delete('userRole');
      storage.delete('professionalId');
      set({ 
        session: null, 
        user: null,
        barbershopId: null, 
        barbershopName: null, 
        barbershopPlan: null,
        barbershopCreatedAt: null,
        role: null,
        professionalId: null
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao sair' });
      throw error;
    }
  },

  setBarbershopName: (name) => {
    storage.set('barbershopName', name);
    set({ barbershopName: name });
  },

  setBarbershopPlan: (plan) => {
    storage.set('barbershopPlan', plan);
    set({ barbershopPlan: plan });
  },

  setBarbershopCreatedAt: (date) => {
    storage.set('barbershopCreatedAt', date);
    set({ barbershopCreatedAt: date });
  },
}));
