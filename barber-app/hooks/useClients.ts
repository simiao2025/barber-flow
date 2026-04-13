// ============================================================
// BARBEAR-FLOW: Hook useClients
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Client } from '../types/database';

// ============================================================
// TIPOS
// ============================================================

export type ClientFilter = 'all' | 'active' | 'inactive';

// ============================================================
// BUSCAR CLIENTES
// ============================================================

async function fetchClients(
  barbershopId: string,
  filter: ClientFilter = 'all',
  search?: string
) {
  let query = supabase
    .from('clients')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true });

  // Filtro de inativos (>30 dias sem visita)
  if (filter === 'inactive') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query
      .not('last_visit_at', 'is', null)
      .lt('last_visit_at', thirtyDaysAgo.toISOString());
  } else if (filter === 'active') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.or(
      `last_visit_at.is.null,last_visit_at.gte.${thirtyDaysAgo.toISOString()}`
    );
  }

  // Busca por nome ou telefone
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Client[];
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useClients(
  barbershopId: string,
  filter: ClientFilter = 'all',
  search?: string
) {
  return useQuery({
    queryKey: ['clients', barbershopId, filter, search],
    queryFn: () => fetchClients(barbershopId, filter, search),
    staleTime: 2 * 60 * 1000,
    enabled: !!barbershopId,
  });
}
