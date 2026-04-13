-- ============================================================
-- BARBEAR-FLOW: Trigger para alerta de estoque baixo
-- Executa automaticamente quando stock_qty <= stock_min
-- ============================================================

-- Função para criar notificação de estoque baixo
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se estoque ficou baixo após update
  IF TG_OP = 'UPDATE' AND NEW.stock_qty <= NEW.stock_min AND (OLD.stock_qty > OLD.stock_min OR OLD.stock_qty IS NULL) THEN
    -- Cria notificação
    INSERT INTO notifications (barbershop_id, owner_id, type, title, body, data)
    SELECT
      NEW.barbershop_id,
      b.owner_id,
      'low_stock',
      'Estoque crítico: ' || NEW.name,
      'Estoque atual: ' || NEW.stock_qty || ' (mínimo: ' || NEW.stock_min || ')',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'new_stock', NEW.stock_qty,
        'stock_min', NEW.stock_min
      )
    FROM barbershops b
    WHERE b.id = NEW.barbershop_id;

  -- Se produto novo já veio com estoque baixo
  ELSIF TG_OP = 'INSERT' AND NEW.stock_qty <= NEW.stock_min THEN
    INSERT INTO notifications (barbershop_id, owner_id, type, title, body, data)
    SELECT
      NEW.barbershop_id,
      b.owner_id,
      'low_stock',
      'Estoque crítico: ' || NEW.name,
      'Produto cadastrado com estoque baixo: ' || NEW.stock_qty || ' (mínimo: ' || NEW.stock_min || ')',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'new_stock', NEW.stock_qty,
        'stock_min', NEW.stock_min
      )
    FROM barbershops b
    WHERE b.id = NEW.barbershop_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Cria trigger na tabela products
DROP TRIGGER IF EXISTS trg_low_stock_alert ON products;
CREATE TRIGGER trg_low_stock_alert
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

-- ============================================================
-- TABELA: product_stock_movements (se ainda não existir)
-- ============================================================
-- Esta tabela já deve existir no schema principal
-- Se não existir, descomente:
/*
CREATE TABLE IF NOT EXISTS product_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES barbershops(id),
  product_id uuid NOT NULL REFERENCES products(id),
  type text CHECK (type IN ('in', 'out', 'adjustment')),
  qty int NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
*/
