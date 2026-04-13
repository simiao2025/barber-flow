// ============================================================
// BARBEAR-FLOW: Lista de Profissionais
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfessionals, useDeleteProfessional } from '../../hooks/useProfessionals';
import { useAuthStore } from '../../stores/auth.store';
import type { Professional } from '../../types/database';

function ProfessionalCard({
  professional,
  onDelete,
}: {
  professional: Professional;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/profissionais/new',
          params: { id: professional.id },
        } as any)
      }
    >
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
        {!professional.is_active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inativo</Text>
          </View>
        )}
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
          <Ionicons name="create" size={18} color="#f59e0b" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        {professional.is_active ? (
          <TouchableOpacity
            style={[styles.actionButton, { marginLeft: 8 }]}
            onPress={() => onDelete(professional.id)}
          >
            <Ionicons name="toggle" size={18} color="#ef4444" />
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Desativar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfissionaisScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const { data: professionals, isLoading, refetch } = useProfessionals(
    barbershopId || ''
  );
  const deleteMutation = useDeleteProfessional();

  const handleDelete = (id: string) => {
    Alert.alert(
      'Desativar Profissional',
      'Tem certeza que deseja desativar este profissional?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(id);
              Alert.alert('Sucesso', 'Profissional desativado');
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    await refetch();
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profissionais</Text>
        <TouchableOpacity
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
            <ProfessionalCard professional={item} onDelete={handleDelete} />
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
    paddingVertical: 16,
    backgroundColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  inactiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ef444420',
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#3d3d3d',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
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
});
