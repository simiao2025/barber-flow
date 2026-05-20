// ============================================================
// BARBEAR-FLOW: Hook useAppointments com TanStack Query
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Appointment } from '../types/database';

// ============================================================
// QUERIES
// ============================================================

/**
 * Busca agendamentos por data
 */
export function useAppointmentsByDate(date: string, barbershopId: string, professionalId?: string | null) {
  return useQuery({
    queryKey: ['appointments', barbershopId, date, professionalId],
    queryFn: async () => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('appointments')
        .select(`
          *,
          clients(name, phone),
          professionals(name, avatar_url),
          service_ids
        `)
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString());

      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data, error } = await query.order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!barbershopId && !!date,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Busca próximos agendamentos
 */
export function useUpcomingAppointments(barbershopId: string, limit: number = 10) {
  return useQuery({
    queryKey: ['appointments', 'upcoming', barbershopId],
    queryFn: async () => {
      const now = new Date();

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients(name),
          professionals(name, avatar_url),
          services(name)
        `)
        .eq('barbershop_id', barbershopId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', now.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!barbershopId,
  });
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Criar agendamento
 */
export function useCreateAppointment(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      professionalId: string;
      serviceIds: string[];
      scheduledAt: string;
      durationMin: number;
      totalPrice: number;
      notes?: string;
    }) => {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          barbershop_id: barbershopId,
          client_id: data.clientId,
          professional_id: data.professionalId,
          service_ids: data.serviceIds,
          scheduled_at: data.scheduledAt,
          duration_min: data.durationMin,
          total_price: data.totalPrice,
          status: 'confirmed',
          source: 'app',
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

/**
 * Cancelar agendamento
 */
export function useCancelAppointment(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: reason ? `Cancelado: ${reason}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

/**
 * Atualizar agendamento (reagendar)
 */
export function useUpdateAppointment(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      scheduledAt?: string;
      professionalId?: string;
      serviceIds?: string[];
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          ...(data.scheduledAt && { scheduled_at: data.scheduledAt }),
          ...(data.professionalId && { professional_id: data.professionalId }),
          ...(data.serviceIds && { service_ids: data.serviceIds }),
          ...(data.notes && { notes: data.notes }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
