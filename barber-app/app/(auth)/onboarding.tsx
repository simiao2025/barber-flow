// ============================================================
// BARBEAR-FLOW: Tela de Onboarding SaaS (Wizard 3 etapas)
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// ============================================================
// SCHEMA
// ============================================================

const step1Schema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  address: z.string().min(5, 'Endereço é obrigatório'),
  phone: z.string().optional(),
  whatsapp_number: z.string().min(10, 'WhatsApp inválido'),
});

type Step1Data = z.infer<typeof step1Schema>;

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration_min: number;
}

// ============================================================
// TELA
// ============================================================

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      whatsapp_number: '',
    },
  });

  // Serviços iniciais (editáveis)
  const [services, setServices] = useState<ServiceItem[]>([
    { id: '1', name: 'Corte', price: 35, duration_min: 30 },
    { id: '2', name: 'Barba', price: 25, duration_min: 20 },
    { id: '3', name: 'Combo', price: 55, duration_min: 45 },
  ]);

  // ============================================================
  // STEP 1: Dados da barbearia
  // ============================================================

  const onSubmitStep1 = (data: Step1Data) => {
    setStep(2);
  };

  // ============================================================
  // STEP 3: Finalizar
  // ============================================================

  const handleFinish = async () => {
    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/onboarding-setup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            name: (control as any)._defaultValues.name,
            address: (control as any)._defaultValues.address,
            phone: (control as any)._defaultValues.phone,
            whatsapp_number: (control as any)._defaultValues.whatsapp_number,
            services: services.map((s) => ({
              name: s.name,
              price: s.price,
              duration_min: s.duration_min,
              category: s.name.toLowerCase().includes('combo') ? 'combo' : 'corte',
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erro ao configurar');
      }

      Alert.alert('Sucesso! 🎉', 'Sua barbearia está configurada!', [
        {
          text: 'Começar',
          onPress: () => router.replace('/(tabs)/agenda'),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao configurar barbearia'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        price: 0,
        duration_min: 30,
      },
    ]);
  };

  const removeService = (id: string) => {
    if (services.length <= 1) {
      Alert.alert('Atenção', 'É necessário ter pelo menos 1 serviço');
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string | number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Indicador de progresso */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Etapa {step} de 3</Text>
      </View>

      {/* STEP 1: Dados */}
      {step === 1 && (
        <View style={styles.step}>
          <Ionicons name="storefront" size={48} color="#f59e0b" style={styles.stepIcon} />
          <Text style={styles.stepTitle}>Dados da Barbearia</Text>
          <Text style={styles.stepSubtitle}>Conte-nos sobre seu estabelecimento</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Nome da Barbearia *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Barbearia Flow Studio"
                  value={value}
                  onChangeText={onChange}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
              </>
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Endereço *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rua, número, bairro"
                  value={value}
                  onChangeText={onChange}
                />
                {errors.address && <Text style={styles.errorText}>{errors.address.message}</Text>}
              </>
            )}
          />

          <Controller
            control={control}
            name="whatsapp_number"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>WhatsApp Comercial *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5511999999999"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                />
                {errors.whatsapp_number && (
                  <Text style={styles.errorText}>{errors.whatsapp_number.message}</Text>
                )}
              </>
            )}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit(onSubmitStep1)}
          >
            <Text style={styles.buttonText}>Próximo</Text>
            <Ionicons name="arrow-forward" size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: Horários */}
      {step === 2 && (
        <View style={styles.step}>
          <Ionicons name="time" size={48} color="#f59e0b" style={styles.stepIcon} />
          <Text style={styles.stepTitle}>Horários</Text>
          <Text style={styles.stepSubtitle}>Quando sua barbearia funciona?</Text>

          <Text style={styles.infoText}>
            Os horários padrão são Seg–Sex 9h–18h, Sáb 9h–13h. Você pode alterar depois nas configurações.
          </Text>

          <View style={styles.workingHoursPreview}>
            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((day) => (
              <View key={day} style={styles.workingHourRow}>
                <Text style={styles.dayText}>{day}</Text>
                <Text style={styles.hoursText}>09:00 – 18:00</Text>
              </View>
            ))}
            <View style={styles.workingHourRow}>
              <Text style={styles.dayText}>Sábado</Text>
              <Text style={styles.hoursText}>09:00 – 13:00</Text>
            </View>
            <View style={styles.workingHourRow}>
              <Text style={styles.dayText}>Domingo</Text>
              <Text style={[styles.hoursText, { color: '#ef4444' }]}>Fechado</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setStep(1)}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={[styles.buttonText, { color: '#fff' }]}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep(3)}
            >
              <Text style={styles.buttonText}>Próximo</Text>
              <Ionicons name="arrow-forward" size={20} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 3: Serviços */}
      {step === 3 && (
        <View style={styles.step}>
          <Ionicons name="cut" size={48} color="#f59e0b" style={styles.stepIcon} />
          <Text style={styles.stepTitle}>Serviços Iniciais</Text>
          <Text style={styles.stepSubtitle}>Quais serviços você oferece?</Text>

          {services.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <TextInput
                  style={styles.serviceNameInput}
                  placeholder="Nome do serviço"
                  value={service.name}
                  onChangeText={(v) => updateService(service.id, 'name', v)}
                />
                {services.length > 1 && (
                  <TouchableOpacity onPress={() => removeService(service.id)}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.serviceFields}>
                <View style={styles.serviceField}>
                  <Text style={styles.serviceFieldLabel}>Preço (R$)</Text>
                  <TextInput
                    style={styles.serviceFieldInput}
                    keyboardType="numeric"
                    value={service.price.toString()}
                    onChangeText={(v) => updateService(service.id, 'price', parseFloat(v) || 0)}
                  />
                </View>
                <View style={styles.serviceField}>
                  <Text style={styles.serviceFieldLabel}>Duração (min)</Text>
                  <TextInput
                    style={styles.serviceFieldInput}
                    keyboardType="numeric"
                    value={service.duration_min.toString()}
                    onChangeText={(v) => updateService(service.id, 'duration_min', parseInt(v) || 30)}
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
            <Ionicons name="add-circle" size={20} color="#f59e0b" />
            <Text style={styles.addServiceText}>Adicionar serviço</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setStep(2)}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={[styles.buttonText, { color: '#fff' }]}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleFinish}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#1a1a1a" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#1a1a1a" />
                  <Text style={styles.buttonText}>Concluir</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2d2d2d',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  step: {
    gap: 16,
  },
  stepIcon: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#4b5563',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonSecondary: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    backgroundColor: '#2d2d2d',
    padding: 12,
    borderRadius: 8,
  },
  workingHoursPreview: {
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  workingHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayText: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  hoursText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  serviceCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  serviceFields: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceField: {
    flex: 1,
  },
  serviceFieldLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  serviceFieldInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 8,
  },
  addServiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
});
