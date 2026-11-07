import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const adminProfiles = pgTable('admin_profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default('Administrator'),
  role: text('role').notNull().default('admin'),
  passwordHash: text('password_hash'),
  sessionToken: text('session_token'),
  resetCode: text('reset_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  size: text('size').notNull(),
  imageUrl: text('image_url').notNull(),
  price: integer('price').notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  changeAmount: integer('change_amount').notNull(),
  actionType: text('action_type').notNull(), // 'ADD' | 'REMOVE' | 'ADJUST' | 'INITIAL'
  adminId: text('admin_id').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const businessSettings = pgTable('business_settings', {
  id: serial('id').primaryKey(),
  businessName: text('business_name').notNull().default('SONU DIESEL BHATTI'),
  logoUrl: text('logo_url').notNull().default('/icon.svg'),
  whatsappNumber: text('whatsapp_number').notNull().default('919876543210'),
  defaultLanguage: text('default_language').notNull().default('en'),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ many }) => ({
  movements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}));
