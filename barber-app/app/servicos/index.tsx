// ============================================================
// BARBEAR-FLOW: Lista de Serviços
// ============================================================

import React from 'react';
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
import { useServices, useDeleteService } from '../../hooks/useServices';
import { useAuthStore } from '../../stores/auth.store';
import type { Service } from '../../types/database';

function ServiceCard({ service }: { service: Service }) {
  const router = useRouter();
  const deleteMutation = useDeleteService();

  const handleDelete = () => {
    Alert.alert(
      'Excluir Serviço',
      `Tem certeza que deseja excluir "${service.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(service.id);
              Alert.alert('Sucesso', 'Serviço excluído');
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const categoryLabels: Record<string, string> = {
    corte: 'Corte',
    barba: 'Barba',
    combo: 'Combo',
    sobrancelha: 'Sobrancelha',
    pigmentacao: 'Pigmentação',
    hidratacao: 'Hidratação',
    outro: 'Outro',
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/servicos/new',
          params: { id: service.id },
        } as any)
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{service.name}</Text>
          <Text style={styles.category}>
            {categoryLabels[service.category || 'outro'] || 'Outro'} • {service.duration_min} min
          </Text>
        </View>
        <Text style={styles.price}>R$ {service.price.toFixed(2)}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            router.push({
              pathname: '/servicos/new',
              params: { id: service.id },
            } as any)
          }
        >
          <Ionicons name="create" size={18} color="#f59e0b" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { marginLeft: 8 }]}
          onPress={() =>
            router.push({
              pathname: '/servicos/new',
              params: { id: service.id, toggleActive: 'true' },
            } as any)
          }
        >
          <Ionicons
            name={service.is_active ? 'eye-off' : 'eye'}
            size={18}
            color={service.is_active ? '#ef4444' : '#10b981'}
          />
          <Text
            style={[
              styles.actionText,
              { color: service.is_active ? '#ef4444' : '#10b981' },
            ]}
          >
            {service.is_active ? 'Desativar' : 'Ativar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { marginLeft: 8 }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash" size={18} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ServicosScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const { data: services, isLoading, refetch } = useServices(
    barbershopId || ''
  );

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
        <Text style={styles.headerTitle}>Serviços</Text>
        <TouchableOpacity
          onPress={() => router.push('/servicos/new' as any)}
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
          data={services || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ServiceCard service={item} />}
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
              <Ionicons name="cut" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>Nenhum serviço cadastrado</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/servicos/new' as any)}
              >
                <Text style={styles.emptyButtonText}>Adicionar Serviço</Text>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  category: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#3d3d3d',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
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
