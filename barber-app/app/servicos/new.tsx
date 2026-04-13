// ============================================================
// BARBEAR-FLOW: Criar/Editar Serviço
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
import { useCreateService, useUpdateService } from '../../hooks/useServices';
import type { Service } from '../../types/database';

const CATEGORIES = [
  { key: 'corte', label: 'Corte' },
  { key: 'barba', label: 'Barba' },
  { key: 'combo', label: 'Combo' },
  { key: 'sobrancelha', label: 'Sobrancelha' },
  { key: 'pigmentacao', label: 'Pigmentação' },
  { key: 'hidratacao', label: 'Hidratação' },
  { key: 'outro', label: 'Outro' },
];

export default function ServiceFormScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const params = useLocalSearchParams();
  const editId = params.id as string | undefined;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMin, setDurationMin] = useState('30');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('outro');

  const createMutation = useCreateService(barbershopId || '');
  const updateMutation = useUpdateService();

  const { data: existing } = useQuery({
    queryKey: ['service', editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', editId)
        .single();
      if (error) throw error;
      return data as Service;
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPrice(String(existing.price));
      setDurationMin(String(existing.duration_min));
      setDescription(existing.description || '');
      setCategory(existing.category || 'outro');
    }
  }, [existing]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome do serviço');
      return;
    }
    const priceNum = parseFloat(price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Erro', 'Informe um preço válido');
      return;
    }
    const durationNum = parseInt(durationMin);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Erro', 'Informe uma duração válida');
      return;
    }

    try {
      if (editId) {
        await updateMutation.mutateAsync({
          id: editId,
          name: name.trim(),
          price: priceNum,
          durationMin: durationNum,
          description: description.trim() || undefined,
          category,
        });
        Alert.alert('Sucesso', 'Serviço atualizado');
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          price: priceNum,
          durationMin: durationNum,
          description: description.trim() || undefined,
          category,
        });
        Alert.alert('Sucesso', 'Serviço criado');
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
          {editId ? 'Editar Serviço' : 'Novo Serviço'}
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
          placeholder="Ex: Corte Degradê"
          placeholderTextColor="#6b7280"
        />

        {/* Preço */}
        <Text style={styles.label}>Preço (R$) *</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="35,00"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
        />

        {/* Duração */}
        <Text style={styles.label}>Duração (minutos) *</Text>
        <TextInput
          style={styles.input}
          value={durationMin}
          onChangeText={setDurationMin}
          placeholder="30"
          placeholderTextColor="#6b7280"
          keyboardType="number-pad"
        />

        {/* Categoria */}
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryButton,
                category === cat.key && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat.key && styles.categoryButtonTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Descrição */}
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição do serviço..."
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={3}
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
              {editId ? 'Atualizar' : 'Criar Serviço'}
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
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#3d3d3d',
  },
  categoryButtonActive: {
    backgroundColor: '#f59e0b',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  categoryButtonTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
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
