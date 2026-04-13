// ============================================================
// BARBEAR-FLOW: Tela de Produtos — Estoque e Movimentações
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useStockMovement, type ProductFilter } from '../../hooks/useProducts';
import { useAuthStore } from '../../stores/auth.store';
import type { Product } from '../../types/database';

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function ProductCard({
  product,
  onStockMovement,
}: {
  product: Product;
  onStockMovement: (productId: string, type: 'in' | 'out') => void;
}) {
  const stockLevel = product.stock_qty <= product.stock_min ? 'low' : 'ok';
  const stockPercent =
    product.stock_min > 0
      ? Math.min(100, (product.stock_qty / (product.stock_min * 2)) * 100)
      : 100;

  return (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand && (
            <Text style={styles.productBrand}>{product.brand}</Text>
          )}
        </View>
        {!product.is_active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inativo</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>Preço de Venda</Text>
          <Text style={styles.priceValue}>R$ {product.price_sale.toFixed(2)}</Text>
        </View>
        {product.price_cost && (
          <View>
            <Text style={styles.priceLabel}>Preço de Custo</Text>
            <Text style={styles.costValue}>R$ {product.price_cost.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* Barra de estoque */}
      <View style={styles.stockSection}>
        <View style={styles.stockHeader}>
          <Text style={styles.stockLabel}>Estoque</Text>
          <Text
            style={[
              styles.stockValue,
              stockLevel === 'low' && styles.stockValueLow,
            ]}
          >
            {product.stock_qty} un.
          </Text>
        </View>
        <View style={styles.stockBar}>
          <View
            style={[
              styles.stockBarFill,
              {
                width: `${stockPercent}%`,
                backgroundColor: stockLevel === 'low' ? '#ef4444' : '#10b981',
              },
            ]}
          />
        </View>
        <Text style={styles.stockMinText}>
          Mínimo: {product.stock_min} un.
        </Text>
      </View>

      {/* Ações de estoque */}
      {product.is_active && (
        <View style={styles.stockActions}>
          <TouchableOpacity
            style={[styles.stockButton, styles.stockButtonIn]}
            onPress={() => onStockMovement(product.id, 'in')}
          >
            <Ionicons name="add" size={16} color="#10b981" />
            <Text style={styles.stockButtonTextIn}>Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stockButton, styles.stockButtonOut]}
            onPress={() => onStockMovement(product.id, 'out')}
          >
            <Ionicons name="remove" size={16} color="#f59e0b" />
            <Text style={styles.stockButtonTextOut}>Saída</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================================
// MODAL: Movimentação de Estoque
// ============================================================

function StockMovementModal({
  visible,
  onClose,
  productId,
  productName,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string;
  onConfirm: (type: 'in' | 'out' | 'adjustment', quantity: number, reason: string) => void;
}) {
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Erro', 'Informe uma quantidade válida');
      return;
    }
    onConfirm(type, qty, reason.trim());
    setQuantity('');
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Movimentação de Estoque</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.productSelected}>{productName}</Text>

            <Text style={styles.label}>Tipo de Movimentação</Text>
            <View style={styles.typeContainer}>
              {(
                [
                  { key: 'in', label: 'Entrada', icon: 'add-circle' },
                  { key: 'out', label: 'Saída', icon: 'remove-circle' },
                  { key: 'adjustment', label: 'Ajuste', icon: 'settings' },
                ] as const
              ).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeButton,
                    type === t.key && styles.typeButtonActive,
                  ]}
                  onPress={() => setType(t.key)}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={18}
                    color={type === t.key ? '#1a1a1a' : '#9ca3af'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === t.key && styles.typeButtonTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantidade</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />

            <Text style={styles.label}>Motivo (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Reposição, perda, inventário..."
              placeholderTextColor="#6b7280"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// TELA PRINCIPAL
// ============================================================

export default function ProdutosScreen() {
  const { barbershopId } = useAuthStore();
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [movementModal, setMovementModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: products, isLoading, refetch } = useProducts(
    barbershopId || '',
    filter
  );
  const stockMutation = useStockMovement(barbershopId || '');

  const filters: { key: ProductFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Todos', icon: 'cube' },
    { key: 'active', label: 'Ativos', icon: 'checkmark-circle' },
    { key: 'low_stock', label: 'Estoque Baixo', icon: 'warning' },
  ];

  const handleStockMovement = (productId: string, type: 'in' | 'out') => {
    const product = products?.find((p) => p.id === productId);
    if (product) {
      setSelectedProduct({ id: productId, name: product.name });
      setMovementModal(true);
    }
  };

  const handleConfirmMovement = async (
    type: 'in' | 'out' | 'adjustment',
    quantity: number,
    reason: string
  ) => {
    if (!selectedProduct) return;

    try {
      await stockMutation.mutateAsync({
        barbershop_id: barbershopId || '',
        product_id: selectedProduct.id,
        type,
        quantity,
        reason: reason || undefined,
      });
      Alert.alert('Sucesso', 'Movimentação registrada');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao registrar movimentação');
    }
  };

  const onRefresh = async () => {
    await refetch();
  };

  const lowStockCount = products?.filter((p) => p.stock_qty <= p.stock_min).length || 0;

  if (!barbershopId) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Produtos</Text>
        {lowStockCount > 0 && (
          <View style={styles.lowStockBadge}>
            <Ionicons name="warning" size={14} color="#f59e0b" />
            <Text style={styles.lowStockText}>{lowStockCount} crítico</Text>
          </View>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons
              name={f.icon as any}
              size={16}
              color={filter === f.key ? '#1a1a1a' : '#9ca3af'}
            />
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
      ) : (
        <FlatList
          data={products || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onStockMovement={handleStockMovement}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor="#f59e0b"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>
                Nenhum produto cadastrado
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de Movimentação */}
      <StockMovementModal
        visible={movementModal}
        onClose={() => {
          setMovementModal(false);
          setSelectedProduct(null);
        }}
        productId={selectedProduct?.id || null}
        productName={selectedProduct?.name || ''}
        onConfirm={handleConfirmMovement}
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
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f59e0b20',
    borderRadius: 16,
  },
  lowStockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#2d2d2d',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#3d3d3d',
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  filterTextActive: {
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  productBrand: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  inactiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ef444420',
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  stockSection: {
    marginBottom: 12,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stockLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  stockValueLow: {
    color: '#ef4444',
  },
  stockBar: {
    height: 8,
    backgroundColor: '#3d3d3d',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  stockMinText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  stockActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  stockButtonIn: {
    borderColor: '#10b981',
    backgroundColor: '#10b98110',
  },
  stockButtonOut: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b10',
  },
  stockButtonTextIn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  stockButtonTextOut: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
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
    maxHeight: '70%',
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
  productSelected: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 12,
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
    height: 60,
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
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3d3d3d',
  },
  typeButtonActive: {
    backgroundColor: '#f59e0b',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  typeButtonTextActive: {
    color: '#1a1a1a',
  },
  confirmButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
});
