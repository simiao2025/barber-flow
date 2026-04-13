// ============================================================
// BARBEAR-FLOW: Hook useProducts
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';

// ============================================================
// TIPOS
// ============================================================

export type ProductFilter = 'all' | 'low_stock' | 'active';

export interface StockMovementDto {
  barbershop_id: string;
  product_id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
}

// ============================================================
// BUSCAR PRODUTOS
// ============================================================

async function fetchProducts(
  barbershopId: string,
  filter: ProductFilter = 'all'
) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true });

  if (filter === 'active') {
    query = query.eq('is_active', true);
  } else if (filter === 'low_stock') {
    query = query.lt('stock_qty', supabase.rpc('stock_min' as any));
    // Fallback: filter client-side se necessario
  }

  const { data, error } = await query;
  if (error) throw error;

  let products = data as Product[];

  // Filtro de estoque baixo client-side
  if (filter === 'low_stock') {
    products = products.filter((p) => p.stock_qty <= p.stock_min);
  }

  return products;
}

// ============================================================
// REGISTRAR MOVIMENTAÇÃO DE ESTOQUE
// ============================================================

async function registerStockMovement(dto: StockMovementDto) {
  const { data, error } = await supabase
    .from('product_stock_movements')
    .insert(dto)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// ATUALIZAR ESTOQUE
// ============================================================

async function updateProductStock(
  productId: string,
  newQuantity: number
) {
  const { data, error } = await supabase
    .from('products')
    .update({ stock_qty: newQuantity })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Listar produtos
 */
export function useProducts(
  barbershopId: string,
  filter: ProductFilter = 'all'
) {
  return useQuery({
    queryKey: ['products', barbershopId, filter],
    queryFn: () => fetchProducts(barbershopId, filter),
    staleTime: 2 * 60 * 1000,
    enabled: !!barbershopId,
  });
}

/**
 * Registrar movimentação de estoque
 */
export function useStockMovement(barbershopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: StockMovementDto) => {
      // 1. Registrar movimentação
      const movement = await registerStockMovement(dto);

      // 2. Buscar produto atual
      const { data: product } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', dto.product_id)
        .single();

      if (!product) throw new Error('Produto não encontrado');

      // 3. Atualizar estoque
      let newQuantity: number;
      if (dto.type === 'in') {
        newQuantity = product.stock_qty + dto.quantity;
      } else if (dto.type === 'out') {
        newQuantity = product.stock_qty - dto.quantity;
      } else {
        // adjustment - define diretamente
        newQuantity = dto.quantity;
      }

      await updateProductStock(dto.product_id, Math.max(0, newQuantity));

      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['products', barbershopId],
      });
    },
  });
}
