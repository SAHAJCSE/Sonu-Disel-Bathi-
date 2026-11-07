import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { GoogleGenAI, Type } from '@google/genai';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getPublicProducts,
  getAllProductsForAdmin,
  getRecentStockMovements,
  getBusinessSettings,
  updateBusinessSettings,
  createProductWithStockLog,
  updateProductDetails,
  adjustProductStockTransaction,
  deleteProductSafely,
  getAllAdmins,
  loginAdminWithPassword,
  clearAdminSession,
  resetAdminPassword,
  updateAdminProfileConfig,
} from './src/db/repository.ts';

dotenv.config();

// Generate valid PNG icons for PWA compliance if missing
function ensurePwaPngIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  function createIndustrialIconPng(size: number): Buffer {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const rawData = Buffer.alloc(size * (size * 4 + 1));
    const center = size / 2;
    const outerRadius = size * 0.36;
    const innerRadius = size * 0.22;

    for (let y = 0; y < size; y++) {
      const rowStart = y * (size * 4 + 1);
      rawData[rowStart] = 0; // filter type 0
      for (let x = 0; x < size; x++) {
        const px = rowStart + 1 + x * 4;
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Dark charcoal background #18181B with amber industrial burner ring #D97706
        if (dist <= outerRadius && dist >= innerRadius) {
          rawData[px] = 217; // R
          rawData[px + 1] = 119; // G
          rawData[px + 2] = 6; // B
          rawData[px + 3] = 255;
        } else if (dist < innerRadius * 0.65) {
          rawData[px] = 245; // R
          rawData[px + 1] = 158; // G
          rawData[px + 2] = 11; // B
          rawData[px + 3] = 255;
        } else {
          rawData[px] = 24;
          rawData[px + 1] = 24;
          rawData[px + 2] = 27;
          rawData[px + 3] = 255;
        }
      }
    }

    const compressed = zlib.deflateSync(rawData);
    return Buffer.concat([
      signature,
      makeChunk('IHDR', ihdr),
      makeChunk('IDAT', compressed),
      makeChunk('IEND', Buffer.alloc(0)),
    ]);
  }

  const targets = [
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'pwa-192x192.png', size: 192 },
    { file: 'pwa-512x512.png', size: 512 },
    { file: 'pwa-maskable-512x512.png', size: 512 },
  ];

  for (const t of targets) {
    const filePath = path.join(publicDir, t.file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, createIndustrialIconPng(t.size));
    }
  }
}

ensurePwaPngIcons();

const app = express();
app.use(express.json({ limit: '15mb' }));

// Real-time SSE client registry for instant two-admin and public catalogue sync
const sseClients = new Set<Response>();

function broadcastRealtimeEvent(eventType: string, payload: unknown) {
  const message = `data: ${JSON.stringify({
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(
    `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
  );
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Track processed offline action IDs to prevent duplicate submissions on reconnect
const processedOfflineIds = new Set<string>();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

app.get('/api/public/catalogue', async (_req: Request, res: Response) => {
  try {
    const [productsList, settings] = await Promise.all([
      getPublicProducts(),
      getBusinessSettings(),
    ]);
    res.json({
      products: productsList,
      settings,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in GET /api/public/catalogue:', error);
    res.status(500).json({ error: error.message || 'Failed to load public catalogue' });
  }
});

// Check live stock availability when generating receipt / WhatsApp request
app.post('/api/public/verify-cart', async (req: Request, res: Response) => {
  try {
    const items: Array<{ productId: number; quantity: number }> = req.body.items || [];
    const currentProducts = await getPublicProducts();
    const productMap = new Map(currentProducts.map((p) => [p.id, p]));

    const issues: Array<{
      productId: number;
      name: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of items) {
      const liveProd = productMap.get(item.productId);
      if (!liveProd) {
        issues.push({
          productId: item.productId,
          name: 'Unavailable Product',
          requested: item.quantity,
          available: 0,
        });
      } else if (liveProd.stockQuantity < item.quantity) {
        issues.push({
          productId: item.productId,
          name: liveProd.name,
          requested: item.quantity,
          available: liveProd.stockQuantity,
        });
      }
    }

    res.json({
      valid: issues.length === 0,
      issues,
      latestProducts: currentProducts,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in POST /api/public/verify-cart:', error);
    res.status(500).json({ error: error.message || 'Failed to verify cart availability' });
  }
});

// ============================================================================
// ADMIN AUTHENTICATION ROUTES (Strictly Two Pre-Authorized Admins)
// ============================================================================

app.get('/api/auth/admins-public', async (_req: Request, res: Response) => {
  try {
    const admins = await getAllAdmins();
    res.json({
      admins: admins.map((a, idx) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        slot: idx + 1,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load administrator slots' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await loginAdminWithPassword(String(email), String(password));
    if (!admin) {
      return res.status(401).json({
        error: 'Invalid credentials or unauthorized account. Only the 2 pre-authorized administrators can log in.',
      });
    }

    res.json({
      token: admin.sessionToken,
      admin: {
        id: admin.id,
        uid: admin.uid,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/auth/login:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, coAdminEmail, newPassword } = req.body;
    if (!email || !coAdminEmail || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        error: 'Please provide your admin email, the co-admin email for verification, and a new password (min 6 characters).',
      });
    }

    const success = await resetAdminPassword(
      String(email),
      String(newPassword),
      String(coAdminEmail)
    );
    if (!success) {
      return res.status(403).json({
        error: 'Verification failed. Both administrator email addresses must match the two authorized accounts.',
      });
    }

    res.json({ message: 'Password reset successful. You may now sign in.' });
  } catch (error: any) {
    console.error('Error in POST /api/auth/reset-password:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allAdmins = await getAllAdmins();
    res.json({
      admin: req.admin,
      allAdmins,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch session profile' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.admin) {
      await clearAdminSession(req.admin.id);
    }
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
});

// ============================================================================
// PROTECTED ADMIN DASHBOARD & INVENTORY ROUTES
// ============================================================================

app.get('/api/admin/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [productsList, movements, settings, admins] = await Promise.all([
      getAllProductsForAdmin(),
      getRecentStockMovements(50),
      getBusinessSettings(),
      getAllAdmins(),
    ]);

    res.json({
      products: productsList,
      movements,
      settings,
      admins,
      currentAdmin: req.admin,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/dashboard:', error);
    res.status(500).json({ error: error.message || 'Failed to load admin dashboard data' });
  }
});

app.post('/api/admin/products', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, size, imageUrl, price, stockQuantity, note, clientActionId } = req.body;

    if (clientActionId && processedOfflineIds.has(clientActionId)) {
      const all = await getAllProductsForAdmin();
      return res.json({ deduplicated: true, products: all });
    }

    if (!name || !size || !imageUrl || price === undefined || stockQuantity === undefined) {
      return res.status(400).json({
        error: 'Product name, size, mandatory image, price, and available quantity are required.',
      });
    }

    const created = await createProductWithStockLog(
      {
        name: String(name),
        size: String(size),
        imageUrl: String(imageUrl),
        price: Number(price),
        stockQuantity: Number(stockQuantity),
      },
      req.admin!.email,
      note ? String(note) : undefined
    );

    if (clientActionId) {
      processedOfflineIds.add(clientActionId);
    }

    broadcastRealtimeEvent('product_created', {
      product: created,
      adminEmail: req.admin!.email,
    });

    res.status(201).json({ product: created });
  } catch (error: any) {
    console.error('Error in POST /api/admin/products:', error);
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { name, size, imageUrl, price, isActive, clientActionId } = req.body;

    if (clientActionId && processedOfflineIds.has(clientActionId)) {
      return res.json({ deduplicated: true });
    }

    const updated = await updateProductDetails(
      productId,
      {
        name: name !== undefined ? String(name) : undefined,
        size: size !== undefined ? String(size) : undefined,
        imageUrl: imageUrl !== undefined ? String(imageUrl) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      req.admin!.email
    );

    if (clientActionId) {
      processedOfflineIds.add(clientActionId);
    }

    broadcastRealtimeEvent('product_updated', {
      product: updated,
      adminEmail: req.admin!.email,
    });

    res.json({ product: updated });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/products/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});

app.post('/api/admin/products/:id/stock', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { actionType, amount, note, clientActionId } = req.body;

    if (clientActionId && processedOfflineIds.has(clientActionId)) {
      return res.json({ deduplicated: true });
    }

    if (!['ADD', 'REMOVE', 'ADJUST'].includes(actionType)) {
      return res.status(400).json({ error: 'Invalid stock actionType. Use ADD, REMOVE, or ADJUST.' });
    }

    const result = await adjustProductStockTransaction(
      productId,
      actionType as 'ADD' | 'REMOVE' | 'ADJUST',
      Number(amount),
      req.admin!.email,
      note ? String(note) : undefined
    );

    if (clientActionId) {
      processedOfflineIds.add(clientActionId);
    }

    broadcastRealtimeEvent('stock_updated', {
      product: result.product,
      movement: result.movement,
      adminEmail: req.admin!.email,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/admin/products/:id/stock:', error);
    res.status(400).json({ error: error.message || 'Failed to adjust stock' });
  }
});

app.delete('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const result = await deleteProductSafely(productId);

    broadcastRealtimeEvent('product_deleted', {
      productId,
      adminEmail: req.admin!.email,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/products/:id:', error);
    res.status(400).json({ error: error.message || 'Failed to delete product' });
  }
});

app.put('/api/admin/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { businessName, logoUrl, whatsappNumber, defaultLanguage, lowStockThreshold } = req.body;
    const updated = await updateBusinessSettings({
      businessName,
      logoUrl,
      whatsappNumber,
      defaultLanguage,
      lowStockThreshold:
        lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
    });

    broadcastRealtimeEvent('settings_updated', {
      settings: updated,
      adminEmail: req.admin!.email,
    });

    res.json({ settings: updated });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/settings:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

app.put('/api/admin/profile/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = Number(req.params.id);
    const { email, name, newPassword } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const updated = await updateAdminProfileConfig(
      adminId,
      String(email),
      String(name),
      newPassword ? String(newPassword) : undefined
    );
    res.json({
      admin: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
      },
    });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/profile/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update admin profile' });
  }
});

// Offline Queue Batch Synchronization Endpoint
app.post('/api/admin/sync-batch', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const actions: Array<{
      id: string;
      type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'ADJUST_STOCK' | 'UPDATE_SETTINGS';
      payload: any;
      createdAt: string;
    }> = req.body.actions || [];

    const results: Array<{ id: string; status: 'synced' | 'skipped' | 'failed'; error?: string }> = [];

    for (const action of actions) {
      if (processedOfflineIds.has(action.id)) {
        results.push({ id: action.id, status: 'skipped' });
        continue;
      }

      try {
        if (action.type === 'CREATE_PRODUCT') {
          await createProductWithStockLog(
            {
              name: String(action.payload.name),
              size: String(action.payload.size),
              imageUrl: String(action.payload.imageUrl),
              price: Number(action.payload.price),
              stockQuantity: Number(action.payload.stockQuantity),
            },
            req.admin!.email,
            action.payload.note || 'Synced from offline queue'
          );
        } else if (action.type === 'UPDATE_PRODUCT') {
          await updateProductDetails(
            Number(action.payload.productId),
            {
              name: action.payload.name,
              size: action.payload.size,
              imageUrl: action.payload.imageUrl,
              price:
                action.payload.price !== undefined ? Number(action.payload.price) : undefined,
              isActive: action.payload.isActive,
            },
            req.admin!.email
          );
        } else if (action.type === 'ADJUST_STOCK') {
          await adjustProductStockTransaction(
            Number(action.payload.productId),
            action.payload.actionType,
            Number(action.payload.amount),
            req.admin!.email,
            action.payload.note || 'Synced from offline queue'
          );
        } else if (action.type === 'UPDATE_SETTINGS') {
          await updateBusinessSettings(action.payload);
        }

        processedOfflineIds.add(action.id);
        results.push({ id: action.id, status: 'synced' });
      } catch (actionErr: any) {
        results.push({
          id: action.id,
          status: 'failed',
          error: actionErr.message || 'Sync action failed',
        });
      }
    }

    const [productsList, movements, settings] = await Promise.all([
      getAllProductsForAdmin(),
      getRecentStockMovements(50),
      getBusinessSettings(),
    ]);

    broadcastRealtimeEvent('batch_synced', {
      adminEmail: req.admin!.email,
      syncedCount: results.filter((r) => r.status === 'synced').length,
    });

    res.json({
      results,
      products: productsList,
      movements,
      settings,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/sync-batch:', error);
    res.status(500).json({ error: error.message || 'Offline batch synchronization failed' });
  }
});

// ============================================================================
// SERVER-SIDE GEMINI SMART PRODUCT ENTRY (Voice & OCR)
// ============================================================================

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/admin/ai/parse-voice', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { transcript, language } = req.body;
    if (!transcript || !String(transcript).trim()) {
      return res.status(400).json({ error: 'Voice transcript is empty' });
    }

    const existingProducts = await getAllProductsForAdmin();
    const ai = getGeminiClient();

    if (ai) {
      const productCatalogContext = existingProducts.map((p) => ({
        id: p.id,
        name: p.name,
        size: p.size,
        price: p.price,
        stockQuantity: p.stockQuantity,
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Parse this administrator voice command (spoken in English, Hindi, or Punjabi, language hint: ${
          language || 'auto'
        }) for "Sonu Diesel Bhatti" inventory management.
Voice Transcript: "${transcript}"
Current Products in Database: ${JSON.stringify(productCatalogContext)}

Rules:
1. Determine intent:
   - "CREATE_PRODUCT": Adding a brand new product model, or if no existing product matches and name+size+price+stock are given.
   - "UPDATE_STOCK": Increasing ("badha do", "add", "plus"), decreasing ("ghata do", "remove", "minus"), or setting ("available hain", "set stock to") stock quantity of an existing product.
   - "UPDATE_PRICE": Changing price ("price ... kar do", "rate ... set karo") of an existing product.
   - "UPDATE_BOTH": Changing both price and stock of an existing product.
2. If the command refers to a size like "Medium", "Large", "Small", or "Extra Large" and multiple existing products have that size (without clarifying which specific model name), put all matching product IDs in "ambiguousProductIds" and set "isAmbiguous" to true so the admin can select the exact product.
3. Extract product name, size ("Small", "Medium", "Large", or "Extra Large"), price (integer INR), stockActionType ("ADD", "REMOVE", "ADJUST"), and stockAmount (integer).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description: 'CREATE_PRODUCT, UPDATE_STOCK, UPDATE_PRICE, or UPDATE_BOTH',
              },
              matchedProductId: {
                type: Type.INTEGER,
                description: 'ID of the single matched existing product, or 0 if new or ambiguous',
              },
              isAmbiguous: {
                type: Type.BOOLEAN,
                description: 'True if multiple existing products match the spoken description',
              },
              ambiguousProductIds: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: 'IDs of candidate products when ambiguous',
              },
              name: {
                type: Type.STRING,
                description: 'Product name',
              },
              size: {
                type: Type.STRING,
                description: 'Small, Medium, Large, or Extra Large',
              },
              price: {
                type: Type.INTEGER,
                description: 'Price in INR (0 if not mentioned)',
              },
              stockActionType: {
                type: Type.STRING,
                description: 'ADD, REMOVE, or ADJUST',
              },
              stockAmount: {
                type: Type.INTEGER,
                description: 'Quantity to add, remove, or set',
              },
              summaryText: {
                type: Type.STRING,
                description: 'Human-readable summary of the detected command',
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ parsed });
    }

    // Fallback deterministic parser if Gemini API key is not configured
    const textLower = String(transcript).toLowerCase();
    let detectedSize = 'Medium';
    if (textLower.includes('small') || textLower.includes('chota') || textLower.includes('ਛੋਟਾ')) {
      detectedSize = 'Small';
    } else if (textLower.includes('extra large') || textLower.includes('jumbo')) {
      detectedSize = 'Extra Large';
    } else if (textLower.includes('large') || textLower.includes('bada') || textLower.includes('ਵੱਡਾ')) {
      detectedSize = 'Large';
    }

    const numbers = String(transcript).match(/\d+/g)?.map(Number) || [];
    const matchingBySize = existingProducts.filter(
      (p) => p.size.toLowerCase() === detectedSize.toLowerCase()
    );

    const isAddProduct =
      textLower.includes('add ') && (textLower.includes('price') || numbers.length >= 2);

    if (isAddProduct) {
      return res.json({
        parsed: {
          intent: 'CREATE_PRODUCT',
          matchedProductId: 0,
          isAmbiguous: false,
          ambiguousProductIds: [],
          name: `${detectedSize} Diesel Bhatti`,
          size: detectedSize,
          price: numbers[0] || 2500,
          stockActionType: 'ADJUST',
          stockAmount: numbers[1] ?? 10,
          summaryText: `Create ${detectedSize} Diesel Bhatti at ₹${numbers[0] || 2500} with stock ${
            numbers[1] ?? 10
          }`,
        },
      });
    }

    const isPriceUpdate = textLower.includes('price') || textLower.includes('rate') || textLower.includes('कीमत');
    const isStockIncrease =
      textLower.includes('badha') ||
      textLower.includes('increase') ||
      textLower.includes('add') ||
      textLower.includes('ਵਧਾ');
    const isStockDecrease =
      textLower.includes('ghata') ||
      textLower.includes('remove') ||
      textLower.includes('minus') ||
      textLower.includes('ਘਟਾ');

    return res.json({
      parsed: {
        intent: isPriceUpdate ? 'UPDATE_PRICE' : 'UPDATE_STOCK',
        matchedProductId: matchingBySize.length === 1 ? matchingBySize[0].id : 0,
        isAmbiguous: matchingBySize.length > 1,
        ambiguousProductIds: matchingBySize.map((p) => p.id),
        name: matchingBySize[0]?.name || `${detectedSize} Diesel Bhatti`,
        size: detectedSize,
        price: isPriceUpdate ? numbers[0] || 2500 : matchingBySize[0]?.price || 2500,
        stockActionType: isStockIncrease ? 'ADD' : isStockDecrease ? 'REMOVE' : 'ADJUST',
        stockAmount: numbers[0] || 10,
        summaryText: `Detected command for ${detectedSize} Diesel Bhatti`,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/ai/parse-voice:', error);
    res.status(500).json({ error: error.message || 'Failed to parse voice command' });
  }
});

app.post('/api/admin/ai/parse-ocr', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required for OCR scanning' });
    }

    const cleanBase64 = String(imageBase64).replace(/^data:image\/\w+;base64,/, '');
    const existingProducts = await getAllProductsForAdmin();
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please check Settings > Secrets.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this uploaded image for "Sonu Diesel Bhatti" inventory management.
It may be:
1. A handwritten stock sheet, product list, price list, or stock receipt.
2. An actual photograph of a physical Diesel Bhatti burner stove.

Existing Products in Database: ${JSON.stringify(
              existingProducts.map((p) => ({
                id: p.id,
                name: p.name,
                size: p.size,
                price: p.price,
                stockQuantity: p.stockQuantity,
              }))
            )}

Instructions:
- Extract all detected Diesel Bhatti products or stock entries into "items".
- If the image is a photograph of an actual Diesel Bhatti burner (not just a document), set "isProductPhotograph" to true and suggest a product entry for it.
- For each item, list any field names ("name", "size", "price", "stockQuantity") where the handwriting or image was blurry, estimated, or uncertain inside "uncertainFields" so the admin UI can highlight them for review.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isProductPhotograph: {
              type: Type.BOOLEAN,
              description: 'True if the uploaded image depicts a physical Diesel Bhatti product',
            },
            documentSummary: {
              type: Type.STRING,
              description: 'Brief summary of what was detected in the image',
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  matchedProductId: {
                    type: Type.INTEGER,
                    description: 'ID of matching existing product, or 0 if new product',
                  },
                  name: {
                    type: Type.STRING,
                    description: 'Product name (e.g. Diesel Bhatti — Medium Standard)',
                  },
                  size: {
                    type: Type.STRING,
                    description: 'Small, Medium, Large, or Extra Large',
                  },
                  price: {
                    type: Type.INTEGER,
                    description: 'Price in INR',
                  },
                  stockQuantity: {
                    type: Type.INTEGER,
                    description: 'Detected available stock quantity',
                  },
                  uncertainFields: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'List of fields that had low OCR certainty (e.g. ["price", "stockQuantity"])',
                  },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ ocrResult: parsed });
  } catch (error: any) {
    console.error('Error in POST /api/admin/ai/parse-ocr:', error);
    res.status(500).json({ error: error.message || 'Failed to perform OCR extraction on image' });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sonu Diesel Bhatti server running on http://localhost:${PORT}`);
  });
}

startServer();
