import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

    // Criar cliente para autenticação (usando o token do usuário)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente admin para consultas privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );


    let barbershopId = new URL(req.url).searchParams.get('barbershop_id');

    if (!barbershopId && req.method === 'POST') {
      try {
        const body = await req.json();
        barbershopId = body.barbershop_id;
      } catch (e) {
        console.error('Erro ao ler body:', e);
      }
    }

    if (!barbershopId) {
      return new Response(
        JSON.stringify({ error: 'barbershop_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const [appointmentsRes, clientsRes] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', `${today}T00:00:00`)
        .lte('scheduled_at', `${today}T23:59:59`),

      supabaseAdmin
        .from('clients')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', `${today}T00:00:00`),
    ]);

    const appointments = appointmentsRes.data ?? [];
    const confirmed = appointments.filter((a: any) => a.status === 'confirmed');
    const revenue = confirmed.reduce((sum: number, a: any) => sum + (a.price ?? 0), 0);

    return new Response(
      JSON.stringify({
        kpis: {
          appointments_total: appointments.length,
          appointments_confirmed: confirmed.length,
          revenue_today: revenue,
          new_clients_whatsapp: clientsRes.data?.length ?? 0,
        },
        next_appointment: appointments.find((a: any) => a.status === 'confirmed') ?? null,
        weekly_chart: [],
        top_services: [],
        top_professionals: [],
        alerts: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
