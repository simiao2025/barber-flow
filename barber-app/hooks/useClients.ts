// ============================================================
// BARBEAR-FLOW: Hook useClients
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// ============================================================
// CRIAR/ATUALIZAR CLIENTE
// ============================================================

async function createClient(
  barbershopId: string,
  dto: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
    createdBy?: 'whatsapp' | 'manual';
  }
) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      barbershop_id: barbershopId,
      name: dto.name,
      phone: dto.phone || null,
      email: dto.email || null,
      notes: dto.notes || null,
      created_by: dto.createdBy || 'manual',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

async function updateClient(
  id: string,
  dto: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }
) {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.phone !== undefined) updates.phone = dto.phone;
  if (dto.email !== undefined) updates.email = dto.email;
  if (dto.notes !== undefined) updates.notes = dto.notes;

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
}

/**
 * Criar novo cliente
 */
export function useCreateClient(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Parameters<typeof createClient>[1]) =>
      createClient(barbershopId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clients', barbershopId],
      });
    },
  });
}

/**
 * Atualizar cliente
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Parameters<typeof updateClient>[1]) =>
      updateClient(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['clients', data.barbershop_id],
      });
    },
  });
}
