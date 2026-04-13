// ============================================================
// BARBEAR-FLOW: Tela de Chat Individual da Conversa
// ============================================================

import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useConversationActions } from '../../hooks/useConversation';
import { useAuthStore } from '../../stores/auth.store';
import { Ionicons } from '@expo/vector-icons';

type Message = {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
  toolName?: string;
};

export default function ConversationChatScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const { assumeConversation, returnToAgent, sendMessage } = useConversationActions();

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Cliente iniciou conversa.', timestamp: new Date().toISOString() },
    { role: 'user', content: 'Olá, gostaria de agendar um corte', timestamp: new Date().toISOString() },
  ]); // Em produção: buscar do Supabase/Redis
  const [isManualMode, setIsManualMode] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!messageText.trim() || !phone || !barbershopId) return;

    try {
      await sendMessage.mutateAsync({ phone, barbershopId, text: messageText.trim() });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: messageText.trim(), timestamp: new Date().toISOString() },
      ]);
      setMessageText('');

      // Auto-scroll
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Erro ao enviar:', error);
    }
  };

  const handleAssume = async () => {
    if (!phone) return;
    try {
      await assumeConversation.mutateAsync({ phone });
      setIsManualMode(true);
    } catch (error) {
      console.error('Erro ao assumir:', error);
    }
  };

  const handleReturnToAgent = async () => {
    if (!phone) return;
    try {
      await returnToAgent.mutateAsync({ phone });
      setIsManualMode(false);
    } catch (error) {
      console.error('Erro ao devolver:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isTool = item.role === 'tool';

    if (isTool) {
      return (
        <View style={styles.toolCallContainer}>
          <View style={styles.toolCallHeader}>
            <Ionicons name="construct" size={14} color="#8b5cf6" />
            <Text style={styles.toolCallName}>Tool: {item.toolName}</Text>
          </View>
          <Text style={styles.toolCallContent} numberOfLines={2}>
            {item.content}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {item.content.startsWith('[Áudio]: ') && (
          <Ionicons name="mic" size={12} color={isUser ? '#fff' : '#fff'} style={styles.audioIcon} />
        )}
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
          {item.content.replace('[Áudio]: ', '🎤 ')}
        </Text>
        <Text style={[styles.messageTime, isUser ? styles.userMessageTime : styles.assistantMessageTime]}>
          {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const modeLabel = isManualMode
    ? 'Modo manual'
    : 'Agente ativo';

  const modeColor = isManualMode ? '#f97316' : '#10b981';

  return (
    <>
      <Stack.Screen
        options={{
          title: phone || 'Conversa',
          headerBackTitle: 'Voltar',
          headerStyle: { backgroundColor: '#2d2d2d' },
          headerTintColor: '#fff',
          headerRight: () => (
            <View style={[styles.modeBadge, { backgroundColor: modeColor }]}>
              <Text style={styles.modeBadgeText}>{modeLabel}</Text>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Mensagens */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Footer condicional */}
        {!isManualMode ? (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.assumeButton} onPress={handleAssume}>
              <Ionicons name="hand-left" size={20} color="#fff" />
              <Text style={styles.assumeButtonText}>Assumir atendimento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footer}>
            <TextInput
              style={styles.input}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#6b7280"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Botão devolver ao agente (sempre visível em modo manual) */}
        {isManualMode && (
          <View style={styles.returnContainer}>
            <TouchableOpacity style={styles.returnButton} onPress={handleReturnToAgent}>
              <Ionicons name="analytics" size={18} color="#fff" />
              <Text style={styles.returnButtonText}>Devolver ao Agente</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  messagesList: {
    padding: 16,
    gap: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 10,
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
  },
  assistantMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#10b981',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: '#bfdbfe',
  },
  assistantMessageTime: {
    color: '#a7f3d0',
  },
  audioIcon: {
    marginRight: 4,
  },
  toolCallContainer: {
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#8b5cf640',
    borderStyle: 'dashed',
  },
  toolCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  toolCallName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  toolCallContent: {
    fontSize: 11,
    color: '#9ca3af',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2d2d2d',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#f59e0b',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assumeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  assumeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  returnContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#1a1a1a',
  },
  returnButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
