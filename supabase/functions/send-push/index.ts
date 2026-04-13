// ============================================================
// BARBEAR-FLOW: Edge Function — Enviar Push Notification
// POST /send-push
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const sendPushSchema = z.object({
  barbershop_id: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(['new_appointment', 'human_handoff', 'low_stock', 'follow_up_failed', 'daily_summary']),
  data: z.record(z.unknown()).optional(),
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
    const parsed = sendPushSchema.safeParse(body);

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

    const { barbershop_id, title, body: pushBody, type, data } = parsed.data;

    // Busca tokens ativos da barbearia
    const { data: tokensData, error: tokensError } = await supabase
      .from('push_tokens')
      .select('expo_token, id')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (tokensError) throw tokensError;
    if (!tokensData || tokensData.length === 0) {
      return new Response(
        JSON.stringify({ status: 'no_tokens', message: 'Nenhum token registrado' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepara mensagem para Expo
    const expoMessage = {
      to: tokensData.map((t: any) => t.expo_token),
      sound: 'default',
      title,
      body: pushBody,
      data: data || {},
      categoryId: type,
    };

    // Envia para Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expoMessage),
    });

    const expoResult = await expoResponse.json();
    const tickets = expoResult.data || [];

    // Processa tokens com erro (DeviceNotRegistered)
    const failedTokens: string[] = [];
    let successCount = 0;

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          // Remove token inválido
          const tokenId = tokensData[i]?.id;
          if (tokenId) {
            await supabase
              .from('push_tokens')
              .update({ is_active: false })
              .eq('id', tokenId);
            failedTokens.push(tokensData[i].expo_token);
          }
        }
      } else {
        successCount++;
      }
    }

    // Log do envio
    await supabase.from('notifications_log').insert({
      barbershop_id,
      type,
      title,
      body: pushBody,
      tokens_count: tokensData.length,
      success_count: successCount,
      failed_tokens: failedTokens.length > 0 ? failedTokens : null,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        status: 'sent',
        tokens_count: tokensData.length,
        success_count: successCount,
        failed_count: failedTokens.length,
        failed_tokens: failedTokens,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao enviar push:', error);
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
