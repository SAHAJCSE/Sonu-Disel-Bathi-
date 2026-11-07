import crypto from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adminProfiles,
  businessSettings,
  products,
  stockMovements,
} from './schema.ts';

export function hashAdminPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(`sonu_bhatti_salt:${password}`)
    .digest('hex');
}

export async function getAllAdmins() {
  try {
    return await db
      .select({
        id: adminProfiles.id,
        uid: adminProfiles.uid,
        email: adminProfiles.email,
        name: adminProfiles.name,
        role: adminProfiles.role,
        createdAt: adminProfiles.createdAt,
      })
      .from(adminProfiles)
      .orderBy(adminProfiles.id);
  } catch (error) {
    console.error('Database query failed in getAllAdmins:', error);
    throw new Error('Failed to load admin profiles.', { cause: error });
  }
}

export async function getAdminBySessionToken(token: string) {
  try {
    const rows = await db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.sessionToken, token));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getAdminBySessionToken:', error);
    throw new Error('Failed to verify admin session.', { cause: error });
  }
}

export async function getOrLinkAuthorizedAdmin(uid: string, email: string, displayName?: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingByEmail = await db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.email, normalizedEmail));

    if (existingByEmail.length > 0) {
      // Link Firebase UID using upsert on email
      const updated = await db
        .insert(adminProfiles)
        .values({
          uid,
          email: normalizedEmail,
          name: displayName || existingByEmail[0].name,
          role: 'admin',
        })
        .onConflictDoUpdate({
          target: adminProfiles.email,
          set: {
            uid,
            name: displayName || existingByEmail[0].name,
          },
        })
        .returning();
      return updated[0];
    }

    // Check if fewer than 2 admins exist
    const allAdmins = await db.select().from(adminProfiles);
    if (allAdmins.length < 2) {
      const created = await db
        .insert(adminProfiles)
        .values({
          uid,
          email: normalizedEmail,
          name: displayName || 'Administrator',
          role: 'admin',
        })
        .onConflictDoUpdate({
          target: adminProfiles.uid,
          set: {
            email: normalizedEmail,
          },
        })
        .returning();
      return created[0];
    }

    // Strictly enforce the Two-Admin limit
    return null;
  } catch (error) {
    console.error('Database query failed in getOrLinkAuthorizedAdmin:', error);
    throw new Error('Failed to verify administrator authorization.', { cause: error });
  }
}

export async function loginAdminWithPassword(emailOrSlot: string, password: string) {
  try {
    const normalized = emailOrSlot.trim().toLowerCase();
    const allAdmins = await db.select().from(adminProfiles).orderBy(adminProfiles.id);

    let targetAdmin = allAdmins.find((a) => a.email.toLowerCase() === normalized);
    if (!targetAdmin && (normalized === 'admin1' || normalized === 'admin 1')) {
      targetAdmin = allAdmins[0];
    } else if (!targetAdmin && (normalized === 'admin2' || normalized === 'admin 2')) {
      targetAdmin = allAdmins[1];
    }

    if (!targetAdmin || !targetAdmin.passwordHash) {
      return null;
    }

    const expectedHash = hashAdminPassword(password);
    if (targetAdmin.passwordHash !== expectedHash) {
      return null;
    }

    const sessionToken = `sdb_sess_${crypto.randomBytes(24).toString('hex')}`;
    const updated = await db
      .update(adminProfiles)
      .set({ sessionToken })
      .where(eq(adminProfiles.id, targetAdmin.id))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database query failed in loginAdminWithPassword:', error);
    throw new Error('Authentication query failed.', { cause: error });
  }
}

export async function clearAdminSession(adminId: number) {
  try {
    await db
      .update(adminProfiles)
      .set({ sessionToken: null })
      .where(eq(adminProfiles.id, adminId));
  } catch (error) {
    console.error('Database query failed in clearAdminSession:', error);
    throw new Error('Failed to clear session.', { cause: error });
  }
}

export async function resetAdminPassword(email: string, newPassword: string, secondAdminEmailVerify: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSecond = secondAdminEmailVerify.trim().toLowerCase();

    const allAdmins = await db.select().from(adminProfiles).orderBy(adminProfiles.id);
    const targetAdmin = allAdmins.find((a) => a.email.toLowerCase() === normalizedEmail);
    const coAdmin = allAdmins.find(
      (a) => a.id !== targetAdmin?.id && a.email.toLowerCase() === normalizedSecond
    );

    if (!targetAdmin || !coAdmin) {
      return false;
    }

    const passwordHash = hashAdminPassword(newPassword);
    await db
      .update(adminProfiles)
      .set({ passwordHash, sessionToken: null })
      .where(eq(adminProfiles.id, targetAdmin.id));

    return true;
  } catch (error) {
    console.error('Database query failed in resetAdminPassword:', error);
    throw new Error('Failed to reset administrator password.', { cause: error });
  }
}

export async function updateAdminProfileConfig(
  adminId: number,
  newEmail: string,
  newName: string,
  newPassword?: string
) {
  try {
    const updatePayload: Partial<typeof adminProfiles.$inferInsert> = {
      email: newEmail.trim().toLowerCase(),
      name: newName.trim(),
    };
    if (newPassword && newPassword.trim().length >= 6) {
      updatePayload.passwordHash = hashAdminPassword(newPassword.trim());
    }

    const updated = await db
      .update(adminProfiles)
      .set(updatePayload)
      .where(eq(adminProfiles.id, adminId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateAdminProfileConfig:', error);
    throw new Error('Failed to update administrator profile.', { cause: error });
  }
}

export async function getPublicProducts() {
  try {
    return await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(products.id);
  } catch (error) {
    console.error('Database query failed in getPublicProducts:', error);
    throw new Error('Failed to load product catalogue.', { cause: error });
  }
}

export async function getAllProductsForAdmin() {
  try {
    return await db.select().from(products).orderBy(products.id);
  } catch (error) {
    console.error('Database query failed in getAllProductsForAdmin:', error);
    throw new Error('Failed to load admin product inventory.', { cause: error });
  }
}

export async function getRecentStockMovements(limitCount = 40) {
  try {
    const movements = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        productSize: products.size,
        previousQuantity: stockMovements.previousQuantity,
        newQuantity: stockMovements.newQuantity,
        changeAmount: stockMovements.changeAmount,
        actionType: stockMovements.actionType,
        adminId: stockMovements.adminId,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limitCount);
    return movements;
  } catch (error) {
    console.error('Database query failed in getRecentStockMovements:', error);
    throw new Error('Failed to load stock movement history.', { cause: error });
  }
}

export async function getBusinessSettings() {
  try {
    const rows = await db.select().from(businessSettings).orderBy(businessSettings.id);
    if (rows.length > 0) {
      return rows[0];
    }
    const inserted = await db
      .insert(businessSettings)
      .values({
        businessName: 'SONU DIESEL BHATTI',
        logoUrl: '/icon.svg',
        whatsappNumber: '919876543210',
        defaultLanguage: 'en',
        lowStockThreshold: 10,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getBusinessSettings:', error);
    throw new Error('Failed to load business settings.', { cause: error });
  }
}

export async function updateBusinessSettings(data: {
  businessName?: string;
  logoUrl?: string;
  whatsappNumber?: string;
  defaultLanguage?: string;
  lowStockThreshold?: number;
}) {
  try {
    const current = await getBusinessSettings();
    const updated = await db
      .update(businessSettings)
      .set({
        businessName: data.businessName ?? current.businessName,
        logoUrl: data.logoUrl ?? current.logoUrl,
        whatsappNumber: data.whatsappNumber ?? current.whatsappNumber,
        defaultLanguage: data.defaultLanguage ?? current.defaultLanguage,
        lowStockThreshold:
          typeof data.lowStockThreshold === 'number'
            ? data.lowStockThreshold
            : current.lowStockThreshold,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.id, current.id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateBusinessSettings:', error);
    throw new Error('Failed to update business settings.', { cause: error });
  }
}

export async function createProductWithStockLog(
  input: {
    name: string;
    size: string;
    imageUrl: string;
    price: number;
    stockQuantity: number;
  },
  adminEmail: string,
  note?: string
) {
  try {
    return await db.transaction(async (tx) => {
      const safePrice = Math.max(0, Math.round(input.price));
      const safeStock = Math.max(0, Math.round(input.stockQuantity));

      const created = await tx
        .insert(products)
        .values({
          name: input.name.trim(),
          size: input.size.trim(),
          imageUrl: input.imageUrl.trim(),
          price: safePrice,
          stockQuantity: safeStock,
          isActive: true,
        })
        .returning();

      const product = created[0];

      await tx.insert(stockMovements).values({
        productId: product.id,
        previousQuantity: 0,
        newQuantity: safeStock,
        changeAmount: safeStock,
        actionType: 'INITIAL',
        adminId: adminEmail,
        note: note || 'New product added to catalogue',
      });

      return product;
    });
  } catch (error) {
    console.error('Database transaction failed in createProductWithStockLog:', error);
    throw new Error('Failed to create product.', { cause: error });
  }
}

export async function updateProductDetails(
  productId: number,
  input: {
    name?: string;
    size?: string;
    imageUrl?: string;
    price?: number;
    stockQuantity?: number;
    stockNote?: string;
    isActive?: boolean;
  },
  adminEmail: string
) {
  try {
    return await db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId));

      if (!existingRows.length) {
        throw new Error('Product not found');
      }
      const existing = existingRows[0];

      const nextStock =
        input.stockQuantity !== undefined
          ? Math.max(0, Math.round(input.stockQuantity))
          : existing.stockQuantity;

      const updated = await tx
        .update(products)
        .set({
          name: input.name !== undefined ? input.name.trim() : existing.name,
          size: input.size !== undefined ? input.size.trim() : existing.size,
          imageUrl:
            input.imageUrl !== undefined
              ? input.imageUrl.trim()
              : existing.imageUrl,
          price:
            input.price !== undefined
              ? Math.max(0, Math.round(input.price))
              : existing.price,
          stockQuantity: nextStock,
          isActive:
            input.isActive !== undefined ? input.isActive : existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      // If stock quantity changed, log stock movement in the same fast transaction
      if (
        input.stockQuantity !== undefined &&
        nextStock !== existing.stockQuantity
      ) {
        const delta = nextStock - existing.stockQuantity;
        await tx.insert(stockMovements).values({
          productId: existing.id,
          previousQuantity: existing.stockQuantity,
          newQuantity: nextStock,
          changeAmount: delta,
          actionType: delta > 0 ? 'ADD' : delta < 0 ? 'REMOVE' : 'ADJUST',
          adminId: adminEmail,
          note: input.stockNote || 'Quick Edit Stock Update',
        });
      }

      // If price changed, log an informational entry in stockMovements with 0 stock delta
      if (
        input.price !== undefined &&
        Math.round(input.price) !== existing.price
      ) {
        await tx.insert(stockMovements).values({
          productId: existing.id,
          previousQuantity: nextStock,
          newQuantity: nextStock,
          changeAmount: 0,
          actionType: 'PRICE_UPDATE',
          adminId: adminEmail,
          note: `Price updated from ₹${existing.price} to ₹${Math.round(input.price)}`,
        });
      }

      return updated[0];
    });
  } catch (error) {
    console.error('Database transaction failed in updateProductDetails:', error);
    throw new Error('Failed to update product details.', { cause: error });
  }
}

export async function adjustProductStockTransaction(
  productId: number,
  actionType: 'ADD' | 'REMOVE' | 'ADJUST',
  amount: number,
  adminEmail: string,
  note?: string
) {
  try {
    return await db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId));

      if (!existingRows.length) {
        throw new Error('Product not found');
      }

      const product = existingRows[0];
      const previousQuantity = product.stockQuantity;
      let newQuantity = previousQuantity;
      const cleanAmount = Math.round(amount);

      if (actionType === 'ADD') {
        if (cleanAmount < 0) throw new Error('Add amount must be positive');
        newQuantity = previousQuantity + cleanAmount;
      } else if (actionType === 'REMOVE') {
        if (cleanAmount < 0) throw new Error('Remove amount must be positive');
        if (previousQuantity - cleanAmount < 0) {
          throw new Error(
            `Cannot remove ${cleanAmount} units; only ${previousQuantity} available in stock.`
          );
        }
        newQuantity = previousQuantity - cleanAmount;
      } else if (actionType === 'ADJUST') {
        if (cleanAmount < 0) {
          throw new Error('Stock quantity cannot be negative.');
        }
        newQuantity = cleanAmount;
      }

      const changeAmount = newQuantity - previousQuantity;

      const updatedRows = await tx
        .update(products)
        .set({
          stockQuantity: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      const movementRows = await tx
        .insert(stockMovements)
        .values({
          productId,
          previousQuantity,
          newQuantity,
          changeAmount,
          actionType,
          adminId: adminEmail,
          note: note || `${actionType} stock adjustment`,
        })
        .returning();

      return {
        product: updatedRows[0],
        movement: movementRows[0],
      };
    });
  } catch (error: any) {
    console.error('Database transaction failed in adjustProductStockTransaction:', error);
    throw new Error(error.message || 'Failed to update product stock.', { cause: error });
  }
}

export async function deleteProductSafely(productId: number) {
  try {
    return await db.transaction(async (tx) => {
      await tx.delete(products).where(eq(products.id, productId));
      return { deletedId: productId };
    });
  } catch (error: any) {
    console.error('Database transaction failed in deleteProductSafely:', error);
    throw new Error(error.message || 'Failed to delete product.', { cause: error });
  }
}
