// ============================================================
// BARBEAR-FLOW: Hook useFinancialSummary com Realtime
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================
// TIPOS
// ============================================================

export type PeriodType = 'today' | 'week' | 'month' | 'custom';

export interface FinancialSummary {
  total_income: number;
  total_expense: number;
  net: number;
  appointments_count: number;
  avg_ticket: number;
  breakdown: Array<{ category: string; total: number; count: number }>;
  top_services: Array<{ service_name: string; count: number; revenue: number }>;
  by_professional: Array<{
    name: string;
    appointments: number;
    revenue: number;
    commission: number;
  }>;
  by_payment_method: Array<{ method: string; total: number }>;
  period: { start: string; end: string };
}

// ============================================================
// EDGE FUNCTION CALLER
// ============================================================

async function fetchFinancialSummary(
  barbershopId: string,
  period: PeriodType = 'month',
  startDate?: string,
  endDate?: string
): Promise<FinancialSummary> {
  const params: Record<string, string> = {
    barbershop_id: barbershopId,
    period,
  };

  if (period === 'custom' && startDate && endDate) {
    params.start_date = startDate;
    params.end_date = endDate;
  }

  const queryString = new URLSearchParams(params).toString();
  const { data, error } = await supabase.functions.invoke('financial-summary', {
    body: {},
    params,
  });

  if (error) throw error;
  return data;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useFinancialSummary(
  barbershopId: string,
  period: PeriodType = 'month',
  startDate?: string,
  endDate?: string
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['financial-summary', barbershopId, period, startDate, endDate],
    queryFn: () =>
      fetchFinancialSummary(barbershopId, period, startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: !!barbershopId,
  });

  // Invalidar ao mudar appointments ou financial_transactions
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('financial-summary-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financial_transactions',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['financial-summary', barbershopId],
          });
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
          queryClient.invalidateQueries({
            queryKey: ['financial-summary', barbershopId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, queryClient]);

  return query;
}
