// ============================================================
// BARBEAR-FLOW: Criar/Editar Cliente
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { useCreateClient, useUpdateClient } from '../../hooks/useClients';
import type { Client } from '../../types/database';

export default function ClientFormScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const params = useLocalSearchParams();
  const editId = params.id as string | undefined;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const createMutation = useCreateClient(barbershopId || '');
  const updateMutation = useUpdateClient();

  const { data: existing } = useQuery({
    queryKey: ['client', editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', editId)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPhone(existing.phone || '');
      setEmail(existing.email || '');
      setNotes(existing.notes || '');
    }
  }, [existing]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome do cliente');
      return;
    }

    try {
      if (editId) {
        await updateMutation.mutateAsync({
          id: editId,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        Alert.alert('Sucesso', 'Cliente atualizado');
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        Alert.alert('Sucesso', 'Cliente criado');
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editId ? 'Editar Cliente' : 'Novo Cliente'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Nome */}
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome completo"
          placeholderTextColor="#6b7280"
        />

        {/* Telefone */}
        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="(11) 99999-9999"
          placeholderTextColor="#6b7280"
          keyboardType="phone-pad"
        />

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          placeholderTextColor="#6b7280"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Observações */}
        <Text style={styles.label}>Observações</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anotações sobre o cliente..."
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={4}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão Salvar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (createMutation.isPending || updateMutation.isPending) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {(createMutation.isPending || updateMutation.isPending) ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <Text style={styles.saveButtonText}>
              {editId ? 'Atualizar' : 'Criar Cliente'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#3d3d3d',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});
