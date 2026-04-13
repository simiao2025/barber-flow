// ============================================================
// BARBEAR-FLOW: Criar/Editar Profissional
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
import { useCreateProfessional, useUpdateProfessional } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import type { Professional, Service } from '../../types/database';

export default function ProfessionalFormScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const params = useLocalSearchParams();
  const editId = params.id as string | undefined;

  const [name, setName] = useState('');
  const [commissionPct, setCommissionPct] = useState('50');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: services } = useServices(barbershopId || '', true);
  const createMutation = useCreateProfessional(barbershopId || '');
  const updateMutation = useUpdateProfessional();

  // Carregar dados se editando
  const { data: existing } = useQuery({
    queryKey: ['professional', editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', editId)
        .single();
      if (error) throw error;
      return data as Professional;
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCommissionPct(String(existing.commission_pct || 50));
      setSelectedServices(existing.service_ids || []);
    }
  }, [existing]);

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome do profissional');
      return;
    }
    const commission = parseFloat(commissionPct);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      Alert.alert('Erro', 'Comissão deve ser entre 0 e 100');
      return;
    }

    try {
      if (editId) {
        await updateMutation.mutateAsync({
          id: editId,
          name: name.trim(),
          commissionPct: commission,
          serviceIds: selectedServices,
        });
        Alert.alert('Sucesso', 'Profissional atualizado');
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          commissionPct: commission,
          serviceIds: selectedServices,
        });
        Alert.alert('Sucesso', 'Profissional criado');
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
          {editId ? 'Editar Profissional' : 'Novo Profissional'}
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
          placeholder="Nome do profissional"
          placeholderTextColor="#6b7280"
        />

        {/* Comissão */}
        <Text style={styles.label}>Comissão (%) *</Text>
        <TextInput
          style={styles.input}
          value={commissionPct}
          onChangeText={setCommissionPct}
          placeholder="50"
          placeholderTextColor="#6b7280"
          keyboardType="number-pad"
        />

        {/* Serviços */}
        <Text style={styles.label}>Serviços</Text>
        <View style={styles.serviceList}>
          {services?.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
                onPress={() => handleServiceToggle(service.id)}
              >
                <Text style={styles.serviceName}>{service.name}</Text>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? '#f59e0b' : '#6b7280'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

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
              {editId ? 'Atualizar' : 'Criar Profissional'}
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
  serviceList: {
    gap: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  serviceItemSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b10',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
