import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Send,
  Globe,
  Maximize2,
  X,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  LayoutGrid,
  Sparkles,
  Columns2,
  Columns3,
  Grid2x2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  AdminProfile,
  BusinessSettings,
  CartItem,
  CustomerOrder,
  LiveNotification,
  OfflineAction,
  Product,
  StockMovement,
  UserProfile,
} from './types.ts';
import {
  LanguageProvider,
  useTranslation,
} from './i18n/LanguageContext.tsx';
import { LANGUAGE_META, LanguageCode } from './i18n/translations.ts';
import { ProductImage } from './components/ProductImage.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { CartReceiptModal } from './components/CartReceiptModal.tsx';
import { AdminLoginView } from './components/AdminLoginView.tsx';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { SequentialShowcaseCards } from './components/SequentialShowcaseCards.tsx';
import { ProductDetailSheetModal } from './components/ProductDetailSheetModal.tsx';
import { LiveNotificationCenter } from './components/LiveNotificationCenter.tsx';
import { AuthProfileHeader } from './components/AuthProfileHeader.tsx';
import { CustomerOrdersModal } from './components/CustomerOrdersModal.tsx';
import { ActionFeedbackToast, ActionToastData } from './components/ActionFeedbackToast.tsx';
import { audioFeedback } from './utils/audioFeedback.ts';
import { useDebounce } from './hooks/useDebounce.ts';

const HERO_WORKSHOP_IMAGE =
  '/images/hero_workshop_bhatti_1794033589036.jpg';

const INITIAL_FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Diesel Bhatti — Compact Commercial',
    size: 'Small',
    imageUrl: '/images/bhatti_small_model_1794033585976.jpg',
    price: 1850,
    stockQuantity: 45,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Diesel Bhatti — Halwai Standard',
    size: 'Medium',
    imageUrl: '/images/bhatti_medium_model_1794033586446.jpg',
    price: 2500,
    stockQuantity: 60,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Diesel Bhatti — Heavy Duty Blower',
    size: 'Medium',
    imageUrl: '/images/bhatti_medium_model_1794033586446.jpg',
    price: 2950,
    stockQuantity: 28,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Diesel Bhatti — Langar & Catering',
    size: 'Large',
    imageUrl: '/images/bhatti_large_model_1794033589239.jpg',
    price: 3500,
    stockQuantity: 35,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Diesel Bhatti — High-Pressure Dual Valve',
    size: 'Large',
    imageUrl: '/images/bhatti_large_model_1794033589239.jpg',
    price: 4200,
    stockQuantity: 6,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 6,
    name: 'Diesel Bhatti — Jumbo Double Burner + Tank',
    size: 'Extra Large',
    imageUrl: '/images/bhatti_jumbo_double_1794033588535.jpg',
    price: 6800,
    stockQuantity: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_SETTINGS: BusinessSettings = {
  id: 1,
  businessName: 'SONU DIESEL BHATTI',
  logoUrl: '/icon.svg',
  whatsappNumber: '919876543210',
  defaultLanguage: 'en',
  lowStockThreshold: 10,
};

const CACHE_KEYS = {
  PUBLIC_PRODUCTS: 'sdb_cache_public_products_v1',
  SETTINGS: 'sdb_cache_settings_v1',
  CART: 'sdb_cache_cart_v1',
  ADMIN_PRODUCTS: 'sdb_cache_admin_products_v1',
  ADMIN_MOVEMENTS: 'sdb_cache_admin_movements_v1',
  ADMIN_PROFILES: 'sdb_cache_admin_profiles_v1',
  ADMIN_SESSION: 'sdb_admin_session_v1',
  OFFLINE_QUEUE: 'sdb_offline_action_queue_v1',
};

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function SonuBhattiAppContent() {
  const { lang, setLang, t, translateSize } = useTranslation();

  // View Mode: 'public' | 'admin_login' | 'admin_dashboard'
  const [viewMode, setViewMode] = useState<
    'public' | 'admin_login' | 'admin_dashboard'
  >('public');

  // Online / Offline Connectivity & Sync Queue
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>(() =>
    readCache<OfflineAction[]>(CACHE_KEYS.OFFLINE_QUEUE, [])
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Public Catalogue State
  const [publicProducts, setPublicProducts] = useState<Product[]>(() =>
    readCache<Product[]>(CACHE_KEYS.PUBLIC_PRODUCTS, INITIAL_FALLBACK_PRODUCTS)
  );
  const [settings, setSettings] = useState<BusinessSettings>(() =>
    readCache<BusinessSettings>(CACHE_KEYS.SETTINGS, INITIAL_SETTINGS)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const {
    debouncedValue: debouncedSearchQuery,
    isDebouncing: isSearchDebouncing,
    flushNow: flushSearchNow,
  } = useDebounce(searchQuery, 220);
  const [selectedSize, setSelectedSize] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<
    'ALL' | 'IN_STOCK' | 'LOW_STOCK'
  >('ALL');
  const [priceFilter, setPriceFilter] = useState<
    'ALL' | 'UNDER_2500' | '2500_TO_4000' | 'ABOVE_4000'
  >('ALL');
  const [sortBy, setSortBy] = useState<
    'FEATURED' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_DESC' | 'NAME_ASC'
  >('FEATURED');
  const [catalogueTab, setCatalogueTab] = useState<'standard' | 'showcase'>(
    'showcase'
  );
  const [gridCols, setGridCols] = useState<'auto' | 2 | 3 | 4>('auto');
  const [itemsPerScreen, setItemsPerScreen] = useState<
    2 | 3 | 4 | 6 | 8 | 12 | 'ALL'
  >('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [clearSignal, setClearSignal] = useState(0);
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(
    null
  );

  // Shopping Cart & Receipt Modal State
  const [cart, setCart] = useState<CartItem[]>(() =>
    readCache<CartItem[]>(CACHE_KEYS.CART, [])
  );
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Admin Auth & Shared Dashboard State (Auth token kept in memory + session backup for offline reload)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    const saved = readCache<{ token: string; admin: AdminProfile } | null>(
      CACHE_KEYS.ADMIN_SESSION,
      null
    );
    return saved?.token || null;
  });
  const [currentAdmin, setCurrentAdmin] = useState<AdminProfile | null>(() => {
    const saved = readCache<{ token: string; admin: AdminProfile } | null>(
      CACHE_KEYS.ADMIN_SESSION,
      null
    );
    return saved?.admin || null;
  });

  // User Profile, Role-Based Access & Live Notifications State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    readCache<UserProfile | null>('sonu_bhatti_current_user', null)
  );
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [userOrders, setUserOrders] = useState<CustomerOrder[]>([]);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [liveToast, setLiveToast] = useState<{
    title: string;
    message: string;
    type: string;
  } | null>(null);

  // Micro-Animations & Audio Feedback Toast State
  const [actionToast, setActionToast] = useState<ActionToastData | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() =>
    audioFeedback.getMuted()
  );

  const showActionFeedback = useCallback(
    (
      title: string,
      message?: string,
      type: ActionToastData['type'] = 'general',
      sound?: 'click' | 'add_to_cart' | 'remove_from_cart' | 'favorite' | 'order_placed' | 'delete' | 'notification' | 'stock_update'
    ) => {
      if (sound) {
        audioFeedback.play(sound);
      }
      setActionToast({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        message,
        type,
      });
    },
    []
  );

  const toggleSoundMute = () => {
    const newMuted = audioFeedback.toggleMute();
    setIsSoundMuted(newMuted);
    showActionFeedback(
      newMuted ? 'Sound Muted' : 'Sound Enabled',
      newMuted ? 'Sound effects turned off' : 'Micro-audio feedback turned on',
      'general'
    );
  };

  const [adminProducts, setAdminProducts] = useState<Product[]>(() =>
    readCache<Product[]>(CACHE_KEYS.ADMIN_PRODUCTS, INITIAL_FALLBACK_PRODUCTS)
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    readCache<StockMovement[]>(CACHE_KEYS.ADMIN_MOVEMENTS, [])
  );
  const [adminList, setAdminList] = useState<AdminProfile[]>(() =>
    readCache<AdminProfile[]>(CACHE_KEYS.ADMIN_PROFILES, [])
  );

  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;

  useEffect(() => {
    writeCache(CACHE_KEYS.CART, cart);
  }, [cart]);

  useEffect(() => {
    writeCache(CACHE_KEYS.OFFLINE_QUEUE, offlineQueue);
  }, [offlineQueue]);

  // Fetch Public Catalogue
  const fetchPublicCatalogue = useCallback(async () => {
    try {
      const res = await fetch('/api/public/catalogue');
      if (!res.ok) return;
      const data = await res.json();
      if (data.products) {
        setPublicProducts(data.products);
        writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, data.products);
      }
      if (data.settings) {
        setSettings(data.settings);
        writeCache(CACHE_KEYS.SETTINGS, data.settings);
      }
    } catch {
      // Offline mode uses cached state
    }
  }, []);

  // Fetch Admin Dashboard
  const fetchAdminDashboard = useCallback(async (tokenToUse?: string | null) => {
    const token = tokenToUse ?? authTokenRef.current;
    if (!token) return;
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthToken(null);
        setCurrentAdmin(null);
        localStorage.removeItem(CACHE_KEYS.ADMIN_SESSION);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data.products) {
        setAdminProducts(data.products);
        writeCache(CACHE_KEYS.ADMIN_PRODUCTS, data.products);
        const activeOnly = data.products.filter((p: Product) => p.isActive);
        setPublicProducts(activeOnly);
        writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, activeOnly);
      }
      if (data.movements) {
        setStockMovements(data.movements);
        writeCache(CACHE_KEYS.ADMIN_MOVEMENTS, data.movements);
      }
      if (data.settings) {
        setSettings(data.settings);
        writeCache(CACHE_KEYS.SETTINGS, data.settings);
      }
      if (data.admins) {
        setAdminList(data.admins);
        writeCache(CACHE_KEYS.ADMIN_PROFILES, data.admins);
      }
    } catch {
      // Offline mode uses cached admin state
    }
  }, []);

  // Flush Offline Queue when connection is restored
  const flushOfflineQueue = useCallback(async () => {
    const currentQueue = readCache<OfflineAction[]>(
      CACHE_KEYS.OFFLINE_QUEUE,
      []
    );
    const token = authTokenRef.current;
    if (currentQueue.length === 0 || !token || !navigator.onLine) return;

    setIsSyncing(true);
    setSyncToast(t('onlineSyncing'));

    try {
      const res = await fetch('/api/admin/sync-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ actions: currentQueue }),
      });

      if (res.ok) {
        const data = await res.json();
        setOfflineQueue([]);
        writeCache(CACHE_KEYS.OFFLINE_QUEUE, []);

        if (data.products) {
          setAdminProducts(data.products);
          writeCache(CACHE_KEYS.ADMIN_PRODUCTS, data.products);
          const activeOnly = data.products.filter((p: Product) => p.isActive);
          setPublicProducts(activeOnly);
          writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, activeOnly);
        }
        if (data.movements) {
          setStockMovements(data.movements);
          writeCache(CACHE_KEYS.ADMIN_MOVEMENTS, data.movements);
        }
        if (data.settings) {
          setSettings(data.settings);
          writeCache(CACHE_KEYS.SETTINGS, data.settings);
        }
        setSyncToast(t('syncedSuccess'));
        setTimeout(() => setSyncToast(null), 4000);
      }
    } catch {
      // Retain queue for next retry
    } finally {
      setIsSyncing(false);
    }
  }, [t]);

  // Notifications & User Orders Sync
  const fetchNotifications = useCallback(async (tokenToUse?: string | null) => {
    try {
      const token = tokenToUse ?? authTokenRef.current;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/notifications', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      }
    } catch {
      // offline fallback
    }
  }, []);

  const fetchUserOrders = useCallback(async (tokenToUse?: string | null) => {
    const token = tokenToUse ?? authTokenRef.current;
    if (!token) return;
    try {
      const res = await fetch('/api/user/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setUserOrders(data.orders);
        }
      }
    } catch {
      // offline fallback
    }
  }, []);

  const handleMarkNotificationRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (!authToken) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {
      // ignore
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (!authToken) return;
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {
      // ignore
    }
  };

  // Google Sign-In with Role Verification
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/google-verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(idToken);
        setCurrentUser(data.user);
        writeCache('sonu_bhatti_current_user', data.user);

        if (data.role === 'admin' && data.admin) {
          setCurrentAdmin(data.admin);
          writeCache(CACHE_KEYS.ADMIN_SESSION, {
            token: idToken,
            admin: data.admin,
          });
          void fetchAdminDashboard(idToken);
        }
        void fetchNotifications(idToken);
        void fetchUserOrders(idToken);
        setLiveToast({
          title: `Welcome, ${data.user.name}!`,
          message:
            data.role === 'admin'
              ? 'Administrator privileges active.'
              : 'Signed in via Google. Real-time notifications and cloud orders enabled.',
          type: 'auth',
        });
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (authToken) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        }).catch(() => null);
      }
    } catch {
      // ignore
    }
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentAdmin(null);
    setUserOrders([]);
    localStorage.removeItem(CACHE_KEYS.ADMIN_SESSION);
    localStorage.removeItem('sonu_bhatti_current_user');
    setViewMode('public');
  };

  // Initial Load & Connectivity Listeners
  useEffect(() => {
    fetchPublicCatalogue();
    fetchNotifications();

    if (authTokenRef.current) {
      const token = authTokenRef.current;
      fetchAdminDashboard(token);
      fetchUserOrders(token);

      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) {
            setCurrentUser(data.user);
            writeCache('sonu_bhatti_current_user', data.user);
            if (data.admin) {
              setCurrentAdmin(data.admin);
            }
          }
        })
        .catch(() => null);
    }

    const handleOnline = () => {
      setIsOnline(true);
      fetchPublicCatalogue();
      fetchNotifications();
      flushOfflineQueue();
      if (authTokenRef.current) {
        fetchUserOrders(authTokenRef.current);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchPublicCatalogue, fetchAdminDashboard, flushOfflineQueue, fetchNotifications, fetchUserOrders]);

  // Real-Time Server-Sent Events (SSE) for instant Two-Admin Synchronization & Live Notifications
  useEffect(() => {
    if (!isOnline) return;
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (
          parsed.type === 'product_created' ||
          parsed.type === 'product_updated' ||
          parsed.type === 'stock_updated' ||
          parsed.type === 'product_deleted' ||
          parsed.type === 'settings_updated' ||
          parsed.type === 'batch_synced'
        ) {
          fetchPublicCatalogue();
          if (authTokenRef.current) {
            fetchAdminDashboard(authTokenRef.current);
          }
        }

        if (parsed.type === 'notification_new') {
          const newNotif = parsed.payload;
          if (newNotif) {
            setNotifications((prev) => [
              newNotif,
              ...prev.filter((n) => n.id !== newNotif.id),
            ]);
            setLiveToast({
              title: newNotif.title,
              message: newNotif.message,
              type: newNotif.type,
            });
          }
        }

        if (parsed.type === 'order_created') {
          audioFeedback.play('notification');
          fetchNotifications();
          if (authTokenRef.current) {
            fetchUserOrders(authTokenRef.current);
            fetchAdminDashboard(authTokenRef.current);
          }
          const ord = parsed.payload?.order;
          if (ord) {
            setLiveToast({
              title: `New Order #${ord.orderNumber}`,
              message: `Order for ₹${ord.totalAmount?.toLocaleString('en-IN')} received.`,
              type: 'order',
            });
          }
        }

        if (parsed.type === 'order_status_updated') {
          audioFeedback.play('notification');
          fetchNotifications();
          if (authTokenRef.current) {
            fetchUserOrders(authTokenRef.current);
          }
          const ord = parsed.payload?.order;
          if (ord) {
            setLiveToast({
              title: `Order #${ord.orderNumber} Updated`,
              message: `Status is now: ${ord.status?.toUpperCase()}`,
              type: 'status',
            });
          }
        }
      } catch {
        // ignore malformed event
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isOnline, fetchPublicCatalogue, fetchAdminDashboard, fetchNotifications, fetchUserOrders]);

  // Cart Handlers
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;
    audioFeedback.play('add_to_cart');
    showActionFeedback(
      'Added to Cart',
      `${product.name} (₹${product.price.toLocaleString('en-IN')})`,
      'cart_add'
    );
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stockQuantity, existing.quantity + 1);
        return prev.map((item) =>
          item.product.id === product.id
            ? { product, quantity: nextQty }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const currentItem = cart.find((i) => i.product.id === productId);
    if (currentItem) {
      if (newQty > currentItem.quantity) {
        audioFeedback.play('add_to_cart');
        showActionFeedback(
          'Quantity Increased',
          `${currentItem.product.name} (${newQty})`,
          'cart_update'
        );
      } else {
        audioFeedback.play('remove_from_cart');
        showActionFeedback(
          'Quantity Decreased',
          `${currentItem.product.name} (${newQty})`,
          'cart_update'
        );
      }
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: Math.min(item.product.stockQuantity, newQty),
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find((i) => i.product.id === productId);
    audioFeedback.play('delete');
    if (item) {
      showActionFeedback('Removed from Cart', item.product.name, 'cart_remove');
    }
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    audioFeedback.play('delete');
    showActionFeedback(
      'Cart Cleared',
      'All items removed from cart',
      'cart_remove'
    );
    setCart([]);
  };

  // Admin Mutation Helpers (Support both Online Live DB & Offline Queue with Optimistic State)
  const enqueueOfflineAction = (
    type: OfflineAction['type'],
    payload: any,
    description: string
  ) => {
    const newAction: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      description,
      createdAt: new Date().toISOString(),
    };
    setOfflineQueue((prev) => {
      const updated = [...prev, newAction];
      writeCache(CACHE_KEYS.OFFLINE_QUEUE, updated);
      return updated;
    });
    return newAction.id;
  };

  const handleCreateProduct = async (data: {
    name: string;
    size: string;
    imageUrl: string;
    price: number;
    stockQuantity: number;
    note?: string;
  }) => {
    const clientActionId = `create_${Date.now()}`;
    if (isOnline && authToken) {
      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ ...data, clientActionId }),
        });
        if (res.ok) {
          await fetchAdminDashboard(authToken);
          return;
        }
      } catch {
        // Fall through to offline queue
      }
    }

    // Offline optimistic product creation
    enqueueOfflineAction('CREATE_PRODUCT', data, `Add ${data.name}`);
    const optimisticProduct: Product = {
      id: Date.now(),
      name: data.name,
      size: data.size,
      imageUrl: data.imageUrl,
      price: data.price,
      stockQuantity: data.stockQuantity,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAdminProducts((prev) => [optimisticProduct, ...prev]);
    setPublicProducts((prev) => [optimisticProduct, ...prev]);
  };

  const handleUpdateProduct = async (
    productId: number,
    data: {
      name?: string;
      size?: string;
      imageUrl?: string;
      price?: number;
      stockQuantity?: number;
      stockNote?: string;
      isActive?: boolean;
    }
  ) => {
    // 1. Instant optimistic state update so UI responds in <5ms
    setAdminProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              ...(data.name !== undefined ? { name: data.name } : {}),
              ...(data.size !== undefined ? { size: data.size } : {}),
              ...(data.imageUrl !== undefined
                ? { imageUrl: data.imageUrl }
                : {}),
              ...(data.price !== undefined ? { price: data.price } : {}),
              ...(data.stockQuantity !== undefined
                ? { stockQuantity: data.stockQuantity }
                : {}),
              ...(data.isActive !== undefined
                ? { isActive: data.isActive }
                : {}),
              updatedAt: new Date().toISOString(),
            }
          : p
      );
      writeCache(CACHE_KEYS.ADMIN_PRODUCTS, updated);
      const activeOnly = updated.filter((p) => p.isActive);
      setPublicProducts(activeOnly);
      writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, activeOnly);
      return updated;
    });

    const clientActionId = `upd_${productId}_${Date.now()}`;
    if (isOnline && authToken) {
      try {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ ...data, clientActionId }),
        });
        if (res.ok) {
          void fetchAdminDashboard(authToken);
          return;
        }
      } catch {
        // Fall through to offline queue
      }
    }

    enqueueOfflineAction(
      'UPDATE_PRODUCT',
      { productId, ...data },
      `Update product #${productId}`
    );
  };

  const handleAdjustStock = async (
    productId: number,
    actionType: 'ADD' | 'REMOVE' | 'ADJUST',
    amount: number,
    note?: string
  ) => {
    audioFeedback.play('stock_update');
    showActionFeedback(
      'Stock Adjusted',
      `${actionType} ${amount} units for #${productId}`,
      'stock_change'
    );
    // 1. Instant optimistic stock update
    setAdminProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== productId) return p;
        const nextQty =
          actionType === 'ADD'
            ? p.stockQuantity + amount
            : actionType === 'REMOVE'
            ? Math.max(0, p.stockQuantity - amount)
            : Math.max(0, amount);
        return { ...p, stockQuantity: nextQty, updatedAt: new Date().toISOString() };
      });
      writeCache(CACHE_KEYS.ADMIN_PRODUCTS, updated);
      const activeOnly = updated.filter((p) => p.isActive);
      setPublicProducts(activeOnly);
      writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, activeOnly);
      return updated;
    });

    const clientActionId = `stk_${productId}_${Date.now()}`;
    if (isOnline && authToken) {
      try {
        const res = await fetch(`/api/admin/products/${productId}/stock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ actionType, amount, note, clientActionId }),
        });
        if (res.ok) {
          void fetchAdminDashboard(authToken);
          return;
        } else {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to adjust stock');
        }
      } catch (err: any) {
        if (isOnline) throw err;
      }
    }

    enqueueOfflineAction(
      'ADJUST_STOCK',
      { productId, actionType, amount, note },
      `${actionType} stock on #${productId}`
    );
  };

  const handleDeleteProduct = async (productId: number) => {
    audioFeedback.play('delete');
    showActionFeedback(
      'Product Deleted',
      `Product #${productId} removed from catalogue`,
      'product_delete'
    );
    // 1. Instant optimistic removal from Admin, Public, and Cart states
    setAdminProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      writeCache(CACHE_KEYS.ADMIN_PRODUCTS, updated);
      return updated;
    });
    setPublicProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, updated);
      return updated;
    });
    setCart((prev) => prev.filter((item) => item.product.id !== productId));

    if (!isOnline || !authToken) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        void fetchAdminDashboard(authToken);
      }
    } catch {
      // Optimistic removal already applied
    }
  };

  const handleUpdateSettings = async (data: Partial<BusinessSettings>) => {
    if (isOnline && authToken) {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.settings) {
            setSettings(json.settings);
            writeCache(CACHE_KEYS.SETTINGS, json.settings);
          }
          return;
        }
      } catch {
        // Fall through to offline queue
      }
    }

    enqueueOfflineAction('UPDATE_SETTINGS', data, 'Update Business Settings');
    setSettings((prev) => ({ ...prev, ...data }));
  };

  const handleUpdateAdminProfile = async (
    adminId: number,
    email: string,
    name: string,
    newPassword?: string
  ) => {
    if (!isOnline || !authToken) return;
    const res = await fetch(`/api/admin/profile/${adminId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ email, name, newPassword }),
    });
    if (res.ok) {
      await fetchAdminDashboard(authToken);
    }
  };

  // Active Public Products & Memoized Per-Size Counts
  const activePublicProducts = useMemo(
    () => publicProducts.filter((p) => p.isActive),
    [publicProducts]
  );

  const getSizeCount = useCallback(
    (sizeVal: string) => {
      if (sizeVal === 'ALL') return activePublicProducts.length;
      return activePublicProducts.filter(
        (p) => p.size.toLowerCase() === sizeVal.toLowerCase()
      ).length;
    },
    [activePublicProducts]
  );

  // Memoized Filtered & Sorted Public Products using debouncedSearchQuery
  const filteredProducts = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    const threshold = settings.lowStockThreshold || 10;

    return activePublicProducts
      .filter((p) => {
        const matchesSize =
          selectedSize === 'ALL' ||
          p.size.toLowerCase() === selectedSize.toLowerCase();

        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.size.toLowerCase().includes(q) ||
          String(p.price).includes(q);

        const matchesStock =
          stockFilter === 'ALL'
            ? true
            : stockFilter === 'IN_STOCK'
            ? p.stockQuantity > 0
            : p.stockQuantity > 0 && p.stockQuantity <= threshold;

        const matchesPrice =
          priceFilter === 'ALL'
            ? true
            : priceFilter === 'UNDER_2500'
            ? p.price < 2500
            : priceFilter === '2500_TO_4000'
            ? p.price >= 2500 && p.price <= 4000
            : p.price > 4000;

        return matchesSize && matchesSearch && matchesStock && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'PRICE_ASC') return a.price - b.price;
        if (sortBy === 'PRICE_DESC') return b.price - a.price;
        if (sortBy === 'STOCK_DESC') return b.stockQuantity - a.stockQuantity;
        if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
        return a.id - b.id;
      });
  }, [
    activePublicProducts,
    debouncedSearchQuery,
    selectedSize,
    stockFilter,
    priceFilter,
    sortBy,
    settings.lowStockThreshold,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    debouncedSearchQuery.trim() !== '' ||
    selectedSize !== 'ALL' ||
    stockFilter !== 'ALL' ||
    priceFilter !== 'ALL' ||
    sortBy !== 'FEATURED' ||
    itemsPerScreen !== 'ALL';

  const resetAllCatalogueFilters = useCallback(() => {
    setSearchQuery('');
    flushSearchNow('');
    setSelectedSize('ALL');
    setStockFilter('ALL');
    setPriceFilter('ALL');
    setSortBy('FEATURED');
    setItemsPerScreen('ALL');
    setCurrentPage(1);
    setClearSignal((prev) => prev + 1);
  }, [flushSearchNow]);

  // Reset to page 1 whenever filters or itemsPerScreen change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchQuery,
    selectedSize,
    stockFilter,
    priceFilter,
    sortBy,
    itemsPerScreen,
  ]);

  const totalPages = useMemo(() => {
    if (itemsPerScreen === 'ALL') return 1;
    return Math.max(1, Math.ceil(filteredProducts.length / itemsPerScreen));
  }, [filteredProducts.length, itemsPerScreen]);

  const paginatedProducts = useMemo(() => {
    if (itemsPerScreen === 'ALL') return filteredProducts;
    const start = (currentPage - 1) * itemsPerScreen;
    return filteredProducts.slice(start, start + itemsPerScreen);
  }, [filteredProducts, itemsPerScreen, currentPage]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-zinc-900">
      {/* =================================================================== */}
      {/* STRICT 3-ZONE TOP BAR CONTRACT                                      */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-4 sm:px-8 py-4 bg-white/95 backdrop-blur-xs border-b border-zinc-200 no-print">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#catalogue"
          onClick={(e) => {
            e.preventDefault();
            setViewMode('public');
          }}
          className="text-lg font-extrabold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 font-display"
        >
          {settings.businessName || t('brandName')}
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
          <a
            href="#catalogue"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('public');
              document
                .getElementById('catalogue-grid')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t('navCatalogue')}
          </a>
          <a
            href="#sizes"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('public');
              document
                .getElementById('catalogue-filters')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t('navSizes')}
          </a>
          <a
            href="#receipt"
            onClick={(e) => {
              e.preventDefault();
              setIsCartOpen(true);
            }}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t('navReceiptMaker')}
          </a>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              if (viewMode === 'public') {
                setViewMode(
                  authToken && currentAdmin ? 'admin_dashboard' : 'admin_login'
                );
              } else {
                setViewMode('public');
              }
            }}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {viewMode === 'public' ? t('navAdminPortal') : t('navPublicStore')}
          </a>
        </nav>

        {/* Zone 3: Live Notifications, Sound Toggle, Google Auth Profile & Shopping Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Micro-Audio & Music Action Feedback Toggle */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleSoundMute}
            title={isSoundMuted ? 'Turn on Action Sound Effects' : 'Mute Action Sound Effects'}
            aria-label={isSoundMuted ? 'Turn on Action Sound Effects' : 'Mute Action Sound Effects'}
            className={`p-2 sm:px-2.5 sm:py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isSoundMuted
                ? 'border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            {isSoundMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-zinc-400" />
                <span className="hidden xl:inline text-[11px] text-zinc-400">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="hidden xl:inline text-[11px] text-zinc-800 font-semibold">Sound On</span>
              </>
            )}
          </motion.button>

          <LiveNotificationCenter
            notifications={notifications}
            unreadCount={notifications.filter((n) => !n.isRead).length}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            userRole={currentUser?.role || (currentAdmin ? 'admin' : 'customer')}
            onSelectOrder={() => {
              setIsOrdersModalOpen(true);
            }}
          />

          <AuthProfileHeader
            user={currentUser}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
            onOpenOrders={() => setIsOrdersModalOpen(true)}
            orderCount={userOrders.length}
            isAdminPortalOpen={viewMode === 'admin_dashboard'}
            onToggleAdminPortal={() => {
              setViewMode((prev) =>
                prev === 'admin_dashboard' ? 'public' : 'admin_dashboard'
              );
            }}
            isAuthenticating={isAuthenticating}
          />

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              audioFeedback.play('click');
              setIsCartOpen(true);
            }}
            className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm border border-zinc-700 active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">{t('cartButton')}</span>
            <motion.span
              key={totalCartItems}
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-zinc-800 text-white font-bold text-[11px]"
            >
              {totalCartItems}
            </motion.span>
          </motion.button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* UTILITY & MULTILINGUAL BAR (Below Header)                           */}
      {/* =================================================================== */}
      <div className="bg-stone-100 border-b border-stone-200 px-4 sm:px-8 py-2.5 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-800">{t('tagline')}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'public') {
                  setViewMode(
                    authToken && currentAdmin ? 'admin_dashboard' : 'admin_login'
                  );
                } else {
                  setViewMode('public');
                }
              }}
              className="md:hidden font-semibold text-amber-700 hover:underline cursor-pointer"
            >
              {viewMode === 'public'
                ? t('navAdminPortal')
                : t('navPublicStore')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PWAInstallButton />

            {/* Persistent Language Selector (English, Hindi, Punjabi) */}
            <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-zinc-300">
              <Globe className="w-3.5 h-3.5 text-zinc-500 ml-1.5 mr-0.5" />
              {(['en', 'hi', 'pa'] as LanguageCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    lang === code
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {LANGUAGE_META[code].nativeLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MAIN VIEWPORT                                                       */}
      {/* =================================================================== */}
      <main className="flex-1">
        {viewMode === 'admin_login' && (
          <AdminLoginView
            onLoginSuccess={(token, adm) => {
              setAuthToken(token);
              setCurrentAdmin(adm);
              writeCache(CACHE_KEYS.ADMIN_SESSION, { token, admin: adm });
              setViewMode('admin_dashboard');
              fetchAdminDashboard(token);
            }}
            onBackToCatalogue={() => setViewMode('public')}
          />
        )}

        {viewMode === 'admin_dashboard' && currentAdmin && authToken && (
          <AdminDashboardView
            currentAdmin={currentAdmin}
            admins={adminList}
            products={adminProducts}
            movements={stockMovements}
            settings={settings}
            authToken={authToken}
            isOnline={isOnline}
            offlineQueue={offlineQueue}
            isSyncing={isSyncing}
            onSyncNow={flushOfflineQueue}
            onLogout={async () => {
              if (isOnline && authToken) {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${authToken}` },
                }).catch(() => {});
              }
              setAuthToken(null);
              setCurrentAdmin(null);
              localStorage.removeItem(CACHE_KEYS.ADMIN_SESSION);
              setViewMode('public');
            }}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onAdjustStock={handleAdjustStock}
            onDeleteProduct={handleDeleteProduct}
            onUpdateSettings={handleUpdateSettings}
            onUpdateAdminProfile={handleUpdateAdminProfile}
          />
        )}

        {viewMode === 'public' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
            {/* Storefront Split Hero */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-zinc-900 text-white rounded-2xl overflow-hidden border border-zinc-800">
              <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <p className="text-xs font-medium text-amber-400 tracking-wide">
                    {t('heroKicker')}
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
                    {t('heroTitle')}
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-300 max-w-xl leading-relaxed">
                    {t('heroSubtitle')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogueTab('showcase');
                      document
                        .getElementById('catalogue-filters')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {t('tabShowcaseCards')} ({activePublicProducts.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogueTab('standard');
                      document
                        .getElementById('catalogue-filters')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-3 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4 text-amber-400" />
                    <span>{t('tabCatalogueGrid')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="px-5 py-3 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                  >
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>{t('sendToWhatsApp')}</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full bg-zinc-800 overflow-hidden group">
                <ProductImage
                  src={HERO_WORKSHOP_IMAGE}
                  alt="Sonu Diesel Bhatti Fabrication Workshop"
                  className="w-full h-full lg:h-full object-cover"
                  enableHoverEffect={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-zinc-900/60 lg:to-transparent pointer-events-none" />
              </div>
            </section>

            {/* Storefront View Mode Tabs: Standard Catalogue vs Sequential Showcase Cards */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
              <div className="inline-flex items-center gap-1.5 p-1.5 bg-stone-200/80 rounded-xl border border-stone-300/80 w-fit">
                <button
                  type="button"
                  onClick={() => setCatalogueTab('standard')}
                  className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    catalogueTab === 'standard'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-zinc-700" />
                  <span>{t('tabCatalogueGrid')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogueTab('showcase')}
                  className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    catalogueTab === 'showcase'
                      ? 'bg-[#222224] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{t('tabShowcaseCards')}</span>
                </button>
              </div>

              <div className="text-xs text-zinc-500 font-medium">
                {t('sortSequentialAsc')} ·{' '}
                <span className="font-mono tabular-nums font-bold text-zinc-900">
                  {filteredProducts.length}
                </span>{' '}
                {t('showingResults')}
              </div>
            </div>

            {/* Search, Sort & Multi-Facet Filter Bar (Shared across both tabs) */}
            <section
              id="catalogue-filters"
              className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs"
            >
              {/* Top Row: Debounced Search Input + Multi-Facet Selectors + Clear All Button */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Input with Debounce Indicator */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full pl-10 pr-16 py-2.5 rounded-lg border border-zinc-300 bg-stone-50/70 focus:bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isSearchDebouncing && (
                      <RefreshCw
                        className="w-3.5 h-3.5 text-amber-600 animate-spin"
                        aria-label="Updating search results"
                      />
                    )}
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          flushSearchNow('');
                        }}
                        aria-label="Clear search query"
                        className="text-zinc-400 hover:text-zinc-800 cursor-pointer p-1 rounded-md hover:bg-zinc-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stock Filter + Price Range Filter + Sort Selector + Convenience Clear All */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Stock Availability Filter */}
                  <select
                    aria-label="Filter by stock availability"
                    value={stockFilter}
                    onChange={(e) =>
                      setStockFilter(
                        e.target.value as 'ALL' | 'IN_STOCK' | 'LOW_STOCK'
                      )
                    }
                    className="px-3 py-2.5 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    <option value="ALL">{t('filterStockAll')}</option>
                    <option value="IN_STOCK">{t('filterInStock')}</option>
                    <option value="LOW_STOCK">{t('filterLowStock')}</option>
                  </select>

                  {/* Price Range Filter */}
                  <select
                    aria-label="Filter by price range"
                    value={priceFilter}
                    onChange={(e) =>
                      setPriceFilter(
                        e.target.value as
                          | 'ALL'
                          | 'UNDER_2500'
                          | '2500_TO_4000'
                          | 'ABOVE_4000'
                      )
                    }
                    className="px-3 py-2.5 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    <option value="ALL">{t('filterPriceAll')}</option>
                    <option value="UNDER_2500">
                      {t('filterPriceUnder2500')}
                    </option>
                    <option value="2500_TO_4000">
                      {t('filterPrice2500To4000')}
                    </option>
                    <option value="ABOVE_4000">
                      {t('filterPriceAbove4000')}
                    </option>
                  </select>

                  {/* Sort Dropdown */}
                  <div className="relative inline-flex items-center">
                    <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
                    <select
                      aria-label={t('sortByLabel')}
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as
                            | 'FEATURED'
                            | 'PRICE_ASC'
                            | 'PRICE_DESC'
                            | 'STOCK_DESC'
                            | 'NAME_ASC'
                        )
                      }
                      className="pl-8 pr-3.5 py-2.5 rounded-lg border border-zinc-300 bg-zinc-900 text-white text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="FEATURED">
                        {t('sortByLabel')}: {t('sortSequentialAsc')}
                      </option>
                      <option value="PRICE_ASC">
                        {t('sortByLabel')}: {t('sortPriceAsc')}
                      </option>
                      <option value="PRICE_DESC">
                        {t('sortByLabel')}: {t('sortPriceDesc')}
                      </option>
                      <option value="STOCK_DESC">
                        {t('sortByLabel')}: {t('sortStockDesc')}
                      </option>
                      <option value="NAME_ASC">
                        {t('sortByLabel')}: {t('sortNameAsc')}
                      </option>
                    </select>
                  </div>

                  {/* Prominent 'Clear All' Convenience Button */}
                  <button
                    type="button"
                    disabled={!hasActiveFilters}
                    onClick={resetAllCatalogueFilters}
                    className={`px-3.5 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                      hasActiveFilters
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                        : 'bg-stone-100 text-zinc-400 border-zinc-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('clearAllBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Row: Interactive Size Segmented Control + Live Count & Clear All */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200/80">
                  {[
                    { value: 'ALL', label: t('filterAllSizes') },
                    { value: 'Small', label: t('sizeSmall') },
                    { value: 'Medium', label: t('sizeMedium') },
                    { value: 'Large', label: t('sizeLarge') },
                    { value: 'Extra Large', label: t('sizeExtraLarge') },
                  ].map((sz) => {
                    const count = getSizeCount(sz.value);
                    const isSelected = selectedSize === sz.value;
                    return (
                      <button
                        key={sz.value}
                        type="button"
                        onClick={() => setSelectedSize(sz.value)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-zinc-900 text-white shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
                        }`}
                      >
                        <span>{sz.label}</span>
                        <span
                          className={`text-[11px] font-mono tabular-nums ${
                            isSelected ? 'text-amber-400' : 'text-zinc-400'
                          }`}
                        >
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Result Counter, Grid Column Switcher & Show on Screen Selector */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 text-xs text-zinc-500">
                  {/* Grid Column Density Selector (Auto: Phone 3-col / Max 4-col, or explicit 2 / 3 / 4 Col) */}
                  <div className="inline-flex items-center gap-0.5 p-1 rounded-lg bg-stone-100 border border-zinc-200">
                    <span className="px-1.5 text-[11px] font-semibold text-zinc-500">
                      Grid:
                    </span>
                    {(
                      [
                        { id: 'auto', label: 'Auto' },
                        { id: 2, label: '2 Col' },
                        { id: 3, label: '3 Col' },
                        { id: 4, label: '4 Col' },
                      ] as const
                    ).map((colOpt) => (
                      <button
                        key={String(colOpt.id)}
                        type="button"
                        onClick={() => setGridCols(colOpt.id)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                          gridCols === colOpt.id
                            ? 'bg-zinc-900 text-white shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        {colOpt.label}
                      </button>
                    ))}
                  </div>

                  {/* No. of Products on Screen Selector */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 border border-zinc-200">
                    <Grid2x2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-zinc-600 whitespace-nowrap">
                      Show:
                    </span>
                    <select
                      aria-label="Number of products on screen"
                      value={String(itemsPerScreen)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemsPerScreen(
                          val === 'ALL'
                            ? 'ALL'
                            : (Number(val) as 2 | 3 | 4 | 6 | 8 | 12)
                        );
                      }}
                      className="bg-transparent font-mono tabular-nums text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer"
                    >
                      <option value="2">2 / screen</option>
                      <option value="3">3 / screen</option>
                      <option value="4">4 / screen</option>
                      <option value="6">6 / screen</option>
                      <option value="8">8 / screen</option>
                      <option value="12">12 / screen</option>
                      <option value="ALL">
                        All ({filteredProducts.length})
                      </option>
                    </select>
                  </div>

                  <span className="font-mono tabular-nums font-medium text-zinc-600">
                    <strong className="text-zinc-900">
                      {paginatedProducts.length}
                    </strong>{' '}
                    / {filteredProducts.length}
                  </span>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllCatalogueFilters}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('clearAllBtn')}</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Product Catalogue Viewport: Standard Grid OR Sequential Showcase Cards Tab */}
            <section id="catalogue-grid" className="space-y-6">
              {filteredProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white border border-zinc-200 rounded-xl p-12 text-center space-y-3"
                >
                  <p className="text-base font-bold text-zinc-800">
                    {t('noProductsFound')}
                  </p>
                  <button
                    type="button"
                    onClick={resetAllCatalogueFilters}
                    className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('clearAllBtn')}</span>
                  </button>
                </motion.div>
              ) : catalogueTab === 'showcase' ? (
                <SequentialShowcaseCards
                  products={paginatedProducts}
                  cart={cart}
                  gridCols={gridCols}
                  lowStockThreshold={settings.lowStockThreshold || 10}
                  onAddToCart={addToCart}
                  onUpdateCartQty={updateCartQty}
                  hasActiveExternalFilters={hasActiveFilters}
                  onClearAllFilters={resetAllCatalogueFilters}
                  clearSignal={clearSignal}
                  onInspectProduct={(p) => setInspectedProduct(p)}
                  onActionNotification={(title, message, type) =>
                    showActionFeedback(
                      title,
                      message,
                      (type as ActionToastData['type']) || 'general'
                    )
                  }
                />
              ) : (
                <div
                  className={`grid ${
                    gridCols === 2
                      ? 'grid-cols-2 gap-3 sm:gap-6'
                      : gridCols === 3
                      ? 'grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5'
                      : gridCols === 4
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'
                      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'
                  }`}
                >
                  <AnimatePresence mode="popLayout">
                    {paginatedProducts.map((product) => {
                      const cartEntry = cart.find(
                        (c) => c.product.id === product.id
                      );
                      const outOfStock = product.stockQuantity <= 0;
                      const isLowStock =
                        !outOfStock &&
                        product.stockQuantity <=
                          (settings.lowStockThreshold || 10);

                      return (
                        <motion.article
                          layout
                          key={product.id}
                          onClick={() => setInspectedProduct(product)}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{
                            duration: 0.18,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="group bg-[#222224] text-white border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_45px_-8px_rgba(0,0,0,0.45)] cursor-pointer ring-1 ring-white/10"
                        >
                          <div>
                            {/* 1. Studio Diesel Bhatti Photograph Inset Frame (4:3) */}
                            <div className="relative aspect-[4/3] bg-[#EDEDED] overflow-hidden border-b border-zinc-800">
                              <ProductImage
                                src={product.imageUrl}
                                alt={product.name}
                                sizeLabel={product.size}
                                className="w-full h-full object-contain"
                                enableHoverEffect={true}
                              />

                              {/* Subtle Ambient Bottom Vignette on Hover */}
                              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

                              {/* Interactive Zoom / Inspect Trigger */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedProduct(product);
                                }}
                                className="hidden sm:flex absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-zinc-950/80 backdrop-blur-xs text-white text-[10px] font-semibold items-center gap-1 opacity-90 group-hover:opacity-100 transition-all duration-150 cursor-pointer shadow-xs border border-zinc-700"
                              >
                                <Maximize2 className="w-3 h-3 text-white" />
                                <span>{t('zoomPhotoBtn')}</span>
                              </button>
                            </div>

                            {/* Card Body: Responsive Compact Padding for 2-col Mobile & 4-col Desktop */}
                            <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2.5">
                              {/* Metadata: Size & Stock Status */}
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-zinc-400">
                                <span className="font-semibold text-zinc-200 truncate">
                                  {translateSize(product.size)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`font-mono tabular-nums font-semibold ${
                                    outOfStock
                                      ? 'text-red-400'
                                      : isLowStock
                                      ? 'text-zinc-300'
                                      : 'text-zinc-200'
                                  }`}
                                >
                                  {outOfStock
                                    ? t('outOfStock')
                                    : `${product.stockQuantity} in stock`}
                                </span>
                              </div>

                              {/* 2. Product Name */}
                              <h2 className="text-xs sm:text-base font-bold text-white leading-snug line-clamp-2 transition-colors">
                                {product.name}
                              </h2>

                              {/* 4. Price */}
                              <div className="pt-1.5 flex items-baseline justify-between border-t border-zinc-800">
                                <span className="hidden sm:inline text-xs text-zinc-400">
                                  {t('priceLabel')}
                                </span>
                                <span className="text-sm sm:text-xl font-extrabold font-mono tabular-nums text-white">
                                  ₹{product.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Add to Cart / Quantity Stepper (Black & White Theme) */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1"
                          >
                            {cartEntry ? (
                              <div className="flex items-center justify-between gap-1 sm:gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-700">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartQty(
                                      product.id,
                                      cartEntry.quantity - 1
                                    )
                                  }
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 cursor-pointer transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="text-xs font-bold font-mono tabular-nums text-white truncate px-1">
                                  {cartEntry.quantity}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartQty(
                                      product.id,
                                      cartEntry.quantity + 1
                                    )
                                  }
                                  disabled={
                                    cartEntry.quantity >= product.stockQuantity
                                  }
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center hover:bg-zinc-200 disabled:opacity-40 cursor-pointer transition-colors font-bold"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={outOfStock}
                                onClick={() => addToCart(product)}
                                className="w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl bg-[#EDEDED] hover:bg-white active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 text-[#1E1E20] text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-[#1E1E20] shrink-0" />
                                <span className="truncate">
                                  {outOfStock
                                    ? t('outOfStock')
                                    : t('addToCart')}
                                </span>
                              </button>
                            )}
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Screen Pagination Controls when itemsPerScreen < filteredProducts.length */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-2xs">
                  <span className="text-xs font-mono tabular-nums text-zinc-600">
                    Screen Page <strong>{currentPage}</strong> of{' '}
                    <strong>{totalPages}</strong> · Showing{' '}
                    <strong>{paginatedProducts.length}</strong> of{' '}
                    <strong>{filteredProducts.length}</strong> models
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-xs font-bold text-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>{t('seqPrevBtn')}</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg font-mono tabular-nums text-xs font-bold transition-colors cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-zinc-900 text-amber-400'
                              : 'bg-stone-100 hover:bg-stone-200 text-zinc-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-stone-100 disabled:opacity-40 text-xs font-bold text-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('seqNextBtn')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* DETAILED PRODUCT SPECIFICATION SHEET MODAL (MATCHING ATTACHED UI)   */}
      {/* =================================================================== */}
      <ProductDetailSheetModal
        product={inspectedProduct}
        allProducts={filteredProducts}
        cart={cart}
        settings={settings}
        onClose={() => setInspectedProduct(null)}
        onSelectProduct={(p) => setInspectedProduct(p)}
        onAddToCart={addToCart}
        onUpdateCartQty={updateCartQty}
        onOpenCartReceipt={() => setIsCartOpen(true)}
      />

      {/* =================================================================== */}
      {/* CART & RECEIPT / WHATSAPP ORDER REQUEST MODAL                       */}
      {/* =================================================================== */}
      <CartReceiptModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={updateCartQty}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        settings={settings}
        isOnline={isOnline}
        currentUser={currentUser}
        onOrderPlaced={(newOrder) => {
          audioFeedback.play('order_placed');
          showActionFeedback(
            'Order Placed Successfully',
            `Order #${newOrder.orderNumber} sent to workshop`,
            'order_placed'
          );
          setUserOrders((prev) => [newOrder, ...prev]);
          void fetchNotifications();
        }}
        onStockVerifiedUpdate={(latest) => {
          setPublicProducts(latest);
          writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, latest);
        }}
      />

      {/* Customer Orders & Real-time Fabrication Tracker Modal */}
      <CustomerOrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        orders={userOrders}
        whatsappNumber={settings.whatsappNumber}
      />

      {/* Interactive Micro-Action Notification Toast with Spring Animation */}
      <ActionFeedbackToast
        toast={actionToast}
        onDismiss={() => setActionToast(null)}
      />

      {/* Live Push Notification Floating Banner */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            onClick={() => setLiveToast(null)}
            className="fixed top-20 right-4 z-50 max-w-sm p-4 rounded-2xl bg-[#1c1c1e] text-white border border-zinc-700 shadow-2xl flex items-start gap-3 cursor-pointer ring-1 ring-white/10"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-white leading-tight">
                {liveToast.title}
              </h5>
              <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                {liveToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* OFFLINE & AUTOMATIC SYNC INDICATOR                                  */}
      {/* =================================================================== */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg max-w-md no-print">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{t('offlineBanner')}</span>
        </div>
      )}

      {isOnline && syncToast && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg no-print">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{syncToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* CLEAN FOOTER                                                        */}
      {/* =================================================================== */}
      <footer className="bg-white border-t border-zinc-200 py-6 px-4 sm:px-8 mt-12 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            <span className="font-bold text-zinc-900">
              {settings.businessName || t('brandName')}
            </span>{' '}
            · {t('tagline')}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="hover:text-zinc-900 cursor-pointer"
            >
              {t('navReceiptMaker')} ({totalCartItems})
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() =>
                setViewMode(
                  authToken && currentAdmin ? 'admin_dashboard' : 'admin_login'
                )
              }
              className="hover:text-zinc-900 cursor-pointer"
            >
              {t('navAdminPortal')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <SonuBhattiAppContent />
    </LanguageProvider>
  );
}
