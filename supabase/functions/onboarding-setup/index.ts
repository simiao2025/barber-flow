// ============================================================
// BARBEAR-FLOW: Edge Function — On Setup da Barbearia
// POST /onboarding/setup
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const onboardingSchema = z.object({
  name: z.string().min(2).max(255),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp_number: z.string().min(10),
  logo_url: z.string().url().optional(),
  working_hours: z.record(z.unknown()).optional(),
  services: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      duration_min: z.number().int().positive(),
      category: z.string().default('outro'),
    })
  ).min(1, 'Mínimo 1 serviço necessário'),
});

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' } }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Pega o usuário autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Token não fornecido' } }),
        { status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verifica usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }),
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);

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
      name,
      address,
      phone,
      whatsapp_number,
      logo_url,
      working_hours,
      services,
    } = parsed.data;

    // ============================================================
    // 1. Cria barbearia
    // ============================================================
    const defaultWorkingHours = working_hours || {
      segunda: { open: '09:00', close: '18:00' },
      terca: { open: '09:00', close: '18:00' },
      quarta: { open: '09:00', close: '18:00' },
      quinta: { open: '09:00', close: '18:00' },
      sexta: { open: '09:00', close: '18:00' },
      sabado: { open: '09:00', close: '13:00' },
      domingo: null,
    };

    const { data: barbershop, error: bsError } = await supabase
      .from('barbershops')
      .insert({
        name,
        owner_id: user.id,
        whatsapp_number,
        working_hours: defaultWorkingHours,
        settings: {
          whatsapp_enabled: true,
          ai_enabled: true,
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          require_confirmation: true,
          allow_online_booking: true,
        },
        plan: 'free',
      })
      .select()
      .single();

    if (bsError) throw bsError;

    // ============================================================
    // 2. Cria serviços
    // ============================================================
    const servicesToInsert = services.map((s) => ({
      barbershop_id: barbershop.id,
      name: s.name,
      description: s.description,
      price: s.price,
      duration_min: s.duration_min,
      category: s.category,
      is_active: true,
    }));

    const { data: createdServices, error: svcError } = await supabase
      .from('services')
      .insert(servicesToInsert)
      .select();

    if (svcError) throw svcError;

    // ============================================================
    // 3. Cria profissional padrão (dono da barbearia)
    // ============================================================
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .insert({
        barbershop_id: barbershop.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Profissional',
        avatar_url: logo_url || user.user_metadata?.avatar_url,
        service_ids: createdServices?.map((s: any) => s.id) || [],
        commission_pct: 50.00,
        is_active: true,
      })
      .select()
      .single();

    if (profError) throw profError;

    // ============================================================
    // RESPOSTA
    // ============================================================
    return new Response(
      JSON.stringify({
        barbershop,
        services: createdServices,
        professional,
        message: 'Barbearia configurada com sucesso! 🎉',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no onboarding:', error);
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
