// ============================================================
// BARBEAR-FLOW: Tela de Configurações
// ============================================================

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { signOut } from '../../lib/supabase';

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function SettingItem({
  icon,
  iconColor,
  label,
  value,
  onPress,
  destructive = false,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text
          style={[
            styles.settingLabel,
            destructive && styles.settingLabelDestructive,
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color="#6b7280" />
        )}
      </View>
    </TouchableOpacity>
  );
}

function ToggleItem({
  icon,
  iconColor,
  label,
  value,
  onToggle,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onToggle}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={[styles.toggle, value ? styles.toggleActive : styles.toggleInactive]}>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// TELA PRINCIPAL
// ============================================================

export default function ConfigScreen() {
  const router = useRouter();
  const { user, barbershopName, barbershopPlan, signOut: signOutStore } = useAuthStore();

  const handleSignOut = async () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            signOutStore();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const planLabels = {
    free: 'Gratuito',
    basic: 'Básico',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      {/* Conta */}
      <Section title="Conta">
        <SettingItem
          icon="person"
          iconColor="#3b82f6"
          label="Email"
          value={user?.email || ''}
        />
        <SettingItem
          icon="business"
          iconColor="#f59e0b"
          label="Barbearia"
          value={barbershopName || ''}
        />
        <SettingItem
          icon="diamond"
          iconColor="#8b5cf6"
          label="Plano"
          value={barbershopPlan ? planLabels[barbershopPlan] : ''}
        />
      </Section>

      {/* Preferências */}
      <Section title="Preferências">
        <ToggleItem
          icon="notifications"
          iconColor="#10b981"
          label="Notificações Push"
          value={true}
          onToggle={() => {}}
        />
        <ToggleItem
          icon="moon"
          iconColor="#6366f1"
          label="Modo Escuro"
          value={true}
          onToggle={() => {}}
        />
        <SettingItem
          icon="language"
          iconColor="#06b6d4"
          label="Idioma"
          value="Português (BR)"
          onPress={() => {}}
        />
      </Section>

      {/* WhatsApp */}
      <Section title="WhatsApp">
        <SettingItem
          icon="logo-whatsapp"
          iconColor="#25D366"
          label="Status da Conexão"
          value="Conectado"
          onPress={() => {}}
        />
        <SettingItem
          icon="chatbubble"
          iconColor="#25D366"
          label="Agente IA"
          value="Ativo"
          onPress={() => {}}
        />
      </Section>

      {/* Suporte */}
      <Section title="Suporte">
        <SettingItem
          icon="help-circle"
          iconColor="#3b82f6"
          label="Central de Ajuda"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text"
          iconColor="#6366f1"
          label="Termos de Uso"
          onPress={() => {}}
        />
        <SettingItem
          icon="shield-checkmark"
          iconColor="#10b981"
          label="Política de Privacidade"
          onPress={() => {}}
        />
        <SettingItem
          icon="information-circle"
          iconColor="#6b7280"
          label="Versão do App"
          value="1.0.0"
        />
      </Section>

      {/* Zona de Perigo */}
      <Section title="">
        <SettingItem
          icon="log-out"
          iconColor="#ef4444"
          label="Sair da Conta"
          onPress={handleSignOut}
          destructive
        />
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#2d2d2d',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
  },
  settingLabelDestructive: {
    color: '#ef4444',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#9ca3af',
  },
  // Toggle
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#10b981',
  },
  toggleInactive: {
    backgroundColor: '#4b5563',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    alignSelf: 'flex-start',
  },
});
