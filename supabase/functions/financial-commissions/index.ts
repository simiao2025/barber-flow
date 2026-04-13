// ============================================================
// BARBEAR-FLOW: Edge Function — Comissões por Profissional
// GET /financial/commissions?barbershop_id=&start_date=&end_date=
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET allowed' } }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const barbershopId = url.searchParams.get('barbershop_id');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    if (!barbershopId) {
      return new Response(
        JSON.stringify({ error: { code: 'MISSING_PARAM', message: 'barbershop_id é obrigatório' } }),
        { status: 400 }
      );
    }

    // Período padrão: último mês
    const startDateObj = startDate ? new Date(startDate) : new Date();
    if (!startDate) startDateObj.setMonth(startDateObj.getMonth() - 1);
    const endDateObj = endDate ? new Date(endDate) : new Date();
    endDateObj.setHours(23, 59, 59, 999);

    // Busca agendamentos finalizados no período
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('professional_id, total_price')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'done')
      .gte('scheduled_at', startDateObj.toISOString())
      .lte('scheduled_at', endDateObj.toISOString());

    if (apptError) throw apptError;

    // Agrupa por profissional
    const profMap: Record<string, { total_appointments: number; gross_revenue: number; commission: number }> = {};

    for (const appt of appointments || []) {
      if (!profMap[appt.professional_id]) {
        profMap[appt.professional_id] = { total_appointments: 0, gross_revenue: 0, commission: 0 };
      }
      profMap[appt.professional_id].total_appointments += 1;
      profMap[appt.professional_id].gross_revenue += appt.total_price;
    }

    // Busca dados dos profissionais para calcular comissões
    const profIds = Object.keys(profMap);
    if (profIds.length > 0) {
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name, commission_pct, is_active')
        .in('id', profIds);

      for (const p of profData || []) {
        if (profMap[p.id]) {
          profMap[p.id].commission = profMap[p.id].gross_revenue * (p.commission_pct / 100);
          profMap[p.id].name = p.name;
          profMap[p.id].is_active = p.is_active;
        }
      }
    }

    // Verifica se comissões foram pagas (busca transações de comissão)
    const { data: commissionTrans } = await supabase
      .from('financial_transactions')
      .select('category')
      .eq('barbershop_id', barbershopId)
      .eq('type', 'commission')
      .gte('transaction_at', startDateObj.toISOString())
      .lte('transaction_at', endDateObj.toISOString());

    const paidCategories = new Set(commissionTrans?.map((t: any) => t.category) || []);

    const result = Object.entries(profMap).map(([id, data]: [string, any]) => ({
      professional_id: id,
      name: data.name || 'Desconhecido',
      is_active: data.is_active ?? true,
      total_appointments: data.total_appointments,
      gross_revenue: Math.round(data.gross_revenue * 100) / 100,
      commission_total: Math.round(data.commission * 100) / 100,
      is_paid: paidCategories.has(`comissao_${data.name}`),
    }));

    return new Response(
      JSON.stringify({
        commissions: result.sort((a, b) => b.commission_total - a.commission_total),
        period: {
          start: startDateObj.toISOString(),
          end: endDateObj.toISOString(),
        },
        total_commission: result.reduce((sum, p) => sum + p.commission_total, 0),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
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
