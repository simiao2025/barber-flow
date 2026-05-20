// ============================================================
// BARBEAR-FLOW: Tela de Clientes — Lista, Busca e Filtros
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClients, type ClientFilter } from '../../hooks/useClients';
import { useAuthStore } from '../../stores/auth.store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client } from '../../types/database';

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function ClientCard({ client }: { client: Client }) {
  const daysSinceLastVisit = client.last_visit_at
    ? Math.floor(
        (Date.now() - new Date(client.last_visit_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const isInactive =
    daysSinceLastVisit !== null && daysSinceLastVisit > 30;

  return (
    <View style={styles.clientCard}>
      <View style={styles.clientHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.phone && (
            <Text style={styles.clientPhone}>{client.phone}</Text>
          )}
        </View>
        {isInactive && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inativo</Text>
          </View>
        )}
      </View>

      <View style={styles.clientStats}>
        <View style={styles.stat}>
          <Ionicons name="calendar" size={16} color="#9ca3af" />
          <Text style={styles.statText}>
            {client.total_visits} visita{client.total_visits !== 1 ? 's' : ''}
          </Text>
        </View>
        {client.last_visit_at && (
          <View style={styles.stat}>
            <Ionicons name="time" size={16} color="#9ca3af" />
            <Text style={styles.statText}>
              {daysSinceLastVisit !== null
                ? daysSinceLastVisit === 0
                  ? 'Hoje'
                  : `${daysSinceLastVisit}d atrás`
                : 'Nunca'}
            </Text>
          </View>
        )}
        {client.email && (
          <View style={styles.stat}>
            <Ionicons name="mail" size={16} color="#9ca3af" />
            <Text style={styles.statText} numberOfLines={1}>
              {client.email}
            </Text>
          </View>
        )}
      </View>

      {client.notes && (
        <Text style={styles.clientNotes} numberOfLines={2}>
          {client.notes}
        </Text>
      )}
    </View>
  );
}

// ============================================================
// TELA PRINCIPAL
// ============================================================

export default function ClientesScreen() {
  const router = useRouter();
  const { barbershopId, role, professionalId } = useAuthStore();
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [search, setSearch] = useState('');

  const { data: clients, isLoading, refetch } = useClients(
    barbershopId || '',
    filter,
    search || undefined,
    role === 'professional' ? professionalId : null
  );

  const filters: { key: ClientFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Todos', icon: 'people' },
    { key: 'active', label: 'Ativos', icon: 'checkmark-circle' },
    { key: 'inactive', label: 'Inativos', icon: 'time' },
  ];

  const onRefresh = async () => {
    await refetch();
  };

  if (!barbershopId) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clientes</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={styles.headerCount}>
            {clients ? `${clients.length} clientes` : ''}
          </Text>
          {role !== 'professional' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/clients/new' as any)}
            >
              <Ionicons name="add" size={24} color="#f59e0b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou telefone..."
          placeholderTextColor="#6b7280"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons
              name={f.icon as any}
              size={16}
              color={filter === f.key ? '#1a1a1a' : '#9ca3af'}
            />
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      ) : (
        <FlatList
          data={clients || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClientCard client={item} />}
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
              <Text style={styles.emptyText}>
                {search
                  ? 'Nenhum cliente encontrado'
                  : 'Nenhum cliente cadastrado'}
              </Text>
            </View>
          }
        />
      )}
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#3d3d3d',
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  filterTextActive: {
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  clientCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clientPhone: {
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
  clientStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  clientNotes: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
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
});
