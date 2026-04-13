// ============================================================
// BARBEAR-FLOW: Edge Function — Dashboard do Dia
// GET /dashboard/today?barbershop_id=
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

    if (!barbershopId) {
      return new Response(
        JSON.stringify({ error: { code: 'MISSING_PARAM', message: 'barbershop_id é obrigatório' } }),
        { status: 400 }
      );
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // ============================================================
    // 1. KPIs do dia
    // ============================================================
    const { data: todayAppts, error: apptsError } = await supabase
      .from('appointments')
      .select('id, status, total_price')
      .eq('barbershop_id', barbershopId)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString());

    if (apptsError) throw apptsError;

    const appointmentsConfirmed = (todayAppts || []).filter((a: any) => a.status === 'confirmed').length;
    const appointmentsTotal = todayAppts?.length || 0;

    const { data: todayRevenue, error: revError } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('barbershop_id', barbershopId)
      .eq('type', 'income')
      .gte('transaction_at', todayStart.toISOString())
      .lte('transaction_at', todayEnd.toISOString());

    const revenueToday = (todayRevenue || []).reduce((sum: number, t: any) => sum + t.amount, 0);

    const { data: newClients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('created_by', 'whatsapp')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    // ============================================================
    // 2. Próximo agendamento
    // ============================================================
    const { data: nextAppt, error: nextError } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        clients(name),
        professionals(name),
        service_ids
      `)
      .eq('barbershop_id', barbershopId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextError) throw nextError;

    // Busca nome do primeiro serviço
    let nextServiceName = '';
    if (nextAppt?.service_ids?.length > 0) {
      const { data: svc } = await supabase
        .from('services')
        .select('name')
        .eq('id', nextAppt.service_ids[0])
        .single();
      nextServiceName = svc?.name || '';
    }

    const nextAppointment = nextAppt
      ? {
          client_name: (nextAppt.clients as any)?.name || '',
          service: nextServiceName,
          scheduled_at: nextAppt.scheduled_at,
          professional_name: (nextAppt.professionals as any)?.name || '',
        }
      : null;

    // ============================================================
    // 3. Gráfico semanal (últimos 7 dias)
    // ============================================================
    const weeklyData: Array<{ date: string; revenue: number; appointments: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Receita do dia
      const { data: dayTrans } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('barbershop_id', barbershopId)
        .eq('type', 'income')
        .gte('transaction_at', dayStart.toISOString())
        .lte('transaction_at', dayEnd.toISOString());

      // Agendamentos do dia
      const { data: dayAppts } = await supabase
        .from('appointments')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'done')
        .gte('scheduled_at', dayStart.toISOString())
        .lte('scheduled_at', dayEnd.toISOString());

      weeklyData.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: (dayTrans || []).reduce((sum: number, t: any) => sum + t.amount, 0),
        appointments: dayAppts?.length || 0,
      });
    }

    // ============================================================
    // 4. Top 3 serviços
    // ============================================================
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const { data: monthAppts } = await supabase
      .from('appointments')
      .select('service_ids, total_price')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'done')
      .gte('scheduled_at', monthAgo.toISOString());

    const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};

    for (const appt of monthAppts || []) {
      for (const svcId of appt.service_ids || []) {
        if (!serviceMap[svcId]) {
          serviceMap[svcId] = { name: '', count: 0, revenue: 0 };
        }
        serviceMap[svcId].count += 1;
        serviceMap[svcId].revenue += appt.total_price / (appt.service_ids?.length || 1);
      }
    }

    const serviceIds = Object.keys(serviceMap);
    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .in('id', serviceIds);

      for (const s of services || []) {
        if (serviceMap[s.id]) {
          serviceMap[s.id].name = s.name;
        }
      }
    }

    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map((s) => ({
        name: s.name || 'Serviço',
        count: s.count,
        revenue: Math.round(s.revenue * 100) / 100,
      }));

    // ============================================================
    // 5. Top 3 profissionais
    // ============================================================
    const profMap: Record<string, { name: string; avatar_url: string; revenue: number }> = {};

    for (const appt of monthAppts || []) {
      const profId = appt.professional_id;
      if (!profMap[profId]) {
        profMap[profId] = { name: '', avatar_url: '', revenue: 0 };
      }
      profMap[profId].revenue += appt.total_price;
    }

    const profIds = Object.keys(profMap);
    if (profIds.length > 0) {
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name, avatar_url')
        .in('id', profIds);

      for (const p of profData || []) {
        if (profMap[p.id]) {
          profMap[p.id].name = p.name;
          profMap[p.id].avatar_url = p.avatar_url || '';
        }
      }
    }

    const topProfessionals = Object.entries(profMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(([id, data]) => ({
        id,
        name: data.name || 'Profissional',
        avatar_url: data.avatar_url,
        revenue: Math.round(data.revenue * 100) / 100,
      }));

    // ============================================================
    // 6. Alertas
    // ============================================================
    const { data: inactiveClients } = await supabase
      .from('clients')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .or(`last_visit_at.is.null,last_visit_at.lt.${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}`);

    const { data: lowStock } = await supabase
      .from('products')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .lte('stock_qty', supabase.rpc('stock_min'))
      .eq('is_active', true);

    const { data: pendingHandoff } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('intent_last', 'reclamacao')
      .gte('updated_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    // ============================================================
    // MONTAR RESPOSTA FINAL
    // ============================================================
    return new Response(
      JSON.stringify({
        kpis: {
          appointments_confirmed: appointmentsConfirmed,
          appointments_total: appointmentsTotal,
          revenue_today: Math.round(revenueToday * 100) / 100,
          new_clients_whatsapp: newClients?.length || 0,
        },
        next_appointment: nextAppointment,
        weekly_chart: weeklyData,
        top_services: topServices,
        top_professionals: topProfessionals,
        alerts: {
          inactive_clients_count: inactiveClients?.length || 0,
          low_stock_count: lowStock?.length || 0,
          pending_handoff_count: pendingHandoff?.length || 0,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no dashboard:', error);
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
