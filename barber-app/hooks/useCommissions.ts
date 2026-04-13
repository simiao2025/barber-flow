// ============================================================
// BARBEAR-FLOW: Hook useCommissions
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ============================================================
// TIPOS
// ============================================================

export interface CommissionData {
  professional_id: string;
  name: string;
  is_active: boolean;
  total_appointments: number;
  gross_revenue: number;
  commission_total: number;
  is_paid: boolean;
}

export interface CommissionsResponse {
  commissions: CommissionData[];
  period: { start: string; end: string };
  total_commission: number;
}

// ============================================================
// EDGE FUNCTION CALLER
// ============================================================

async function fetchCommissions(
  barbershopId: string,
  startDate?: string,
  endDate?: string
): Promise<CommissionsResponse> {
  const params: Record<string, string> = {
    barbershop_id: barbershopId,
  };

  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const { data, error } = await supabase.functions.invoke('financial-commissions', {
    params,
  });

  if (error) throw error;
  return data;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useCommissions(
  barbershopId: string,
  startDate?: string,
  endDate?: string
) {
  const query = useQuery({
    queryKey: ['commissions', barbershopId, startDate, endDate],
    queryFn: () => fetchCommissions(barbershopId, startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: !!barbershopId,
  });

  return query;
}
