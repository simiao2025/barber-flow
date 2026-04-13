// ============================================================
// BARBEAR-FLOW: Schema Drizzle ORM (TypeScript)
// Mapeamento completo das tabelas do Supabase
// ============================================================

import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// ENUMS
// ============================================================

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'done',
  'cancelled',
  'no_show',
]);

export const appointmentSourceEnum = pgEnum('appointment_source', [
  'whatsapp',
  'manual',
  'app',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'commission',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'pix',
  'card',
  'other',
]);

export const clientSourceEnum = pgEnum('client_source', [
  'whatsapp',
  'manual',
]);

export const followUpTypeEnum = pgEnum('follow_up_type', [
  'reminder_24h',
  'reminder_1h',
  'post_service',
  'reactivation_30d',
  'reactivation_60d',
  'reactivation_90d',
]);

export const followUpStatusEnum = pgEnum('follow_up_status', [
  'pending',
  'sent',
  'failed',
]);

export const aiIntentEnum = pgEnum('ai_intent', [
  'agendamento',
  'cancelamento',
  'reativacao',
  'duvida',
  'elogio',
  'reclamacao',
  'outro',
]);

export const barbershopPlanEnum = pgEnum('barbershop_plan', [
  'free',
  'basic',
  'premium',
  'enterprise',
]);

export const serviceCategoryEnum = pgEnum('service_category', [
  'corte',
  'barba',
  'combo',
  'sobrancelha',
  'pigmentacao',
  'hidratacao',
  'outro',
]);

export const productCategoryEnum = pgEnum('product_category', [
  'pomada',
  'gel',
  'oleo',
  'shampoo',
  'balm',
  'acessorio',
  'outro',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'new_appointment',
  'human_handoff',
  'low_stock',
  'follow_up_failed',
  'daily_summary',
]);

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'in',
  'out',
  'adjustment',
]);

export const deviceOsEnum = pgEnum('device_os_type', [
  'ios',
  'android',
  'web',
]);

// ============================================================
// TABELAS PRINCIPAIS
// ============================================================

// ----------------------------------------------------------
// BARBERSHOPS
// ----------------------------------------------------------
export const barbershops = pgTable('barbershops', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: uuid('owner_id')
    .notNull(),
    // .references(() => authUsers.id, { onDelete: 'cascade' }),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  workingHours: jsonb('working_hours').$type<WorkingHours>().default({
    segunda: { open: '09:00', close: '18:00' },
    terca: { open: '09:00', close: '18:00' },
    quarta: { open: '09:00', close: '18:00' },
    quinta: { open: '09:00', close: '18:00' },
    sexta: { open: '09:00', close: '18:00' },
    sabado: { open: '09:00', close: '13:00' },
    domingo: null,
  }),
  settings: jsonb('settings').$type<BarbershopSettings>().default({}),
  plan: barbershopPlanEnum('plan').notNull().default('free'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// PROFESSIONALS
// ----------------------------------------------------------
export const professionals = pgTable('professionals', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  serviceIds: uuid('service_ids').array(),
  workingHours: jsonb('working_hours').$type<WorkingHours>(),
  commissionPct: numeric('commission_pct', { precision: 5, scale: 2 }).default(
    '50.00'
  ),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// SERVICES
// ----------------------------------------------------------
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  durationMin: integer('duration_min').notNull(),
  category: serviceCategoryEnum('category').default('outro'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// CLIENTS
// ----------------------------------------------------------
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  notes: text('notes'),
  totalVisits: integer('total_visits').notNull().default(0),
  lastVisitAt: timestamp('last_visit_at'),
  createdBy: clientSourceEnum('created_by').notNull().default('manual'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// APPOINTMENTS
// ----------------------------------------------------------
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  professionalId: uuid('professional_id')
    .notNull()
    .references(() => professionals.id, { onDelete: 'restrict' }),
  serviceIds: uuid('service_ids').array().notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMin: integer('duration_min').notNull(),
  status: appointmentStatusEnum('status').notNull().default('pending'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  source: appointmentSourceEnum('source').notNull().default('manual'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// PRODUCTS
// ----------------------------------------------------------
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 255 }),
  priceSale: numeric('price_sale', { precision: 10, scale: 2 }).notNull(),
  priceCost: numeric('price_cost', { precision: 10, scale: 2 }),
  stockQty: integer('stock_qty').notNull().default(0),
  stockMin: integer('stock_min').notNull().default(5),
  category: productCategoryEnum('category').default('outro'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// FINANCIAL_TRANSACTIONS
// ----------------------------------------------------------
export const financialTransactions = pgTable('financial_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  type: transactionTypeEnum('type').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method')
    .notNull()
    .default('other'),
  description: text('description'),
  transactionAt: timestamp('transaction_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// AI_CONVERSATIONS
// ----------------------------------------------------------
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, {
    onDelete: 'set null',
  }),
  phone: varchar('phone', { length: 20 }),
  messages: jsonb('messages').$type<AIMessage[]>().default([]),
  intentLast: aiIntentEnum('intent_last').default('outro'),
  followUpAt: timestamp('follow_up_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// FOLLOW_UPS
// ----------------------------------------------------------
export const followUps = pgTable('follow_ups', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  type: followUpTypeEnum('type').notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  sentAt: timestamp('sent_at'),
  status: followUpStatusEnum('status').notNull().default('pending'),
});

// ============================================================
// TABELAS NOVAS (Fase 2-3)
// ============================================================

// ----------------------------------------------------------
// PUSH_TOKENS
// ----------------------------------------------------------
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  barbershopId: uuid('barbershop_id').references(() => barbershops.id, {
    onDelete: 'cascade',
  }),
  expoToken: text('expo_token').notNull(),
  deviceOs: deviceOsEnum('device_os').notNull().default('android'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------------
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id'),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }),
  body: text('body'),
  data: jsonb('data').$type<Record<string, unknown>>().default({}),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// NOTIFICATIONS_LOG
// ----------------------------------------------------------
export const notificationsLog = pgTable('notifications_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  tokensCount: integer('tokens_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failedTokens: text('failed_tokens').array(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
});

// ----------------------------------------------------------
// PRODUCT_STOCK_MOVEMENTS
// ----------------------------------------------------------
export const productStockMovements = pgTable('product_stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  type: stockMovementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// AUTH (Referência à tabela auth.users do Supabase)
// ============================================================

// Auth users (referência simplificada - em produção usar a tabela auth.users do Supabase diretamente)
// Esta tabela é apenas para referência de tipos. O acesso real é via Supabase Auth.
export const authUsers = {
  id: 'id' as const,
  email: 'email' as const,
  createdAt: 'created_at' as const,
  tableName: 'auth.users',
};

// ============================================================
// TIPOS TYPESCRIPT
// ============================================================

// Tipos para JSONB working_hours
export type WorkingHours = {
  segunda?: DayHours | null;
  terca?: DayHours | null;
  quarta?: DayHours | null;
  quinta?: DayHours | null;
  sexta?: DayHours | null;
  sabado?: DayHours | null;
  domingo?: DayHours | null;
};

export type DayHours = {
  open: string; // HH:mm
  close: string; // HH:mm
} | null;

// Tipos para mensagens de IA
export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

// Tipo para settings da barbearia
export type BarbershopSettings = {
  whatsappEnabled?: boolean;
  aiEnabled?: boolean;
  currency?: string;
  timezone?: string;
  requireConfirmation?: boolean;
  allowOnlineBooking?: boolean;
};

// Tipos para slots disponíveis
export type AvailableSlot = {
  professional_id: string;
  professional_name: string;
  available_slot: Date;
  slot_end: Date;
  duration_min: number;
  slot_date: Date;
};

// Tipos para dashboard
export type DashboardToday = {
  kpis: {
    appointments_confirmed: number;
    appointments_total: number;
    revenue_today: number;
    new_clients_whatsapp: number;
  };
  next_appointment: {
    client_name: string;
    service: string;
    scheduled_at: string;
    professional_name: string;
  } | null;
  alerts: {
    inactive_clients_count: number;
    low_stock_count: number;
    pending_handoff_count: number;
  };
};

// Tipos inferidos do Drizzle
export type Barbershop = typeof barbershops.$inferSelect;
export type NewBarbershop = typeof barbershops.$inferInsert;

export type Professional = typeof professionals.$inferSelect;
export type NewProfessional = typeof professionals.$inferInsert;

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type NewFinancialTransaction = typeof financialTransactions.$inferInsert;

export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;

export type FollowUp = typeof followUps.$inferSelect;
export type NewFollowUp = typeof followUps.$inferInsert;

export type PushToken = typeof pushTokens.$inferSelect;
export type NewPushToken = typeof pushTokens.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type NotificationLog = typeof notificationsLog.$inferSelect;
export type NewNotificationLog = typeof notificationsLog.$inferInsert;

export type ProductStockMovement = typeof productStockMovements.$inferSelect;
export type NewProductStockMovement = typeof productStockMovements.$inferInsert;

// ============================================================
// RELACIONAMENTOS (para usar com Drizzle relations)
// ============================================================

// Barbershop -> Todos os relacionamentos
export const barbershopRelations = relations(barbershops, ({ many }) => ({
  professionals: many(professionals),
  services: many(services),
  clients: many(clients),
  appointments: many(appointments),
  products: many(products),
  financialTransactions: many(financialTransactions),
  aiConversations: many(aiConversations),
  followUps: many(followUps),
  pushTokens: many(pushTokens),
  notifications: many(notifications),
  notificationsLog: many(notificationsLog),
  productStockMovements: many(productStockMovements),
}));

// Professional -> Barbershop
export const professionalRelations = relations(professionals, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [professionals.barbershopId],
    references: [barbershops.id],
  }),
}));

// Service -> Barbershop
export const serviceRelations = relations(services, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [services.barbershopId],
    references: [barbershops.id],
  }),
}));

// Client -> Barbershop + Appointments
export const clientRelations = relations(clients, ({ one, many }) => ({
  barbershop: one(barbershops, {
    fields: [clients.barbershopId],
    references: [barbershops.id],
  }),
  appointments: many(appointments),
  followUps: many(followUps),
  aiConversations: many(aiConversations),
}));

// Appointment -> Barbershop + Client + Professional
export const appointmentRelations = relations(appointments, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [appointments.barbershopId],
    references: [barbershops.id],
  }),
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  professional: one(professionals, {
    fields: [appointments.professionalId],
    references: [professionals.id],
  }),
}));

// Product -> Barbershop + StockMovements
export const productRelations = relations(products, ({ one, many }) => ({
  barbershop: one(barbershops, {
    fields: [products.barbershopId],
    references: [barbershops.id],
  }),
  stockMovements: many(productStockMovements),
}));

// FinancialTransaction -> Barbershop + Appointment
export const financialTransactionRelations = relations(
  financialTransactions,
  ({ one }) => ({
    barbershop: one(barbershops, {
      fields: [financialTransactions.barbershopId],
      references: [barbershops.id],
    }),
    appointment: one(appointments, {
      fields: [financialTransactions.appointmentId],
      references: [appointments.id],
    }),
  })
);

// AIConversation -> Barbershop + Client
export const aiConversationRelations = relations(aiConversations, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [aiConversations.barbershopId],
    references: [barbershops.id],
  }),
  client: one(clients, {
    fields: [aiConversations.clientId],
    references: [clients.id],
  }),
}));

// FollowUp -> Barbershop + Client + Appointment
export const followUpRelations = relations(followUps, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [followUps.barbershopId],
    references: [barbershops.id],
  }),
  client: one(clients, {
    fields: [followUps.clientId],
    references: [clients.id],
  }),
  appointment: one(appointments, {
    fields: [followUps.appointmentId],
    references: [appointments.id],
  }),
}));

// PushToken -> Barbershop
export const pushTokenRelations = relations(pushTokens, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [pushTokens.barbershopId],
    references: [barbershops.id],
  }),
}));

// Notification -> Barbershop
export const notificationRelations = relations(notifications, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [notifications.barbershopId],
    references: [barbershops.id],
  }),
}));

// ProductStockMovement -> Product + Barbershop
export const productStockMovementRelations = relations(
  productStockMovements,
  ({ one }) => ({
    product: one(products, {
      fields: [productStockMovements.productId],
      references: [products.id],
    }),
    barbershop: one(barbershops, {
      fields: [productStockMovements.barbershopId],
      references: [barbershops.id],
    }),
  })
);

// ============================================================
// EXPORTS PARA USO NO CÓDIGO
// ============================================================

export const schema = {
  // Tabelas principais
  barbershops,
  professionals,
  services,
  clients,
  appointments,
  products,
  financialTransactions,
  aiConversations,
  followUps,
  // Tabelas novas
  pushTokens,
  notifications,
  notificationsLog,
  productStockMovements,
  // Auth (usar Supabase Auth diretamente)
  // authUsers removido
  // Enums
  appointmentStatusEnum,
  appointmentSourceEnum,
  transactionTypeEnum,
  paymentMethodEnum,
  clientSourceEnum,
  followUpTypeEnum,
  followUpStatusEnum,
  aiIntentEnum,
  barbershopPlanEnum,
  serviceCategoryEnum,
  productCategoryEnum,
  notificationTypeEnum,
  stockMovementTypeEnum,
  deviceOsEnum,
  // Relations
  barbershopRelations,
  professionalRelations,
  serviceRelations,
  clientRelations,
  appointmentRelations,
  productRelations,
  financialTransactionRelations,
  aiConversationRelations,
  followUpRelations,
  pushTokenRelations,
  notificationRelations,
  productStockMovementRelations,
};
