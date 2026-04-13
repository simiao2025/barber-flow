// ============================================================
// BARBEAR-FLOW: Tela de Agenda (principal)
// ============================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppointmentsByDate } from '../../hooks/useAppointments';
import { useAuthStore } from '../../stores/auth.store';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { Appointment } from '../../types/database';

// ============================================================
// COMPONENTES
// ============================================================

function AppointmentCard({ appointment }: { appointment: Appointment & { clients?: { name: string }; professionals?: { name: string } } }) {
  const router = useRouter();
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/appointments/${appointment.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.time}>{time}</Text>
        <View style={[styles.badge, { backgroundColor: statusColors[appointment.status] }]}>
          <Text style={styles.badgeText}>{statusLabels[appointment.status]}</Text>
        </View>
      </View>

      <Text style={styles.clientName}>{appointment.clients?.name || 'Cliente'}</Text>
      <Text style={styles.professional}>
        <Ionicons name="scissors" size={14} color="#9ca3af" /> {appointment.professionals?.name || 'Profissional'}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyState({ date }: { date: Date }) {
  const message = isToday(date)
    ? 'Nenhum agendamento para hoje'
    : `Nenhum agendamento para ${format(date, "dd 'de' MMMM", { locale: ptBR })}`;

  return (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#4b5563" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeleton, { height: 20, width: 60, marginBottom: 8 }]} />
      <View style={[styles.skeleton, { height: 16, width: '60%', marginBottom: 8 }]} />
      <View style={[styles.skeleton, { height: 14, width: '40%' }]} />
    </View>
  );
}

// ============================================================
// TELA PRINCIPAL
// ============================================================

export default function AgendaScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: appointments, isLoading, refetch } = useAppointmentsByDate(dateStr, barbershopId || '');

  // Realtime subscription
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        (payload) => {
          console.log('Mudança em agendamentos:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 3 + i);
    return date;
  });

  return (
    <View style={styles.container}>
      {/* Header com navegação de datas */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))}>
          <Ionicons name="chevron-back" size={24} color="#f59e0b" />
        </TouchableOpacity>

        <View style={styles.datesScroll}>
          {dates.map((date, i) => {
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isTodayDate = isToday(date);

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dateButton, isSelected && styles.dateButtonSelected]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {format(date, 'EEE', { locale: ptBR })}
                </Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected, isTodayDate && styles.todayNumber]}>
                  {format(date, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))}>
          <Ionicons name="chevron-forward" size={24} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Título do dia */}
      <View style={styles.dayTitle}>
        <Text style={styles.dayTitleText}>
          {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
        </Text>
        <Text style={styles.dayCountText}>
          {appointments?.length || 0} agendamento{(appointments?.length || 0) !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Lista de agendamentos */}
      {isLoading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : appointments && appointments.length > 0 ? (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AppointmentCard appointment={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
          }
        />
      ) : (
        <View style={styles.list}>
          <EmptyState date={selectedDate} />
        </View>
      )}

      {/* FAB - Novo agendamento */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/appointments/new')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d2d',
    gap: 12,
  },
  datesScroll: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  dateButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    minWidth: 50,
  },
  dateButtonSelected: {
    backgroundColor: '#f59e0b',
  },
  dayName: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  dayNameSelected: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb',
    marginTop: 2,
  },
  dayNumberSelected: {
    color: '#1a1a1a',
  },
  todayNumber: {
    color: '#f59e0b',
  },
  dayTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  dayTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  dayCountText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f59e0b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  professional: {
    fontSize: 13,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  skeletonCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  skeleton: {
    backgroundColor: '#4b5563',
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
