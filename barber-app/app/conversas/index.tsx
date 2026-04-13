// ============================================================
// BARBEAR-FLOW: Tela de Lista de Conversas do Agente
// ============================================================

import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '../../hooks/useConversation';
import { useAuthStore } from '../../stores/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ConversasListScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const { data: conversations, isLoading, refetch } = useConversations(barbershopId || '');

  // Realtime
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_conversations',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const waitingHumanCount = conversations?.filter((c: any) => c.waiting_human)?.length || 0;

  const renderItem = ({ item }: { item: any }) => {
    const lastMessage = item.messages?.[item.messages.length - 1];
    const preview = lastMessage?.content?.substring(0, 50) || 'Sem mensagens';
    const time = item.updated_at
      ? formatDistanceToNow(new Date(item.updated_at), { locale: ptBR, addSuffix: true })
      : '';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`/conversas/${item.phone}`)}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(item.clients?.name || item.phone).substring(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.clients?.name || item.phone}
            </Text>
            <Text style={styles.timeText}>{time}</Text>
          </View>
          <Text style={styles.previewText} numberOfLines={1}>
            {preview}
          </Text>
        </View>

        {/* Badges */}
        <View style={styles.badgesContainer}>
          {item.waiting_human && (
            <View style={[styles.badge, styles.badgeYellow]}>
              <Text style={styles.badgeText}>Humano</Text>
            </View>
          )}
          {item.manual_mode && (
            <View style={[styles.badge, styles.badgeGray]}>
              <Text style={styles.badgeText}>Manual</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header com contador de aguardando humano */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversas</Text>
        {waitingHumanCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{waitingHumanCount}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        </View>
      ) : conversations && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#f59e0b" />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color="#4b5563" />
          <Text style={styles.emptyText}>Nenhuma conversa nas últimas 24h</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  timeText: {
    fontSize: 11,
    color: '#6b7280',
  },
  previewText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  badgesContainer: {
    gap: 4,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeYellow: {
    backgroundColor: '#fbbf24',
  },
  badgeGray: {
    backgroundColor: '#6b7280',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});
