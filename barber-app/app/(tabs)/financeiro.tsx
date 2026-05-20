// ============================================================
// BARBEAR-FLOW: Tela Financeiro — Resumo, Comissões e Transações
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialSummary, type PeriodType } from '../../hooks/useFinancialSummary';
import { useCommissions } from '../../hooks/useCommissions';
import { useTransactions, useCreateTransaction } from '../../hooks/useTransactions';
import { useAuthStore } from '../../stores/auth.store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PeriodSelector({
  selected,
  onSelect,
}: {
  selected: PeriodType;
  onSelect: (p: PeriodType) => void;
}) {
  const periods: { key: PeriodType; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mês' },
  ];

  return (
    <View style={styles.periodContainer}>
      {periods.map((p) => (
        <TouchableOpacity
          key={p.key}
          style={[
            styles.periodButton,
            selected === p.key && styles.periodButtonActive,
          ]}
          onPress={() => onSelect(p.key)}
        >
          <Text
            style={[
              styles.periodText,
              selected === p.key && styles.periodTextActive,
            ]}
          >
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TransactionItem({ item }: { item: any }) {
  const typeColors = {
    income: '#10b981',
    expense: '#ef4444',
    commission: '#f59e0b',
  };
  const typeLabels = {
    income: 'Receita',
    expense: 'Despesa',
    commission: 'Comissão',
  };
  const typeIcons = {
    income: 'arrow-down',
    expense: 'arrow-up',
    commission: 'cash',
  };

  return (
    <View style={styles.transactionItem}>
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: typeColors[item.type] + '20' },
        ]}
      >
        <Ionicons
          name={typeIcons[item.type] as any}
          size={20}
          color={typeColors[item.type]}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionCategory}>{item.category}</Text>
        <Text style={styles.transactionDate}>
          {format(new Date(item.transaction_at), 'dd/MM/yyyy HH:mm')}
          {item.payment_method && ` • ${item.payment_method.toUpperCase()}`}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.type === 'income' ? '#10b981' : '#ef4444' },
        ]}
      >
        {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
      </Text>
    </View>
  );
}

function CommissionItem({ item }: { item: any }) {
  return (
    <View style={styles.commissionItem}>
      <View style={styles.commissionHeader}>
        <Text style={styles.commissionName}>{item.name}</Text>
        <View
          style={[
            styles.commissionBadge,
            {
              backgroundColor: item.is_paid ? '#10b98120' : '#f59e0b20',
            },
          ]}
        >
          <Text
            style={[
              styles.commissionBadgeText,
              { color: item.is_paid ? '#10b981' : '#f59e0b' },
            ]}
          >
            {item.is_paid ? 'Pago' : 'Pendente'}
          </Text>
        </View>
      </View>
      <View style={styles.commissionDetails}>
        <Text style={styles.commissionDetail}>
          {item.total_appointments} atendimentos • Receita: R${' '}
          {item.gross_revenue.toFixed(2)}
        </Text>
        <Text style={styles.commissionTotal}>
          Comissão: R$ {item.commission_total.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// MODAL: Nova Transação
// ============================================================

function NewTransactionModal({
  visible,
  onClose,
  barbershopId,
}: {
  visible: boolean;
  onClose: () => void;
  barbershopId: string;
}) {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card' | 'other'>('pix');

  const createMutation = useCreateTransaction(barbershopId);

  const handleSave = async () => {
    if (!category.trim()) {
      Alert.alert('Erro', 'Informe a categoria');
      return;
    }
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }

    try {
      await createMutation.mutateAsync({
        barbershop_id: barbershopId,
        type,
        category: category.trim(),
        amount: amountNum,
        payment_method: paymentMethod,
        description: description.trim() || undefined,
      });

      // Reset form
      setCategory('');
      setAmount('');
      setDescription('');
      onClose();
      Alert.alert('Sucesso', 'Transação criada com sucesso');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar transação');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova Transação</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Tipo */}
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'income' && styles.typeButtonActiveIncome,
                ]}
                onPress={() => setType('income')}
              >
                <Ionicons
                  name="arrow-down"
                  size={18}
                  color={type === 'income' ? '#fff' : '#10b981'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Receita
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'expense' && styles.typeButtonActiveExpense,
                ]}
                onPress={() => setType('expense')}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={type === 'expense' ? '#fff' : '#ef4444'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Despesa
                </Text>
              </TouchableOpacity>
            </View>

            {/* Categoria */}
            <Text style={styles.label}>Categoria</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Corte, Barba, Aluguel..."
              placeholderTextColor="#6b7280"
              value={category}
              onChangeText={setCategory}
            />

            {/* Valor */}
            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            {/* Método de Pagamento */}
            <Text style={styles.label}>Método de Pagamento</Text>
            <View style={styles.paymentContainer}>
              {(['pix', 'cash', 'card', 'other'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentButton,
                    paymentMethod === method && styles.paymentButtonActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text
                    style={[
                      styles.paymentButtonText,
                      paymentMethod === method &&
                        styles.paymentButtonTextActive,
                    ]}
                  >
                    {method === 'pix'
                      ? 'PIX'
                      : method === 'cash'
                      ? 'Dinheiro'
                      : method === 'card'
                      ? 'Cartão'
                      : 'Outro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Descrição */}
            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observações..."
              placeholderTextColor="#6b7280"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveButton,
              createMutation.isPending && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// TELA PRINCIPAL
// ============================================================

export default function FinanceiroScreen() {
  const { barbershopId, role, professionalId } = useAuthStore();
  const [period, setPeriod] = useState<PeriodType>('month');
  const [activeTab, setActiveTab] = useState<'resumo' | 'comissoes' | 'transacoes'>('resumo');
  const [showNewTransaction, setShowNewTransaction] = useState(false);

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } =
    useFinancialSummary(barbershopId || '', period);
  const { data: commissions, isLoading: loadingCommissions } =
    useCommissions(barbershopId || '');
  const { data: transactions, isLoading: loadingTransactions } =
    useTransactions(barbershopId || '', 30, undefined, role === 'professional' ? professionalId : null);

  const onRefresh = async () => {
    await refetchSummary();
  };

  if (!barbershopId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financeiro</Text>
        {role !== 'professional' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowNewTransaction(true)}
          >
            <Ionicons name="add" size={24} color="#f59e0b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Período */}
      <View style={styles.periodSection}>
        <PeriodSelector selected={period} onSelect={setPeriod} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['resumo', 'comissoes', 'transacoes'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === 'resumo'
                ? 'Resumo'
                : tab === 'comissoes'
                ? 'Comissões'
                : 'Transações'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conteúdo */}
      {role === 'professional' && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="eye" size={20} color="#f59e0b" />
          <Text style={styles.readOnlyBannerText}>
            Visualização Somente Leitura — Suas Comissões e Serviços
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loadingSummary}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
          />
        }
      >
        {/* TAB: RESUMO */}
        {activeTab === 'resumo' && (
          <View style={styles.tabContent}>
            {role === 'professional' ? (
              loadingCommissions || !commissions ? (
                <ActivityIndicator size="large" color="#f59e0b" style={styles.loader} />
              ) : (
                (() => {
                  const myCommission = commissions.commissions.find(c => c.professional_id === professionalId);
                  const grossRevenue = myCommission?.gross_revenue || 0;
                  const netCommission = myCommission?.commission_total || 0;
                  const appointmentsCount = myCommission?.total_appointments || 0;
                  const avgTicket = appointmentsCount > 0 ? grossRevenue / appointmentsCount : 0;

                  return (
                    <>
                      {/* KPIs Pessoais */}
                      <View style={styles.metricsGrid}>
                        <MetricCard
                          icon="scissors"
                          label="Faturamento Serviços"
                          value={`R$ ${grossRevenue.toFixed(2)}`}
                          color="#10b981"
                        />
                        <MetricCard
                          icon="arrow-up"
                          label="Despesas"
                          value="R$ 0.00"
                          color="#ef4444"
                        />
                        <MetricCard
                          icon="cash"
                          label="Minha Comissão"
                          value={`R$ ${netCommission.toFixed(2)}`}
                          color="#f59e0b"
                        />
                        <MetricCard
                          icon="pricetag"
                          label="Ticket Médio"
                          value={`R$ ${avgTicket.toFixed(2)}`}
                          color="#3b82f6"
                        />
                      </View>

                      {/* Agendamentos do profissional */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          Meus Atendimentos Realizados
                        </Text>
                        <Text style={styles.sectionValue}>
                          {appointmentsCount} no período
                        </Text>
                      </View>
                    </>
                  );
                })()
              )
            ) : loadingSummary || !summary ? (
              <ActivityIndicator size="large" color="#f59e0b" style={styles.loader} />
            ) : (
              <>
                {/* KPIs */}
                <View style={styles.metricsGrid}>
                  <MetricCard
                    icon="arrow-down"
                    label="Receitas"
                    value={`R$ ${summary.total_income.toFixed(2)}`}
                    color="#10b981"
                  />
                  <MetricCard
                    icon="arrow-up"
                    label="Despesas"
                    value={`R$ ${summary.total_expense.toFixed(2)}`}
                    color="#ef4444"
                  />
                  <MetricCard
                    icon="wallet"
                    label="Lucro Líquido"
                    value={`R$ ${summary.net.toFixed(2)}`}
                    color={summary.net >= 0 ? '#10b981' : '#ef4444'}
                  />
                  <MetricCard
                    icon="pricetag"
                    label="Ticket Médio"
                    value={`R$ ${summary.avg_ticket.toFixed(2)}`}
                    color="#3b82f6"
                  />
                </View>

                {/* Agendamentos */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Agendamentos Finalizados
                  </Text>
                  <Text style={styles.sectionValue}>
                    {summary.appointments_count} no período
                  </Text>
                </View>

                {/* Por Método de Pagamento */}
                {summary.by_payment_method && summary.by_payment_method.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Por Método de Pagamento</Text>
                    {summary.by_payment_method.map((item) => (
                      <View key={item.method} style={styles.listItem}>
                        <Text style={styles.listItemLabel}>
                          {item.method === 'pix'
                            ? 'PIX'
                            : item.method === 'cash'
                            ? 'Dinheiro'
                            : item.method === 'card'
                            ? 'Cartão'
                            : 'Outro'}
                        </Text>
                        <Text style={styles.listItemValue}>
                          R$ {item.total.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Top Serviços */}
                {summary.top_services && summary.top_services.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top Serviços</Text>
                    {summary.top_services.map((s, i) => (
                      <View key={i} style={styles.listItem}>
                        <Text style={styles.listItemLabel}>{s.service_name}</Text>
                        <Text style={styles.listItemValue}>
                          R$ {s.revenue.toFixed(2)} ({s.count}x)
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Por Profissional */}
                {summary.by_professional && summary.by_professional.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Por Profissional</Text>
                    {summary.by_professional.map((p, i) => (
                      <View key={i} style={styles.listItem}>
                        <View style={styles.listItemLeft}>
                          <Text style={styles.listItemLabel}>{p.name}</Text>
                          <Text style={styles.listItemSubtext}>
                            {p.appointments} atendimentos
                          </Text>
                        </View>
                        <View style={styles.listItemRight}>
                          <Text style={styles.listItemValue}>
                            R$ {p.revenue.toFixed(2)}
                          </Text>
                          <Text style={styles.listItemSubtext}>
                            Comissão: R$ {p.commission.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* TAB: COMISSÕES */}
        {activeTab === 'comissoes' && (
          <View style={styles.tabContent}>
            {loadingCommissions || !commissions ? (
              <ActivityIndicator size="large" color="#f59e0b" style={styles.loader} />
            ) : (
              (() => {
                const displayedCommissions = role === 'professional'
                  ? commissions.commissions.filter(c => c.professional_id === professionalId)
                  : commissions.commissions;

                const totalDisplayedCommission = role === 'professional'
                  ? (displayedCommissions[0]?.commission_total || 0)
                  : commissions.total_commission;

                return (
                  <>
                    <View style={styles.commissionTotalCard}>
                      <Text style={styles.commissionTotalLabel}>
                        {role === 'professional' ? 'Minha Comissão Total' : 'Total em Comissões'}
                      </Text>
                      <Text style={styles.commissionTotalValue}>
                        R$ {totalDisplayedCommission.toFixed(2)}
                      </Text>
                      <Text style={styles.commissionPeriod}>
                        {format(new Date(commissions.period.start), 'dd/MM/yyyy')} -{' '}
                        {format(new Date(commissions.period.end), 'dd/MM/yyyy')}
                      </Text>
                    </View>

                    <View style={styles.commissionsList}>
                      {displayedCommissions.map((c) => (
                        <CommissionItem key={c.professional_id} item={c} />
                      ))}
                    </View>
                  </>
                );
              })()
            )}
          </View>
        )}

        {/* TAB: TRANSAÇÕES */}
        {activeTab === 'transacoes' && (
          <View style={styles.tabContent}>
            {loadingTransactions || !transactions ? (
              <ActivityIndicator size="large" color="#f59e0b" style={styles.loader} />
            ) : (
              <View style={styles.transactionsList}>
                {transactions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt" size={48} color="#6b7280" />
                    <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
                  </View>
                ) : (
                  transactions.map((t) => (
                    <TransactionItem key={t.id} item={t} />
                  ))
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Modal Nova Transação */}
      <NewTransactionModal
        visible={showNewTransaction}
        onClose={() => setShowNewTransaction(false)}
        barbershopId={barbershopId}
      />
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d2d',
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3d3d3d',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#f59e0b',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  periodTextActive: {
    color: '#1a1a1a',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#f59e0b',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loader: {
    marginTop: 48,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  sectionValue: {
    fontSize: 14,
    color: '#9ca3af',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemLabel: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  listItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  // Comissões
  commissionTotalCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  commissionTotalLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  commissionTotalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f59e0b',
    marginTop: 8,
  },
  commissionPeriod: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  commissionsList: {
    gap: 8,
  },
  commissionItem: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  commissionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commissionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commissionDetails: {
    gap: 4,
  },
  commissionDetail: {
    fontSize: 13,
    color: '#9ca3af',
  },
  commissionTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginTop: 4,
  },
  // Transações
  transactionsList: {
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginTop: 12,
    marginBottom: 6,
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
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3d3d3d',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#10b981',
  },
  typeButtonActiveExpense: {
    backgroundColor: '#ef4444',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  paymentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3d3d3d',
  },
  paymentButtonActive: {
    backgroundColor: '#f59e0b',
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  paymentButtonTextActive: {
    color: '#1a1a1a',
  },
  saveButton: {
    margin: 16,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 48,
  },
  readOnlyBanner: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readOnlyBannerText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
