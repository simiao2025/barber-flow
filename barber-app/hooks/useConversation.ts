// ============================================================
// BARBEAR-FLOW: Hook useConversation
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_AGENT_URL || 'http://localhost:3000';

// ============================================================
// QUERIES
// ============================================================

export function useConversations(barbershopId: string) {
  return useQuery({
    queryKey: ['conversations', barbershopId],
    queryFn: async () => {
      // Busca conversas recentes do Supabase
      const { data, error } = await supabase
        .from('ai_conversations')
        .select(`
          *,
          clients(name, phone)
        `)
        .eq('barbershop_id', barbershopId)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!barbershopId,
    staleTime: 1 * 60 * 1000,
  });
}

// ============================================================
// MUTATIONS
// ============================================================

export function useConversationActions() {
  const queryClient = useQueryClient();

  return {
    /**
     * Assumir atendimento (modo manual)
     */
    assumeConversation: useMutation({
      mutationFn: async ({ phone }: { phone: string }) => {
        const response = await fetch(`${API_URL}/conversations/${phone}/mode`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manualMode: true, waitingHuman: false }),
        });

        if (!response.ok) throw new Error('Falha ao assumir conversa');
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),

    /**
     * Devolver ao agente
     */
    returnToAgent: useMutation({
      mutationFn: async ({ phone }: { phone: string }) => {
        const response = await fetch(`${API_URL}/conversations/${phone}/mode`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manualMode: false, waitingHuman: false }),
        });

        if (!response.ok) throw new Error('Falha ao devolver ao agente');
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),

    /**
     * Enviar mensagem manual (apenas em modo manual)
     */
    sendMessage: useMutation({
      mutationFn: async ({ phone, barbershopId, text }: { phone: string; barbershopId: string; text: string }) => {
        const response = await fetch(`${API_URL}/conversations/${phone}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barbershopId, text }),
        });

        if (!response.ok) throw new Error('Falha ao enviar mensagem');
        return response.json();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['conversation', variables.phone] });
      },
    }),
  };
}
