// ============================================================
// BARBEAR-FLOW: Hook useTransactions (CRUD + Listagem)
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FinancialTransaction } from '../types/database';

// ============================================================
// TIPOS
// ============================================================

export type TransactionType = 'income' | 'expense' | 'commission';
export type PaymentMethod = 'cash' | 'pix' | 'card' | 'other';

export interface CreateTransactionDto {
  barbershop_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  payment_method: PaymentMethod;
  description?: string;
  appointment_id?: string;
  transaction_at?: string;
}

// ============================================================
// LISTAR TRANSAÇÕES
// ============================================================

async function fetchTransactions(
  barbershopId: string,
  limit = 50,
  type?: TransactionType,
  professionalId?: string | null
) {
  let query = supabase
    .from('financial_transactions')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('transaction_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  if (professionalId) {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', professionalId);

    const appointmentIds = (appointments || []).map((a) => a.id);
    if (appointmentIds.length === 0) {
      return [];
    }
    query = query.in('appointment_id', appointmentIds);
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return data as FinancialTransaction[];
}

// ============================================================
// CRIAR TRANSAÇÃO
// ============================================================

async function createTransaction(dto: CreateTransactionDto) {
  const { data, error } = await supabase.functions.invoke(
    'financial-transaction',
    {
      body: dto,
    }
  );

  if (error) throw error;
  return data;
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Listar transações financeiras
 */
export function useTransactions(
  barbershopId: string,
  limit = 50,
  type?: TransactionType,
  professionalId?: string | null
) {
  return useQuery({
    queryKey: ['transactions', barbershopId, type, professionalId],
    queryFn: () => fetchTransactions(barbershopId, limit, type, professionalId),
    staleTime: 2 * 60 * 1000,
    enabled: !!barbershopId,
  });
}

/**
 * Criar nova transação financeira
 */
export function useCreateTransaction(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateTransactionDto) => createTransaction(dto),
    onSuccess: () => {
      // Invalidar queries financeiras
      queryClient.invalidateQueries({
        queryKey: ['transactions', barbershopId],
      });
      queryClient.invalidateQueries({
        queryKey: ['financial-summary', barbershopId],
      });
      queryClient.invalidateQueries({
        queryKey: ['commissions', barbershopId],
      });
      queryClient.invalidateQueries({
        queryKey: ['dashboard', barbershopId],
      });
    },
  });
}
