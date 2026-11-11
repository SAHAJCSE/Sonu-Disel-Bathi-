export interface Product {
  id: number;
  name: string;
  size: string;
  imageUrl: string;
  price: number;
  stockQuantity: number;
  burnerType?: string;
  material?: string;
  fuelType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  productSize: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  actionType: string;
  adminId: string;
  note: string | null;
  createdAt: string;
}

export interface BusinessSettings {
  id: number;
  businessName: string;
  logoUrl: string;
  whatsappNumber: string;
  defaultLanguage: string;
  lowStockThreshold: number;
  updatedAt?: string;
}

export interface AdminProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OfflineAction {
  id: string;
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'ADJUST_STOCK' | 'DELETE_PRODUCT' | 'UPDATE_SETTINGS';
  payload: any;
  description: string;
  createdAt: string;
}

export interface UserProfile {
  id?: number;
  uid: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  phone?: string | null;
  role: 'admin' | 'customer' | 'staff';
}

export interface CustomerOrderItem {
  id: number;
  name: string;
  size: string;
  price: number;
  quantity: number;
}

export interface CustomerOrder {
  id: number;
  orderNumber: string;
  userUid?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  itemsJson: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled';
  shippingAddress?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiveNotification {
  id: number;
  targetRole: 'all' | 'admin' | 'customer';
  targetUserUid?: string | null;
  title: string;
  message: string;
  type: 'order' | 'stock' | 'status' | 'announcement' | 'system';
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
}

