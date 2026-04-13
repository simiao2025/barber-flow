// ============================================================
// BARBEAR-FLOW: Edge Function — Resumo Financeiro Completo
// GET /financial/summary?barbershop_id=&period=&start_date=&end_date=
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
    const period = url.searchParams.get('period') || 'month';
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    if (!barbershopId) {
      return new Response(
        JSON.stringify({ error: { code: 'MISSING_PARAM', message: 'barbershop_id é obrigatório' } }),
        { status: 400 }
      );
    }

    // Calcula período
    let startDateObj: Date;
    const endDateObj = new Date();

    if (period === 'today') {
      startDateObj = new Date();
      startDateObj.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - 7);
    } else if (period === 'month') {
      startDateObj = new Date();
      startDateObj.setMonth(startDateObj.getMonth() - 1);
    } else if (period === 'custom' && startDate && endDate) {
      startDateObj = new Date(startDate);
      endDateObj.setHours(23, 59, 59, 999);
    } else {
      startDateObj = new Date();
      startDateObj.setMonth(startDateObj.getMonth() - 1);
    }

    // ============================================================
    // 1. Totais de receita e despesa
    // ============================================================
    const { data: transactions, error: transError } = await supabase
      .from('financial_transactions')
      .select('type, category, amount, payment_method, appointment_id')
      .eq('barbershop_id', barbershopId)
      .gte('transaction_at', startDateObj.toISOString())
      .lte('transaction_at', endDateObj.toISOString());

    if (transError) throw transError;

    let totalIncome = 0;
    let totalExpense = 0;
    const breakdown: Record<string, { total: number; count: number }> = {};
    const byPaymentMethod: Record<string, number> = {};

    for (const t of transactions || []) {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpense += t.amount;

      // Breakdown por categoria
      if (!breakdown[t.category]) {
        breakdown[t.category] = { total: 0, count: 0 };
      }
      breakdown[t.category].total += t.amount;
      breakdown[t.category].count += 1;

      // Por método de pagamento
      if (!byPaymentMethod[t.payment_method]) {
        byPaymentMethod[t.payment_method] = 0;
      }
      byPaymentMethod[t.payment_method] += t.amount;
    }

    // ============================================================
    // 2. Agendamentos finalizados no período
    // ============================================================
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('id, total_price, service_ids, professional_id')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'done')
      .gte('scheduled_at', startDateObj.toISOString())
      .lte('scheduled_at', endDateObj.toISOString());

    if (apptError) throw apptError;

    const appointmentsCount = appointments?.length || 0;
    const avgTicket = appointmentsCount > 0
      ? (appointments || []).reduce((sum, a) => sum + a.total_price, 0) / appointmentsCount
      : 0;

    // ============================================================
    // 3. Top serviços
    // ============================================================
    const serviceMap: Record<string, { service_name: string; count: number; revenue: number }> = {};

    for (const appt of appointments || []) {
      for (const serviceId of appt.service_ids || []) {
        if (!serviceMap[serviceId]) {
          serviceMap[serviceId] = { service_name: '', count: 0, revenue: 0 };
        }
        serviceMap[serviceId].count += 1;
        serviceMap[serviceId].revenue += appt.total_price / (appt.service_ids?.length || 1);
      }
    }

    // Busca nomes dos serviços
    const serviceIds = Object.keys(serviceMap);
    if (serviceIds.length > 0) {
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name')
        .in('id', serviceIds);

      for (const s of servicesData || []) {
        if (serviceMap[s.id]) {
          serviceMap[s.id].service_name = s.name;
        }
      }
    }

    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ============================================================
    // 4. Por profissional
    // ============================================================
    const profMap: Record<string, { name: string; appointments: number; revenue: number; commission: number }> = {};

    for (const appt of appointments || []) {
      const profId = appt.professional_id;
      if (!profMap[profId]) {
        profMap[profId] = { name: '', appointments: 0, revenue: 0, commission: 0 };
      }
      profMap[profId].appointments += 1;
      profMap[profId].revenue += appt.total_price;
    }

    // Busca nomes e comissões dos profissionais
    const profIds = Object.keys(profMap);
    if (profIds.length > 0) {
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name, commission_pct')
        .in('id', profIds);

      for (const p of profData || []) {
        if (profMap[p.id]) {
          profMap[p.id].name = p.name;
          profMap[p.id].commission = profMap[p.id].revenue * (p.commission_pct / 100);
        }
      }
    }

    const byProfessional = Object.values(profMap).sort((a, b) => b.revenue - a.revenue);

    // ============================================================
    // 5. Montar resposta
    // ============================================================
    return new Response(
      JSON.stringify({
        total_income: totalIncome,
        total_expense: totalExpense,
        net: totalIncome - totalExpense,
        appointments_count: appointmentsCount,
        avg_ticket: Math.round(avgTicket * 100) / 100,
        breakdown: Object.entries(breakdown).map(([category, data]) => ({
          category,
          ...data,
        })),
        top_services: topServices,
        by_professional: byProfessional,
        by_payment_method: Object.entries(byPaymentMethod).map(([method, total]) => ({
          method,
          total,
        })),
        period: {
          start: startDateObj.toISOString(),
          end: endDateObj.toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no resumo financeiro:', error);
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
