// ============================================================
// BARBEAR-FLOW: Detalhe do Agendamento
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '../../types/database';

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const { id } = useLocalSearchParams();
  const appointmentId = id as string;

  const { data: appointment, isLoading, refetch } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients(name, phone, email),
          professionals(name, avatar_url)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      return data as Appointment & {
        clients?: { name: string; phone?: string; email?: string };
        professionals?: { name: string; avatar_url?: string };
      };
    },
    enabled: !!appointmentId,
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return;

    Alert.alert(
      'Confirmar',
      `Mudar status para "${newStatus === 'done' ? 'Finalizado' : newStatus === 'cancelled' ? 'Cancelado' : newStatus}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const { error } = await supabase
              .from('appointments')
              .update({ status: newStatus as any })
              .eq('id', appointment.id);

            if (error) {
              Alert.alert('Erro', error.message);
            } else {
              Alert.alert('Sucesso', 'Status atualizado');
              refetch();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#6b7280" />
          <Text style={styles.errorText}>Agendamento não encontrado</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusColors = {
    pending: '#fbbf24',
    confirmed: '#3b82f6',
    done: '#10b981',
    cancelled: '#6b7280',
    no_show: '#ef4444',
  };

  const statusLabels = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    done: 'Finalizado',
    cancelled: 'Cancelado',
    no_show: 'Não compareceu',
  };

  const time = format(new Date(appointment.scheduled_at), 'HH:mm');
  const date = format(new Date(appointment.scheduled_at), "dd 'de' MMMM', às' HH:mm", { locale: ptBR });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: (statusColors[appointment.status] || '#6b7280') + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: statusColors[appointment.status] || '#6b7280' },
              ]}
            >
              {statusLabels[appointment.status]}
            </Text>
          </View>
        </View>

        {/* Data e Hora */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="calendar" size={20} color="#f59e0b" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Data e Hora</Text>
              <Text style={styles.cardValue}>{date}</Text>
            </View>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="person" size={20} color="#3b82f6" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Cliente</Text>
              <Text style={styles.cardValue}>{appointment.clients?.name || 'N/A'}</Text>
              {appointment.clients?.phone && (
                <Text style={styles.cardSubtext}>{appointment.clients.phone}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Profissional */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="scissors" size={20} color="#8b5cf6" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Profissional</Text>
              <Text style={styles.cardValue}>{appointment.professionals?.name || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Valor e Duração */}
        <View style={styles.row}>
          <View style={[styles.card, { flex: 1, marginRight: 4 }]}>
            <Text style={styles.cardLabel}>Valor</Text>
            <Text style={[styles.cardValue, { color: '#10b981' }]}>
              R$ {appointment.total_price.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.card, { flex: 1, marginLeft: 4 }]}>
            <Text style={styles.cardLabel}>Duração</Text>
            <Text style={styles.cardValue}>{appointment.duration_min} min</Text>
          </View>
        </View>

        {/* Origem */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="share" size={20} color="#06b6d4" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Origem</Text>
              <Text style={styles.cardValue}>
                {appointment.source === 'whatsapp'
                  ? 'WhatsApp (IA)'
                  : appointment.source === 'app'
                  ? 'App Mobile'
                  : 'Manual'}
              </Text>
            </View>
          </View>
        </View>

        {/* Observações */}
        {appointment.notes && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Observações</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Ações */}
      {appointment.status !== 'done' && appointment.status !== 'cancelled' && (
        <View style={styles.footer}>
          {appointment.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
              onPress={() => handleStatusChange('confirmed')}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Confirmar</Text>
            </TouchableOpacity>
          )}
          {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10b981' }]}
              onPress={() => handleStatusChange('done')}
            >
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Finalizar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={() => handleStatusChange('cancelled')}
          >
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Cancelar</Text>
          </TouchableOpacity>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#e5e7eb',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
