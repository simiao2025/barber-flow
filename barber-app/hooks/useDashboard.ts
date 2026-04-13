// ============================================================
// BARBEAR-FLOW: Hook useDashboard com Realtime
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================
// TIPOS
// ============================================================

export interface DashboardData {
  kpis: {
    appointments_confirmed: number;
    appointments_total: number;
    revenue_today: number;
    new_clients_whatsapp: number;
  };
  next_appointment: {
    client_name: string;
    service: string;
    scheduled_at: string;
    professional_name: string;
  } | null;
  weekly_chart: Array<{ date: string; revenue: number; appointments: number }>;
  top_services: Array<{ name: string; count: number; revenue: number }>;
  top_professionals: Array<{ id: string; name: string; avatar_url: string; revenue: number }>;
  alerts: {
    inactive_clients_count: number;
    low_stock_count: number;
    pending_handoff_count: number;
  };
}

// ============================================================
// EDGE FUNCTION CALLER
// ============================================================

async function fetchDashboard(barbershopId: string): Promise<DashboardData> {
  const { data, error } = await supabase.functions.invoke('dashboard-today', {
    body: { barbershop_id: barbershopId },
  });

  if (error) throw error;
  return data;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useDashboard(barbershopId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard', barbershopId],
    queryFn: () => fetchDashboard(barbershopId),
    staleTime: 2 * 60 * 1000, // 2 min
    enabled: !!barbershopId,
  });

  // Realtime subscription para invalidar query ao receber evento de appointment
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          // Invalida dashboard ao novo agendamento
          queryClient.invalidateQueries({ queryKey: ['dashboard', barbershopId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          // Invalida dashboard ao atualizar agendamento
          queryClient.invalidateQueries({ queryKey: ['dashboard', barbershopId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, queryClient]);

  return query;
}
