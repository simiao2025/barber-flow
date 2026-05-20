// ============================================================
// BARBEAR-FLOW: Gerenciamento da Equipe (Owner-Only)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useAuthStore } from '../../stores/auth.store';
import type { Professional } from '../../types/database';

const AGENT_SERVER_URL = 'http://localhost:3000';

function ProfessionalCard({
  professional,
  onCreateLogin,
  onRevokeLogin,
}: {
  professional: Professional;
  onCreateLogin: (prof: Professional) => void;
  onRevokeLogin: (prof: Professional) => void;
}) {
  const router = useRouter();
  const hasLogin = !!professional.user_id;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {professional.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{professional.name}</Text>
          <Text style={styles.commission}>Comissão: {professional.commission_pct}%</Text>
        </View>
        
        {/* Status Badge */}
        <View style={[styles.badge, hasLogin ? styles.badgeGreen : styles.badgeGray]}>
          <Text style={hasLogin ? styles.badgeTextGreen : styles.badgeTextGray}>
            {hasLogin ? 'Com Login' : 'Sem Login'}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            router.push({
              pathname: '/profissionais/new',
              params: { id: professional.id },
            } as any)
          }
        >
          <Ionicons name="create-outline" size={18} color="#f59e0b" />
          <Text style={styles.actionText}>Editar Cadastro</Text>
        </TouchableOpacity>

        {hasLogin ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.revokeButton]}
            onPress={() => onRevokeLogin(professional)}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={[styles.actionText, styles.revokeText]}>Revogar Login</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.createLoginButton]}
            onPress={() => onCreateLogin(professional)}
          >
            <Ionicons name="key-outline" size={18} color="#10b981" />
            <Text style={[styles.actionText, styles.createLoginText]}>Criar Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TeamManagementScreen() {
  const router = useRouter();
  const barbershopId = useAuthStore((s) => s.barbershopId);
  const { data: professionals, isLoading, refetch } = useProfessionals(barbershopId || '');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onRefresh = async () => {
    await refetch();
  };

  const handleCreateLoginClick = (prof: Professional) => {
    setSelectedProf(prof);
    setEmail('');
    setPassword('');
    setModalVisible(true);
  };

  const submitCreateLogin = async () => {
    if (!selectedProf) return;
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/api/professionals/${selectedProf.id}/create-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar login');
      }

      Alert.alert('Sucesso', `Login criado com sucesso para o profissional ${selectedProf.name}!`);
      setModalVisible(false);
      refetch();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao conectar com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeLogin = (prof: Professional) => {
    Alert.alert(
      'Revogar Acesso',
      `Tem certeza que deseja revogar o login de ${prof.name}? Ele não poderá mais acessar o aplicativo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revogar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${AGENT_SERVER_URL}/api/professionals/${prof.id}/revoke-login`, {
                method: 'DELETE',
              });
              const result = await response.json();
              if (!response.ok) {
                throw new Error(result.error || 'Erro ao revogar login');
              }
              Alert.alert('Sucesso', 'Acesso revogado com sucesso!');
              refetch();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Falha ao revogar login.');
            }
          },
        },
      ]
    );
  };

  if (!barbershopId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Equipe & Acessos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/profissionais/new' as any)}
        >
          <Ionicons name="add" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={professionals || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProfessionalCard
              professional={item}
              onCreateLogin={handleCreateLoginClick}
              onRevokeLogin={handleRevokeLogin}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor="#f59e0b"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>Nenhum profissional cadastrado</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/profissionais/new' as any)}
              >
                <Text style={styles.emptyButtonText}>Adicionar Profissional</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal Criar Login */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Criar Login de Profissional</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSub}>
              Crie credenciais para <Text style={{ fontWeight: 'bold', color: '#f59e0b' }}>{selectedProf?.name}</Text>. Ele terá acesso somente leitura à agenda, clientes e financeiro dele.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: profissional@email.com"
                placeholderTextColor="#6b7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Senha Temporária</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={submitCreateLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <Text style={styles.submitButtonText}>Confirmar e Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  commission: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeGreen: {
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b98140',
  },
  badgeGray: {
    backgroundColor: '#4b556320',
    borderWidth: 1,
    borderColor: '#4b556340',
  },
  badgeTextGreen: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextGray: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#3d3d3d',
    paddingTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3d3d3d',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  createLoginButton: {
    backgroundColor: '#10b98115',
  },
  createLoginText: {
    color: '#10b981',
  },
  revokeButton: {
    backgroundColor: '#ef444415',
  },
  revokeText: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalSub: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  submitButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '700',
  },
});
