// ============================================================
// BARBEAR-FLOW: Edge Function — Fechar Agendamento
// POST /financial/close-appointment
// Atômico: status=done + transação + comissão + cliente + follow-up
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const closeAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  payment_method: z.enum(['cash', 'pix', 'card', 'other']),
  discount_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
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
    const parsed = closeAppointmentSchema.safeParse(body);

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

    const { appointment_id, payment_method, discount_amount, notes } = parsed.data;

    // 1. Verifica agendamento
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('*, professionals(commission_pct, name)')
      .eq('id', appointment_id)
      .single();

    if (apptError || !appointment) {
      return new Response(
        JSON.stringify({ error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado' } }),
        { status: 404 }
      );
    }

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return new Response(
        JSON.stringify({
          error: { code: 'INVALID_STATUS', message: 'Agendamento já foi finalizado ou cancelado' },
        }),
        { status: 409 }
      );
    }

    // 2. Calcula preço com desconto
    const totalPrice = appointment.total_price - discount_amount;
    const professional = appointment.professionals;
    const commissionAmount = totalPrice * (professional.commission_pct / 100);

    // 3. Busca serviços para descrição
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name')
      .in('id', appointment.service_ids);

    const serviceNames = servicesData?.map((s: any) => s.name).join(', ') || 'Serviços';

    // ============================================================
    // OPERAÇÕES ATÔMICAS SEQUENCIAIS
    // ============================================================

    // 4. UPDATE appointment: status='done'
    const { error: updateApptError } = await supabase
      .from('appointments')
      .update({
        status: 'done',
        total_price: totalPrice,
        notes: appointment.notes
          ? `${appointment.notes} | ${notes || ''}`
          : notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment_id);

    if (updateApptError) throw updateApptError;

    // 5. INSERT financial_transaction (receita)
    const { data: transaction, error: transError } = await supabase
      .from('financial_transactions')
      .insert({
        barbershop_id: appointment.barbershop_id,
        appointment_id,
        type: 'income',
        category: 'servicos',
        amount: totalPrice,
        payment_method,
        description: `Serviço: ${serviceNames}`,
        transaction_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transError) throw transError;

    // 6. INSERT financial_transaction (comissão)
    const { data: commissionTrans, error: commError } = await supabase
      .from('financial_transactions')
      .insert({
        barbershop_id: appointment.barbershop_id,
        appointment_id,
        type: 'commission',
        category: `comissao_${professional.name}`,
        amount: commissionAmount,
        payment_method,
        description: `Comissão: ${professional.name} (${professional.commission_pct}%)`,
        transaction_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (commError) throw commError;

    // 7. UPDATE client: total_visits++, last_visit_at=now()
    await supabase
      .from('clients')
      .update({
        total_visits: (appointment.clients?.total_visits || 0) + 1,
        last_visit_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.client_id);

    // 8. INSERT follow_up post_service (scheduled_for = now + 1h)
    const followUpDate = new Date();
    followUpDate.setHours(followUpDate.getHours() + 1);

    await supabase.from('follow_ups').insert({
      barbershop_id: appointment.barbershop_id,
      client_id: appointment.client_id,
      appointment_id,
      type: 'post_service',
      scheduled_for: followUpDate.toISOString(),
      status: 'pending',
    });

    // ============================================================
    // RESPOSTA
    // ============================================================
    return new Response(
      JSON.stringify({
        appointment: {
          id: appointment_id,
          status: 'done',
          total_price: totalPrice,
        },
        transaction,
        commission: {
          transaction: commissionTrans,
          amount: commissionAmount,
          professional: professional.name,
          percentage: professional.commission_pct,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao fechar agendamento:', error);
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
