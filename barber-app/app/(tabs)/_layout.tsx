// ============================================================
// BARBEAR-FLOW: Tab Layout (RBAC-aware)
// ============================================================

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';

export default function TabLayout() {
  const role = useAuthStore((s) => s.role);
  const isProfessional = role === 'professional';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#2d2d2d',
          borderTopColor: '#4b5563',
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isProfessional ? 'Resumo' : 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: isProfessional ? 'Minha Agenda' : 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: isProfessional ? 'Meus Clientes' : 'Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title: isProfessional ? 'Meu Financeiro' : 'Financeiro',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size} color={color} />
          ),
        }}
      />
      {/* Owner-only tabs */}
      <Tabs.Screen
        name="profissionais"
        options={{
          title: 'Equipe',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-circle" size={size} color={color} />
          ),
          href: isProfessional ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="produtos"
        options={{
          title: 'Produtos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
          href: isProfessional ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: isProfessional ? 'Meu Perfil' : 'Config',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={isProfessional ? 'person-circle' : 'settings'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
