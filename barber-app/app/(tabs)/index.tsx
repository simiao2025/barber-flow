// ============================================================
// BARBEAR-FLOW: Tela Dashboard com Analytics e Realtime
// ============================================================

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useDashboard } from '../../hooks/useDashboard';
import { useAuthStore } from '../../stores/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, LineChart } from 'react-native-gifted-charts';

// ============================================================
// COMPONENTES
// ============================================================

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AlertCard({ icon, label, count, color, route }: { icon: string; label: string; count: number; color: string; route: string }) {
  const router = useRouter();
  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.alertCard}
      onPress={() => router.push(route as any)}
    >
      <Ionicons name={icon as any} size={20} color={color} />
      <View style={styles.alertTextContainer}>
        <Text style={styles.alertCount}>{count}</Text>
        <Text style={styles.alertLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );
}

function RankingItem({ rank, name, value, subtitle, avatar }: { rank: number; name: string; value: string; subtitle?: string; avatar?: string }) {
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  return (
    <View style={styles.rankingItem}>
      <View style={[styles.medal, { backgroundColor: medalColors[rank] || '#6b7280' }]}>
        <Text style={styles.medalText}>{rank + 1}</Text>
      </View>
      <Text style={styles.rankingName}>{name}</Text>
      <View style={styles.rankingValueContainer}>
        <Text style={styles.rankingValue}>{value}</Text>
        {subtitle && <Text style={styles.rankingSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// ============================================================
// TELA PRINCIPAL
// ============================================================

export default function DashboardScreen() {
  const { barbershopId } = useAuthStore();
  const { data, isLoading, refetch } = useDashboard(barbershopId || '');

  const onRefresh = async () => {
    await refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#6b7280" />
        <Text style={styles.errorText}>Erro ao carregar dashboard</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#f59e0b" />}
    >
      {/* SEÇÃO 1 — KPIs do dia */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoje</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="calendar"
            label="Agendamentos"
            value={`${data.kpis.appointments_confirmed}/${data.kpis.appointments_total}`}
            color="#3b82f6"
          />
          <MetricCard
            icon="cash"
            label="Receita"
            value={`R$ ${data.kpis.revenue_today.toFixed(2)}`}
            color="#10b981"
          />
          <MetricCard
            icon="logo-whatsapp"
            label="Novos WhatsApp"
            value={data.kpis.new_clients_whatsapp}
            color="#25D366"
          />
          <MetricCard
            icon="time"
            label="Próximo"
            value={data.next_appointment ? format(new Date(data.next_appointment.scheduled_at), 'HH:mm') : '--:--'}
            color="#f59e0b"
          />
        </View>

        {/* Próximo agendamento */}
        {data.next_appointment && (
          <View style={styles.nextAppointment}>
            <Ionicons name="alarm" size={20} color="#f59e0b" />
            <View style={styles.nextApptText}>
              <Text style={styles.nextApptClient}>{data.next_appointment.client_name}</Text>
              <Text style={styles.nextApptDetails}>
                {data.next_appointment.service} com {data.next_appointment.professional_name}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* SEÇÃO 2 — Gráfico semanal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimos 7 dias</Text>
        <View style={styles.chartContainer}>
          {data.weekly_chart && data.weekly_chart.length > 0 ? (
            <BarChart
              data={data.weekly_chart.map((d) => ({
                value: d.revenue,
                label: format(new Date(d.date), 'dd/MM'),
              }))}
              barWidth={28}
              spacing={16}
              roundedTop
              roundedBottom
              hideRules
              yAxisLabelPrefix="R$ "
              yAxisColor="#4b5563"
              xAxisColor="#4b5563"
              noOfSections={4}
              barBorderRadius={4}
              frontColor="#f59e0b"
              pressEnabled={false}
              showVerticalLines={false}
              labelWidth={40}
              yAxisThickness={0}
              xAxisThickness={1}
              yAxisTextStyle={{ color: '#6b7280', fontSize: 10 }}
              labelTextStyle={{ color: '#9ca3af', fontSize: 10 }}
            />
          ) : (
            <Text style={styles.emptyChartText}>Sem dados no período</Text>
          )}
        </View>
      </View>

      {/* SEÇÃO 3 — Rankings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Serviços</Text>
        <View style={styles.rankingContainer}>
          {data.top_services?.map((s, i) => (
            <RankingItem
              key={i}
              rank={i}
              name={s.name}
              value={`R$ ${s.revenue.toFixed(2)}`}
              subtitle={`${s.count} atendimentos`}
            />
          )) || <Text style={styles.emptyText}>Sem dados</Text>}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Top Profissionais</Text>
        <View style={styles.rankingContainer}>
          {data.top_professionals?.map((p, i) => (
            <RankingItem
              key={i}
              rank={i}
              name={p.name}
              value={`R$ ${p.revenue.toFixed(2)}`}
              subtitle="receita gerada"
            />
          )) || <Text style={styles.emptyText}>Sem dados</Text>}
        </View>
      </View>

      {/* SEÇÃO 4 — Alertas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atenção Necessária</Text>
        <View style={styles.alertsContainer}>
          <AlertCard
            icon="person-remove"
            label="Clientes inativos"
            count={data.alerts.inactive_clients_count}
            color="#ef4444"
            route="/clientes?filter=inactive"
          />
          <AlertCard
            icon="alert"
            label="Estoque crítico"
            count={data.alerts.low_stock_count}
            color="#f59e0b"
            route="/produtos?filter=low_stock"
          />
          <AlertCard
            icon="chatbubble-ellipses"
            label="Aguardando humano"
            count={data.alerts.pending_handoff_count}
            color="#8b5cf6"
            route="/conversas?filter=handoff"
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
  },
  retryText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  nextAppointment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
  nextApptText: {
    flex: 1,
  },
  nextApptClient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  nextApptDetails: {
    fontSize: 12,
    color: '#9ca3af',
  },
  chartContainer: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
  },
  emptyChartText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 32,
  },
  rankingContainer: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  medal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  medalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  rankingName: {
    flex: 1,
    fontSize: 14,
    color: '#e5e7eb',
  },
  rankingValueContainer: {
    alignItems: 'flex-end',
  },
  rankingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  rankingSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
  },
  alertsContainer: {
    gap: 8,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  alertLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 16,
  },
});
