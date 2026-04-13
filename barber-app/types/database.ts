// ============================================================
// BARBEAR-FLOW: Tipos do banco de dados (gerados)
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      barbershops: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          whatsapp_number: string | null;
          working_hours: Json | null;
          settings: Json | null;
          plan: 'free' | 'basic' | 'premium' | 'enterprise';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables<'barbershops'>, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables<'barbershops'>>;
      };
      professionals: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          avatar_url: string | null;
          service_ids: string[] | null;
          working_hours: Json | null;
          commission_pct: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables<'professionals'>, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables<'professionals'>>;
      };
      services: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_min: number;
          category: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables<'services'>, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables<'services'>>;
      };
      clients: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          total_visits: number;
          last_visit_at: string | null;
          created_by: 'whatsapp' | 'manual';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables<'clients'>, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables<'clients'>>;
      };
      appointments: {
        Row: {
          id: string;
          barbershop_id: string;
          client_id: string;
          professional_id: string;
          service_ids: string[];
          scheduled_at: string;
          duration_min: number;
          status: 'pending' | 'confirmed' | 'done' | 'cancelled' | 'no_show';
          total_price: number;
          source: 'whatsapp' | 'manual' | 'app';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables<'appointments'>, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables<'appointments'>>;
      };
      products: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          brand: string | null;
          price_sale: number;
          price_cost: number | null;
          stock_qty: number;
          stock_min: number;
          category: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables<'products'>, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables<'products'>>;
      };
      financial_transactions: {
        Row: {
          id: string;
          barbershop_id: string;
          appointment_id: string | null;
          type: 'income' | 'expense' | 'commission';
          category: string;
          amount: number;
          payment_method: 'cash' | 'pix' | 'card' | 'other';
          description: string | null;
          transaction_at: string;
          created_at: string;
        };
        Insert: Omit<Tables<'financial_transactions'>, 'id' | 'created_at'>;
        Update: Partial<Tables<'financial_transactions'>>;
      };
      follow_ups: {
        Row: {
          id: string;
          barbershop_id: string;
          client_id: string;
          appointment_id: string | null;
          type: 'reminder_24h' | 'reminder_1h' | 'post_service' | 'reactivation_30d' | 'reactivation_60d' | 'reactivation_90d';
          scheduled_for: string;
          sent_at: string | null;
          status: 'pending' | 'sent' | 'failed';
        };
        Insert: Omit<Tables<'follow_ups'>, 'id'>;
        Update: Partial<Tables<'follow_ups'>>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export type Barbershop = Tables<'barbershops'>;
export type Professional = Tables<'professionals'>;
export type Service = Tables<'services'>;
export type Client = Tables<'clients'>;
export type Appointment = Tables<'appointments'>;
export type Product = Tables<'products'>;
export type FinancialTransaction = Tables<'financial_transactions'>;
export type FollowUp = Tables<'follow_ups'>;
