// ============================================================
// BARBEAR-FLOW: Criar Novo Agendamento
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCreateAppointment } from '../../hooks/useAppointments';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { useClients } from '../../hooks/useClients';
import { useAuthStore } from '../../stores/auth.store';

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { barbershopId } = useAuthStore();
  const params = useLocalSearchParams();
  const preselectedDate = params.date as string | undefined;

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(preselectedDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [notes, setNotes] = useState('');

  const { data: clients } = useClients(barbershopId || '');
  const { data: professionals } = useProfessionals(barbershopId || '', true);
  const { data: services } = useServices(barbershopId || '', true);
  const createMutation = useCreateAppointment(barbershopId || '');

  // Calcular preço total
  const totalPrice = services
    ?.filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0) || 0;

  // Calcular duração total
  const totalDuration = services
    ?.filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.duration_min, 0) || 30;

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    if (!selectedClient) {
      Alert.alert('Erro', 'Selecione um cliente');
      return;
    }
    if (!selectedProfessional) {
      Alert.alert('Erro', 'Selecione um profissional');
      return;
    }
    if (selectedServices.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um serviço');
      return;
    }

    const scheduledAt = `${selectedDate}T${selectedTime}:00`;

    try {
      await createMutation.mutateAsync({
        clientId: selectedClient,
        professionalId: selectedProfessional,
        serviceIds: selectedServices,
        scheduledAt,
        durationMin: totalDuration,
        totalPrice,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Sucesso', 'Agendamento criado com sucesso');
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar agendamento');
    }
  };

  if (!barbershopId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Agendamento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Cliente */}
        <Text style={styles.label}>Cliente *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipContainer}>
            {clients?.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={[
                  styles.chip,
                  selectedClient === client.id && styles.chipSelected,
                ]}
                onPress={() => setSelectedClient(client.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedClient === client.id && styles.chipTextSelected,
                  ]}
                >
                  {client.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Profissional */}
        <Text style={styles.label}>Profissional *</Text>
        <View style={styles.chipContainer}>
          {professionals?.map((prof) => (
            <TouchableOpacity
              key={prof.id}
              style={[
                styles.chip,
                selectedProfessional === prof.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedProfessional(prof.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedProfessional === prof.id && styles.chipTextSelected,
                ]}
              >
                {prof.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Serviços */}
        <Text style={styles.label}>Serviços *</Text>
        <View style={styles.serviceList}>
          {services?.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
                onPress={() => handleServiceToggle(service.id)}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDuration}>{service.duration_min} min</Text>
                </View>
                <View style={styles.serviceRight}>
                  <Text style={styles.servicePrice}>R$ {service.price.toFixed(2)}</Text>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? '#f59e0b' : '#6b7280'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Data */}
        <Text style={styles.label}>Data *</Text>
        <TextInput
          style={styles.input}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#6b7280"
        />

        {/* Hora */}
        <Text style={styles.label}>Horário *</Text>
        <TextInput
          style={styles.input}
          value={selectedTime}
          onChangeText={setSelectedTime}
          placeholder="HH:MM"
          placeholderTextColor="#6b7280"
          keyboardType="number-pad"
        />

        {/* Observações */}
        <Text style={styles.label}>Observações</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anotações..."
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={3}
        />

        {/* Resumo */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Resumo</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total:</Text>
            <Text style={styles.summaryValue}>R$ {totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duração:</Text>
            <Text style={styles.summaryValue}>{totalDuration} min</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão Salvar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            createMutation.isPending && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <Text style={styles.saveButtonText}>Criar Agendamento</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  chipScroll: {
    marginVertical: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#3d3d3d',
  },
  chipSelected: {
    backgroundColor: '#f59e0b',
  },
  chipText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  chipTextSelected: {
    color: '#1a1a1a',
    fontWeight: '600',
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
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  serviceDuration: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
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
  summary: {
    marginTop: 24,
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
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
