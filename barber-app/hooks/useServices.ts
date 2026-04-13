// ============================================================
// BARBEAR-FLOW: Hook useServices (CRUD)
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Service } from '../types/database';

// ============================================================
// LISTAR SERVIÇOS
// ============================================================

async function fetchServices(
  barbershopId: string,
  activeOnly = false
) {
  let query = supabase
    .from('services')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Service[];
}

// ============================================================
// CRIAR SERVIÇO
// ============================================================

async function createService(
  barbershopId: string,
  dto: {
    name: string;
    price: number;
    durationMin: number;
    description?: string;
    category?: string;
  }
) {
  const { data, error } = await supabase
    .from('services')
    .insert({
      barbershop_id: barbershopId,
      name: dto.name,
      price: dto.price,
      duration_min: dto.durationMin,
      description: dto.description || null,
      category: dto.category || 'outro',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

// ============================================================
// ATUALIZAR SERVIÇO
// ============================================================

async function updateService(
  id: string,
  dto: {
    name?: string;
    price?: number;
    durationMin?: number;
    description?: string;
    category?: string;
    isActive?: boolean;
  }
) {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.price !== undefined) updates.price = dto.price;
  if (dto.durationMin !== undefined) updates.duration_min = dto.durationMin;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.category !== undefined) updates.category = dto.category;
  if (dto.isActive !== undefined) updates.is_active = dto.isActive;

  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

// ============================================================
// EXCLUIR SERVIÇO
// ============================================================

async function deleteService(id: string) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// HOOKS
// ============================================================

export function useServices(
  barbershopId: string,
  activeOnly = false
) {
  return useQuery({
    queryKey: ['services', barbershopId, activeOnly],
    queryFn: () => fetchServices(barbershopId, activeOnly),
    staleTime: 5 * 60 * 1000,
    enabled: !!barbershopId,
  });
}

export function useCreateService(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Parameters<typeof createService>[1]) =>
      createService(barbershopId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['services', barbershopId],
      });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Parameters<typeof updateService>[1]) =>
      updateService(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['services', data.barbershop_id],
      });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
