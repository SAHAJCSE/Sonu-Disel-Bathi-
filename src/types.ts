export interface Product {
  id: number;
  name: string;
  size: string;
  imageUrl: string;
  price: number;
  stockQuantity: number;
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
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'ADJUST_STOCK' | 'UPDATE_SETTINGS';
  payload: any;
  description: string;
  createdAt: string;
}
