// ============================================================
// BARBEAR-FLOW: Hook useDashboard com Realtime
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

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
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('dashboard-today', {
    body: { barbershop_id: barbershopId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error('[useDashboard] Erro na Edge Function:', error);
    throw error;
  }

  return data;
}

// ============================================================
// PROFESSIONAL DASHBOARD DATA
// ============================================================

async function fetchProfessionalDashboard(barbershopId: string, professionalId: string): Promise<DashboardData> {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch appointments today
  const { data: appointmentsToday, error: errApp } = await supabase
    .from('appointments')
    .select(`
      *,
      clients(name),
      professionals(name, avatar_url)
    `)
    .eq('barbershop_id', barbershopId)
    .eq('professional_id', professionalId)
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString());

  if (errApp) throw errApp;

  const appsToday = appointmentsToday || [];
  const confirmed = appsToday.filter(a => a.status === 'confirmed' || a.status === 'done').length;
  const total = appsToday.filter(a => a.status !== 'cancelled').length;
  const revenue = appsToday
    .filter(a => a.status === 'confirmed' || a.status === 'done')
    .reduce((sum, a) => sum + (a.total_price || 0), 0);

  // 2. Fetch next appointment
  const { data: nextAppRaw, error: errNext } = await supabase
    .from('appointments')
    .select(`
      *,
      clients(name),
      professionals(name, avatar_url)
    `)
    .eq('barbershop_id', barbershopId)
    .eq('professional_id', professionalId)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', today.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (errNext) {
    console.error('[fetchProfessionalDashboard] nextAppRaw err:', errNext);
  }

  let nextAppointment: DashboardData['next_appointment'] = null;
  if (nextAppRaw) {
    const clientName = (nextAppRaw.clients as any)?.name || 'Cliente';
    const profName = (nextAppRaw.professionals as any)?.name || '';
    nextAppointment = {
      client_name: clientName,
      service: 'Atendimento',
      scheduled_at: nextAppRaw.scheduled_at,
      professional_name: profName,
    };
  }

  // 3. Weekly chart (last 7 days including today)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: appointmentsWeek, error: errWeek } = await supabase
    .from('appointments')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('professional_id', professionalId)
    .gte('scheduled_at', sevenDaysAgo.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .in('status', ['confirmed', 'done']);

  if (errWeek) throw errWeek;

  const weeklyChart: DashboardData['weekly_chart'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = format(d, 'yyyy-MM-dd');

    const dayApps = (appointmentsWeek || []).filter(a => {
      const appDate = new Date(a.scheduled_at);
      return appDate.getDate() === d.getDate() &&
             appDate.getMonth() === d.getMonth() &&
             appDate.getFullYear() === d.getFullYear();
    });

    const dayRevenue = dayApps.reduce((sum, a) => sum + (a.total_price || 0), 0);
    weeklyChart.push({
      date: dateStr,
      revenue: dayRevenue,
      appointments: dayApps.length
    });
  }

  return {
    kpis: {
      appointments_confirmed: confirmed,
      appointments_total: total,
      revenue_today: revenue,
      new_clients_whatsapp: 0,
    },
    next_appointment: nextAppointment,
    weekly_chart: weeklyChart,
    top_services: [],
    top_professionals: [],
    alerts: {
      inactive_clients_count: 0,
      low_stock_count: 0,
      pending_handoff_count: 0,
    },
  };
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useDashboard(barbershopId: string, role?: string, professionalId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard', barbershopId, role, professionalId],
    queryFn: () => {
      if (role === 'professional' && professionalId) {
        return fetchProfessionalDashboard(barbershopId, professionalId);
      }
      return fetchDashboard(barbershopId);
    },
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
