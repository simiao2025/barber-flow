// ============================================================
// BARBEAR-FLOW: Hook useProfessionals (CRUD)
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Professional } from '../types/database';

// ============================================================
// LISTAR PROFISSIONAIS
// ============================================================

async function fetchProfessionals(barbershopId: string, activeOnly = false) {
  let query = supabase
    .from('professionals')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Professional[];
}

// ============================================================
// CRIAR PROFISSIONAL
// ============================================================

async function createProfessional(
  barbershopId: string,
  dto: {
    name: string;
    commissionPct: number;
    serviceIds?: string[];
    workingHours?: any;
    avatarUrl?: string;
  }
) {
  const { data, error } = await supabase
    .from('professionals')
    .insert({
      barbershop_id: barbershopId,
      name: dto.name,
      commission_pct: dto.commissionPct,
      service_ids: dto.serviceIds || [],
      working_hours: dto.workingHours || null,
      avatar_url: dto.avatarUrl || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Professional;
}

// ============================================================
// ATUALIZAR PROFISSIONAL
// ============================================================

async function updateProfessional(
  id: string,
  dto: {
    name?: string;
    commissionPct?: number;
    serviceIds?: string[];
    workingHours?: any;
    avatarUrl?: string;
    isActive?: boolean;
  }
) {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.commissionPct !== undefined) updates.commission_pct = dto.commissionPct;
  if (dto.serviceIds !== undefined) updates.service_ids = dto.serviceIds;
  if (dto.workingHours !== undefined) updates.working_hours = dto.workingHours;
  if (dto.avatarUrl !== undefined) updates.avatar_url = dto.avatarUrl;
  if (dto.isActive !== undefined) updates.is_active = dto.isActive;

  const { data, error } = await supabase
    .from('professionals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Professional;
}

// ============================================================
// EXCLUIR PROFISSIONAL
// ============================================================

async function deleteProfessional(id: string) {
  const { error } = await supabase
    .from('professionals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// HOOKS
// ============================================================

export function useProfessionals(
  barbershopId: string,
  activeOnly = false
) {
  return useQuery({
    queryKey: ['professionals', barbershopId, activeOnly],
    queryFn: () => fetchProfessionals(barbershopId, activeOnly),
    staleTime: 5 * 60 * 1000,
    enabled: !!barbershopId,
  });
}

export function useCreateProfessional(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Parameters<typeof createProfessional>[1]) =>
      createProfessional(barbershopId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['professionals', barbershopId],
      });
    },
  });
}

export function useUpdateProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Parameters<typeof updateProfessional>[1]) =>
      updateProfessional(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['professionals', data.barbershop_id],
      });
    },
  });
}

export function useDeleteProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProfessional,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
    },
  });
}
