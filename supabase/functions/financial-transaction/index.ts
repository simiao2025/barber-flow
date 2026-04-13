// ============================================================
// BARBEAR-FLOW: Edge Function — Criar Transação Financeira
// POST /financial/transaction
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const transactionSchema = z.object({
  barbershop_id: z.string().uuid(),
  type: z.enum(['income', 'expense', 'commission']),
  category: z.string().min(1).max(100),
  amount: z.number().positive(),
  payment_method: z.enum(['cash', 'pix', 'card', 'other']),
  description: z.string().optional(),
  appointment_id: z.string().uuid().optional(),
  transaction_at: z.string().datetime().optional(),
});

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' } }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: parsed.error.flatten(),
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      barbershop_id,
      type,
      category,
      amount,
      payment_method,
      description,
      appointment_id,
      transaction_at,
    } = parsed.data;

    // Se tem appointment_id, verifica que pertence à barbearia
    if (appointment_id) {
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select('barbershop_id')
        .eq('id', appointment_id)
        .single();

      if (apptError || !appt || appt.barbershop_id !== barbershop_id) {
        return new Response(
          JSON.stringify({
            error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado ou não pertence à barbearia' },
          }),
          { status: 404 }
        );
      }
    }

    // Cria transação
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        barbershop_id,
        appointment_id,
        type,
        category,
        amount,
        payment_method,
        description,
        transaction_at: transaction_at ? new Date(transaction_at) : new Date(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ data, status: 'created' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Erro interno do servidor',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
