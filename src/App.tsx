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
  Lock,
  Mic,
  MicOff,
  MessageCircle,
  Sun,
  Moon,
} from 'lucide-react';
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
import { CartReceiptModal } from './components/CartReceiptModal.tsx';
import { AdminLoginView } from './components/AdminLoginView.tsx';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { ProductDetailSheetModal } from './components/ProductDetailSheetModal.tsx';
import { LiveNotificationCenter } from './components/LiveNotificationCenter.tsx';
import { AuthProfileHeader } from './components/AuthProfileHeader.tsx';
import { CustomerOrdersModal } from './components/CustomerOrdersModal.tsx';
import { ActionFeedbackToast, ActionToastData } from './components/ActionFeedbackToast.tsx';
import { audioFeedback } from './utils/audioFeedback.ts';
import { useDebounce } from './hooks/useDebounce.ts';

const HERO_WORKSHOP_IMAGE =
  '/assets/aistudio/file_000000002dd0820880291fbff7e224d7_1dfe8205.png';

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
  whatsappNumber: '918708381844',
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
  const [adminTab, setAdminTab] = useState<'inventory' | 'smart_entry' | 'history' | 'settings'>('inventory');
  
  const [viewHistory, setViewHistory] = useState<
    { mode: 'public' | 'admin_login' | 'admin_dashboard'; tab?: 'inventory' | 'smart_entry' | 'history' | 'settings' }[]
  >([]);

  const handleNavigate = useCallback(
    (newMode: 'public' | 'admin_login' | 'admin_dashboard', newTab?: 'inventory' | 'smart_entry' | 'history' | 'settings') => {
      if (newMode === viewMode && (!newTab || newTab === adminTab)) return;
      
      setViewHistory((prev) => [...prev, { mode: viewMode, tab: adminTab }]);
      setViewMode(newMode);
      if (newTab) setAdminTab(newTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [viewMode, adminTab]
  );

  const handleGoBack = useCallback(() => {
    if (viewHistory.length === 0) {
      if (viewMode !== 'public') {
        setViewMode('public');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    const last = viewHistory[viewHistory.length - 1];
    setViewHistory((prev) => prev.slice(0, -1));
    setViewMode(last.mode);
    if (last.tab) setAdminTab(last.tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    audioFeedback.play('click');
  }, [viewHistory, viewMode]);

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
  const [priceFilter, setPriceFilter] = useState<
    'ALL' | 'UNDER_2500' | '2500_TO_4000' | 'ABOVE_4000'
  >('ALL');
  const [maxPriceLimit, setMaxPriceLimit] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<
    'FEATURED' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_DESC' | 'NAME_ASC'
  >('FEATURED');
  const [gridCols, setGridCols] = useState<'auto' | 1 | 2 | 3 | 4>('auto');
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

  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sdb_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sdb_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    audioFeedback.play('click');
  };

  // Google Maps Platform Quota Exceeded Banner State
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);



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

  // Voice Search State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = lang === 'hi' ? 'hi-IN' : lang === 'pa' ? 'pa-IN' : 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        showActionFeedback('Voice Search', `Searching for: ${transcript}`, 'general', 'click');
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          showActionFeedback('Voice Error', 'Could not understand voice', 'general');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [lang, showActionFeedback]);

  const toggleVoiceSearch = useCallback(() => {
    if (!recognitionRef.current) {
      showActionFeedback('Not Supported', 'Voice search not supported in this browser', 'general');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        audioFeedback.play('click');
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  }, [isListening, showActionFeedback]);

  const uploadImageIfBase64 = async (imageUrl: string, token: string): Promise<string> => {
    if (!imageUrl.startsWith('data:')) return imageUrl;
    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataBase64: imageUrl }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.imageUrl;
      }
    } catch (err) {
      console.error('Image upload failed', err);
    }
    return imageUrl;
  };

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
      const res = await fetch(`/api/public/catalogue?t=${Date.now()}`, {
        cache: 'no-store'
      });
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
      const res = await fetch(`/api/admin/dashboard?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
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

  const handleDismissNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    audioFeedback.play('click');
  };

  const handleSignOut = () => {
    if (authToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => null);
    }
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentAdmin(null);
    setUserOrders([]);
    localStorage.removeItem(CACHE_KEYS.ADMIN_SESSION);
    localStorage.removeItem('sonu_bhatti_current_user');
    handleNavigate('public');
    showActionFeedback('Signed Out', 'Returned to public workshop catalogue', 'general');
  };

  // Initial Load & Real-time Live Polling Listeners (ensures admin changes are live everywhere)
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

    // High-frequency live polling fallback (6 seconds) for instant cross-device updates
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void fetchPublicCatalogue();
      }
    }, 6000);

    const handleFocus = () => {
      void fetchPublicCatalogue();
      if (authTokenRef.current) {
        void fetchAdminDashboard(authTokenRef.current);
      }
    };

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

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchPublicCatalogue, fetchAdminDashboard, flushOfflineQueue, fetchNotifications, fetchUserOrders]);

  // Real-Time Server-Sent Events (SSE) for instant Two-Admin Synchronization & Live Notifications
  useEffect(() => {
    if (!isOnline) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: number | null = null;

    const connectSSE = () => {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        console.log('Real-time sync connected.');
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          // Debug log for sync issues
          console.log(`Sync Event [${parsed.type}] received`);

          if (
            parsed.type === 'product_created' ||
            parsed.type === 'product_updated' ||
            parsed.type === 'stock_updated' ||
            parsed.type === 'product_deleted' ||
            parsed.type === 'catalogue_cleared' ||
            parsed.type === 'settings_updated' ||
            parsed.type === 'batch_synced'
          ) {
            // Explicitly handle deletions in local state to avoid "zombie" data before refetch completes
            if (parsed.type === 'product_deleted' && parsed.payload?.productId) {
              const pid = parsed.payload.productId;
              setAdminProducts(prev => prev.filter(p => p.id !== pid));
              setPublicProducts(prev => prev.filter(p => p.id !== pid));
              setCart(prev => prev.filter(i => i.product.id !== pid));
            }

            if (parsed.type === 'catalogue_cleared') {
              setAdminProducts([]);
              setPublicProducts([]);
              setCart([]);
              setStockMovements([]);
              showActionFeedback('Catalogue Cleared', 'Admin deleted all products', 'general', 'delete');
            }

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
        } catch (err) {
          console.error('Error parsing sync event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('Real-time sync connection lost. Retrying in 5s...', err);
        if (eventSource) eventSource.close();
        eventSource = null;
        
        if (retryTimeout) window.clearTimeout(retryTimeout);
        retryTimeout = window.setTimeout(() => {
          if (navigator.onLine) connectSSE();
        }, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) window.clearTimeout(retryTimeout);
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

  const createInFlightRef = useRef<Set<string>>(new Set());

  const handleCreateProduct = async (data: {
    name: string;
    size: string;
    imageUrl: string;
    price: number;
    stockQuantity: number;
    note?: string;
  }) => {
    const dedupeKey = `${data.name.trim().toLowerCase()}|${data.size.trim().toLowerCase()}|${data.price}`;
    if (createInFlightRef.current.has(dedupeKey)) {
      return;
    }
    createInFlightRef.current.add(dedupeKey);

    const tempId = -Date.now();
    const nowIso = new Date().toISOString();
    const optimisticProduct: Product = {
      id: tempId,
      name: data.name.trim(),
      size: data.size,
      imageUrl: data.imageUrl,
      price: data.price,
      stockQuantity: data.stockQuantity,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Instant optimistic UI insertion (<5ms response time)
    showActionFeedback(
      'Product Added',
      `${optimisticProduct.name} (${optimisticProduct.size})`,
      'general'
    );
    setAdminProducts((prev) => {
      const updated = [optimisticProduct, ...prev];
      writeCache(CACHE_KEYS.ADMIN_PRODUCTS, updated);
      return updated;
    });
    setPublicProducts((prev) => {
      const updated = [optimisticProduct, ...prev];
      writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, updated);
      return updated;
    });

    const clientActionId = `create_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      if (isOnline && authToken) {
        // Upload image if it's base64 before creating the product
        const finalImageUrl = await uploadImageIfBase64(data.imageUrl, authToken);
        const finalData = { ...data, imageUrl: finalImageUrl };

        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ ...finalData, clientActionId }),
        });
        if (res.ok) {
          const json = await res.json();
          const serverProduct: Product | undefined = json.product;
          if (serverProduct) {
            setAdminProducts((prev) => {
              const cleaned = prev.filter(
                (p) => p.id !== tempId && p.id !== serverProduct.id
              );
              const updated = [serverProduct, ...cleaned];
              writeCache(CACHE_KEYS.ADMIN_PRODUCTS, updated);
              return updated;
            });
            setPublicProducts((prev) => {
              const cleaned = prev.filter(
                (p) => p.id !== tempId && p.id !== serverProduct.id
              );
              const updated = [serverProduct, ...cleaned];
              writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, updated);
              return updated;
            });
          }
          void fetchAdminDashboard(authToken);
          void fetchPublicCatalogue();
          return;
        }
      }

      // Offline fallback: enqueue action while keeping optimistic product in UI
      enqueueOfflineAction('CREATE_PRODUCT', data, `Add ${data.name}`);
    } catch {
      enqueueOfflineAction('CREATE_PRODUCT', data, `Add ${data.name}`);
    } finally {
      setTimeout(() => {
        createInFlightRef.current.delete(dedupeKey);
      }, 2500);
    }
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
        let finalData = { ...data };
        if (data.imageUrl && data.imageUrl.startsWith('data:')) {
          const uploadedUrl = await uploadImageIfBase64(data.imageUrl, authToken);
          finalData.imageUrl = uploadedUrl;
        }

        const res = await fetch(`/api/admin/products/${productId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ ...finalData, clientActionId }),
        });
        if (res.ok) {
          void fetchAdminDashboard(authToken);
          void fetchPublicCatalogue();
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
          void fetchPublicCatalogue();
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
        void fetchPublicCatalogue();
      }
    } catch {
      // Optimistic removal already applied
    }
  };

  const handleDeleteAll = async () => {
    // 1. Instant optimistic clear
    setAdminProducts([]);
    setPublicProducts([]);
    setCart([]);
    setStockMovements([]);
    writeCache(CACHE_KEYS.ADMIN_PRODUCTS, []);
    writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, []);
    writeCache(CACHE_KEYS.CART, []);
    writeCache(CACHE_KEYS.ADMIN_MOVEMENTS, []);

    if (!isOnline || !authToken) return;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        void fetchAdminDashboard(authToken);
        void fetchPublicCatalogue();
      }
    } catch {
      // Optimistic clear already applied
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
          void fetchPublicCatalogue();
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

  // Active Public Products & Memoized Per-Size and Per-Price Counts
  const activePublicProducts = useMemo(
    () => publicProducts.filter((p) => p.isActive),
    [publicProducts]
  );

  const catalogPriceBounds = useMemo(() => {
    if (activePublicProducts.length === 0) {
      return { min: 1000, max: 6000 };
    }
    const prices = activePublicProducts.map((p) => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [activePublicProducts]);

  const effectiveMaxPrice = maxPriceLimit ?? catalogPriceBounds.max;

  const getSizeCount = useCallback(
    (sizeVal: string) => {
      if (sizeVal === 'ALL') return activePublicProducts.length;
      return activePublicProducts.filter(
        (p) => p.size.toLowerCase() === sizeVal.toLowerCase()
      ).length;
    },
    [activePublicProducts]
  );

  const getPriceBucketCount = useCallback(
    (bucket: 'ALL' | 'UNDER_2500' | '2500_TO_4000' | 'ABOVE_4000') => {
      return activePublicProducts.filter((p) => {
        const matchesSize =
          selectedSize === 'ALL' ||
          p.size.toLowerCase() === selectedSize.toLowerCase();
        if (!matchesSize) return false;
        if (bucket === 'ALL') return true;
        if (bucket === 'UNDER_2500') return p.price < 2500;
        if (bucket === '2500_TO_4000') return p.price >= 2500 && p.price <= 4000;
        return p.price > 4000;
      }).length;
    },
    [activePublicProducts, selectedSize]
  );

  // Memoized Filtered & Sorted Public Products using debouncedSearchQuery
  const filteredProducts = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();

    return activePublicProducts
      .filter((p) => {
        const matchesSize =
          selectedSize === 'ALL' ||
          p.size.toLowerCase() === selectedSize.toLowerCase();

        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.size.toLowerCase().includes(q) ||
          String(p.price).includes(q) ||
          p.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q.replace(/[^a-z0-9]/g, ''));

        const matchesPriceBucket =
          priceFilter === 'ALL'
            ? true
            : priceFilter === 'UNDER_2500'
            ? p.price < 2500
            : priceFilter === '2500_TO_4000'
            ? p.price >= 2500 && p.price <= 4000
            : p.price > 4000;

        const matchesCeiling =
          maxPriceLimit === null || p.price <= maxPriceLimit;

        return (
          matchesSize &&
          matchesSearch &&
          matchesPriceBucket &&
          matchesCeiling
        );
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
    priceFilter,
    maxPriceLimit,
    sortBy,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    debouncedSearchQuery.trim() !== '' ||
    selectedSize !== 'ALL' ||
    priceFilter !== 'ALL' ||
    maxPriceLimit !== null ||
    sortBy !== 'FEATURED';

  const resetAllCatalogueFilters = useCallback(() => {
    setSearchQuery('');
    flushSearchNow('');
    setSelectedSize('ALL');
    setPriceFilter('ALL');
    setMaxPriceLimit(null);
    setSortBy('FEATURED');
  }, [flushSearchNow]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* =================================================================== */}
      {/* STRICT 3-ZONE TOP BAR CONTRACT                                      */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-8 py-2.5 sm:py-3.5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 no-print transition-colors">
        {/* Zone 1: Single text element wordmark with phone text fitting */}
        <a
          href="#catalogue"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate('public');
          }}
          className="text-xs xs:text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0 font-display truncate max-w-[125px] xs:max-w-[175px] sm:max-w-none transition-colors"
        >
          {settings.businessName || t('brandName')}
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs lg:text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <a
            href="#catalogue"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('public');
              document
                .getElementById('catalogue-grid')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-zinc-900 dark:hover:text-zinc-50 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t('navCatalogue')}
          </a>
          <a
            href="#receipt"
            onClick={(e) => {
              e.preventDefault();
              setIsCartOpen(true);
            }}
            className="hover:text-zinc-900 dark:hover:text-zinc-50 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t('navReceiptMaker')}
          </a>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              if (viewMode === 'public') {
                handleNavigate(
                  authToken && currentAdmin ? 'admin_dashboard' : 'admin_login'
                );
              } else {
                handleNavigate('public');
              }
            }}
            className="hover:text-zinc-900 dark:hover:text-zinc-50 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {viewMode === 'public' ? t('navAdminPortal') : t('navPublicStore')}
          </a>
        </nav>

        {/* Zone 3: Sound Toggle, Notifications, Admin Portal & Shopping Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile-only Back Button */}
          <AnimatePresence>
            {(viewHistory.length > 0 || viewMode !== 'public') && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                type="button"
                onClick={handleGoBack}
                className="flex md:hidden items-center gap-1 p-1.5 sm:px-2 sm:py-1.5 text-[10px] font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </motion.button>
            )}
          </AnimatePresence>
          {/* Micro-Audio Action Feedback Toggle */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleSoundMute}
            title={isSoundMuted ? 'Turn on Action Sound Effects' : 'Mute Action Sound Effects'}
            aria-label={isSoundMuted ? 'Turn on Action Sound Effects' : 'Mute Action Sound Effects'}
            className={`p-1.5 sm:px-2.5 sm:py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
              isSoundMuted
                ? 'border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            {isSoundMuted ? (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C1FD]" />
            )}
            <span className="hidden xl:inline text-[11px] text-zinc-700">
              {isSoundMuted ? 'Muted' : 'Sound'}
            </span>
          </motion.button>

          <LiveNotificationCenter
            notifications={notifications}
            unreadCount={notifications.filter((n) => !n.isRead).length}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onDismiss={handleDismissNotification}
            userRole={currentAdmin ? 'admin' : 'customer'}
            onSelectOrder={() => {
              setIsOrdersModalOpen(true);
            }}
          />

          <AuthProfileHeader
            admin={currentAdmin}
            onOpenAdminLogin={() => handleNavigate('admin_login')}
            onSignOut={handleSignOut}
            isAdminPortalOpen={viewMode === 'admin_dashboard'}
            onToggleAdminPortal={() => {
              handleNavigate(viewMode === 'admin_dashboard' ? 'public' : 'admin_dashboard');
            }}
          />

          {/* Theme Toggle Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-1.5 sm:px-2.5 sm:py-2 text-xs font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            {theme === 'light' ? (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            )}
            <span className="hidden xl:inline text-[11px] text-zinc-700 dark:text-zinc-300">
              {theme === 'light' ? 'Dark' : 'Light'}
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              audioFeedback.play('click');
              setIsCartOpen(true);
            }}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm border border-emerald-700 active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
            <span className="hidden xs:inline">{t('cartButton')}</span>
            <motion.span
              key={totalCartItems}
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-emerald-800 text-white font-bold text-[10px] sm:text-[11px]"
            >
              {totalCartItems}
            </motion.span>
          </motion.button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* UTILITY & MULTILINGUAL BAR (Below Header)                           */}
      {/* =================================================================== */}
      <div className="bg-stone-100 dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 px-3 sm:px-8 py-2 no-print transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 truncate min-w-0">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{t('tagline')}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'public') {
                  handleNavigate(
                    authToken && currentAdmin ? 'admin_dashboard' : 'admin_login'
                  );
                } else {
                  handleNavigate('public');
                }
              }}
              className="md:hidden font-bold text-[#00C1FD] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              {viewMode === 'public'
                ? t('navAdminPortal')
                : t('navPublicStore')}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Persistent Language Selector (English, Hindi, Punjabi) */}
            <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-white dark:bg-zinc-950 p-0.5 sm:p-1 rounded-lg border border-zinc-300 dark:border-zinc-700">
              <Globe className="w-3 h-3 text-zinc-500 ml-1 mr-0.5" />
              {(['en', 'hi', 'pa'] as LanguageCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    lang === code
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
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
      {/* MAIN VIEWPORT (pb-32 + bottom spacer guarantees zero nav overlap)   */}
      {/* =================================================================== */}
      <main className="flex-1 pb-32">
        {viewMode === 'admin_login' && (
          <AdminLoginView
            onLoginSuccess={(token, adm) => {
              setAuthToken(token);
              setCurrentAdmin(adm);
              writeCache(CACHE_KEYS.ADMIN_SESSION, { token, admin: adm });
              handleNavigate('admin_dashboard');
              fetchAdminDashboard(token);
            }}
            onBackToCatalogue={() => handleNavigate('public')}
          />
        )}

        {viewMode === 'admin_dashboard' && currentAdmin && authToken && (
          <AdminDashboardView
            currentAdmin={currentAdmin}
            admins={adminList}
            products={adminProducts}
            movements={stockMovements}
            settings={settings}
            activeTab={adminTab}
            onTabChange={(tab) => handleNavigate('admin_dashboard', tab)}
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
              handleNavigate('public');
            }}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onAdjustStock={handleAdjustStock}
            onDeleteProduct={handleDeleteProduct}
            onDeleteAll={handleDeleteAll}
            onUpdateSettings={handleUpdateSettings}
            onUpdateAdminProfile={handleUpdateAdminProfile}
          />
        )}

        {viewMode === 'public' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-7">
            {/* =============================================================== */}
            {/* HERO SECTION: OFFICIAL SONU DIESEL BHATTHI BANNER (BORDERLESS)  */}
            {/* =============================================================== */}
            <section className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="w-full bg-white dark:bg-zinc-900 flex items-center justify-center px-3 py-4 sm:px-6 sm:py-6 transition-colors">
                <img
                  src={HERO_WORKSHOP_IMAGE}
                  alt={settings.businessName || t('brandName')}
                  className="w-full max-w-2xl max-h-52 sm:max-h-68 object-contain mx-auto mix-blend-multiply dark:mix-blend-normal dark:opacity-90"
                />
              </div>
            </section>

            {/* =============================================================== */}
            {/* SEARCH, COMPACT SORT, DYNAMIC PRICE & ICON COLUMN CONTROLS      */}
            {/* =============================================================== */}
            <section
              id="catalogue-filters"
              className="scroll-mt-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 space-y-3.5 shadow-2xs transition-colors"
            >
              {/* Row 1: Search Input + Compact Sort + Icon Grid Toggle + Red Clear Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Search Input with Debounce Indicator */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full pl-9 pr-14 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-stone-50/70 dark:bg-zinc-950/70 focus:bg-white dark:focus:bg-zinc-950 text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleVoiceSearch}
                      title={isListening ? 'Stop Listening' : 'Voice Search'}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-zinc-400 hover:text-[#00C1FD] hover:bg-zinc-100'
                      }`}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                    {isSearchDebouncing && (
                      <RefreshCw
                        className="w-3.5 h-3.5 text-[#00C1FD] animate-spin"
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
                        className="text-red-500 hover:text-red-700 cursor-pointer p-1 rounded-md hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact Sort + Icon Column Toggle + Red Clear All Button */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                  {/* Small Compact Sort Dropdown */}
                  <div className="relative inline-flex items-center">
                    <ArrowUpDown className="w-3 h-3 text-zinc-500 absolute left-2.5 pointer-events-none" />
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
                      className="pl-7 pr-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 hover:bg-white dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer transition-colors"
                    >
                      <option value="FEATURED">Sort: Default</option>
                      <option value="PRICE_ASC">Price: Low → High</option>
                      <option value="PRICE_DESC">Price: High → Low</option>
                      <option value="STOCK_DESC">Stock: High → Low</option>
                      <option value="NAME_ASC">Name: A → Z</option>
                    </select>
                  </div>

                  {/* Icon-Only Column Switcher (Auto/2-Col vs 1-Col) */}
                  <div
                    className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 transition-colors"
                    role="group"
                    aria-label="Grid column layout"
                  >
                    <button
                      type="button"
                      onClick={() => setGridCols('auto')}
                      title="2-Column / Auto Grid"
                      aria-label="2-Column / Auto Grid"
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        gridCols === 'auto' || gridCols === 2
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <Grid2x2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGridCols(1)}
                      title="Single Column List View"
                      aria-label="Single Column List View"
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        gridCols === 1
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <Columns2 className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>

                  {/* Red Reset / Clear All Filters Button */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllCatalogueFilters}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('clearAllBtn')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Clean Dynamic Price Selection (Buttons + Custom Input) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1">
                    Price:
                  </span>
                  {[
                    { id: 'ALL', label: 'Any', value: null },
                    { id: '2500', label: '< 2.5k', value: 2500 },
                    { id: '5000', label: '< 5k', value: 5000 },
                    { id: '10000', label: '< 10k', value: 10000 },
                  ].map((btn) => {
                    const active = (btn.value === null && maxPriceLimit === null) || (btn.value !== null && maxPriceLimit === btn.value);
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => {
                          setPriceFilter('ALL');
                          setMaxPriceLimit(btn.value);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all border cursor-pointer ${
                          active
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs'
                            : 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Max Budget:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-bold text-[10px]">₹</span>
                    <input
                      type="number"
                      placeholder="Custom"
                      value={maxPriceLimit || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        setPriceFilter('ALL');
                        setMaxPriceLimit(val);
                      }}
                      className="w-20 sm:w-24 pl-5 pr-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 focus:bg-white dark:focus:bg-zinc-900 text-[11px] font-mono font-bold text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                    />
                    {maxPriceLimit && (
                      <button 
                        onClick={() => setMaxPriceLimit(null)}
                        className="absolute -right-1 -top-1 w-3.5 h-3.5 bg-zinc-400 dark:bg-zinc-600 text-white rounded-full flex items-center justify-center hover:bg-zinc-600 dark:hover:bg-zinc-400 cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Size Dropdown Selection + Result Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Bhatti Size:
                  </span>
                  <div className="relative">
                    <Maximize2 className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="pl-8 pr-8 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-600 text-[11px] font-bold text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all cursor-pointer appearance-none"
                    >
                      {[
                        { value: 'ALL', label: t('filterAllSizes') },
                        { value: 'Small', label: t('sizeSmall') },
                        { value: 'Medium', label: t('sizeMedium') },
                        { value: 'Large', label: t('sizeLarge') },
                        { value: 'Extra Large', label: t('sizeExtraLarge') },
                      ].map((sz) => (
                        <option key={sz.value} value={sz.value}>
                          {sz.label} ({getSizeCount(sz.value)})
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-3 h-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center justify-between sm:justify-end gap-2">
                  <span>
                    Showing{' '}
                    <strong className="font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
                      {filteredProducts.length}
                    </strong>{' '}
                    of {activePublicProducts.length} models
                  </span>
                </div>
              </div>
            </section>

            {/* =============================================================== */}
            {/* UNIFIED PRODUCT CATALOGUE GRID                                  */}
            {/* =============================================================== */}
            <section id="catalogue-grid" className="scroll-mt-24 space-y-6">
              {filteredProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3 transition-colors"
                >
                  <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                    {t('noProductsFound')}
                  </p>
                  <button
                    type="button"
                    onClick={resetAllCatalogueFilters}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('clearAllBtn')}</span>
                  </button>
                </motion.div>
              ) : (
                <div
                  className={`grid ${
                    gridCols === 1
                      ? 'grid-cols-1 gap-4 max-w-xl mx-auto w-full'
                      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5'
                  }`}
                >
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product) => {
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
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{
                            duration: 0.15,
                            ease: 'easeOut',
                          }}
                          className="group bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm cursor-pointer"
                        >
                          <div>
                            {/* Product Image Inset Frame (4:3) */}
                            <div className="relative aspect-[4/3] bg-stone-100 dark:bg-zinc-950 overflow-hidden border-b border-zinc-200 dark:border-zinc-800 transition-colors">
                              <ProductImage
                                src={product.imageUrl}
                                alt={product.name}
                                sizeLabel={product.size}
                                className="w-full h-full object-contain"
                                enableHoverEffect={true}
                              />

                              {/* Interactive Zoom / Inspect Trigger */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedProduct(product);
                                }}
                                className="hidden sm:flex absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-xs text-white text-[10px] font-semibold items-center gap-1 opacity-90 group-hover:opacity-100 transition-all duration-150 cursor-pointer shadow-xs border border-zinc-700"
                              >
                                <Maximize2 className="w-3 h-3 text-white" />
                                <span>{t('zoomPhotoBtn')}</span>
                              </button>
                            </div>

                            {/* Card Body: Bigger Product Name & Green/Red Stock Display */}
                            <div className="p-3 sm:p-4 space-y-2">
                              {/* Metadata: Size & Green/Red Stock Status */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                                <span className="font-bold text-zinc-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md text-[11px]">
                                  {translateSize(product.size)}
                                </span>
                                <span
                                  className={`font-mono tabular-nums font-extrabold text-[11px] sm:text-xs px-2 py-0.5 rounded-md border ${
                                    outOfStock
                                      ? 'bg-red-50 border-red-200 text-red-600'
                                      : isLowStock
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  }`}
                                >
                                  {outOfStock
                                    ? t('outOfStock')
                                    : `${product.stockQuantity} in stock`}
                                </span>
                              </div>

                              {/* Bigger Product Name */}
                              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                                {product.name}
                              </h2>

                              {/* Dynamic Price Badge */}
                              <div className="pt-1.5 flex items-baseline justify-between border-t border-stone-100 dark:border-zinc-800 transition-colors">
                                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                  {t('priceLabel')}
                                </span>
                                <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-zinc-900 dark:text-zinc-50 transition-colors">
                                  ₹{product.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Add to Cart (Green) / Quantity Stepper (Red Minus, Green Plus) */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1"
                          >
                            {cartEntry ? (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 flex items-center justify-between gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 transition-colors">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCartQty(
                                        product.id,
                                        cartEntry.quantity - 1
                                      )
                                    }
                                    aria-label="Decrease quantity"
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="text-xs sm:text-sm font-extrabold font-mono tabular-nums text-zinc-900 dark:text-zinc-50 truncate px-1 transition-colors">
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
                                    aria-label="Increase quantity"
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer transition-colors font-bold shadow-2xs"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const now = new Date();
                                    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                    const date = now.toLocaleDateString('en-IN');
                                    const customerName = currentUser?.name || 'Customer';
                                    const stockMsg = product.stockQuantity <= 0 ? 'Please request an order (Out of Stock)' : 'Do you have this in stock?';
                                    const text = `Product: ${product.name}\nCustomer: ${customerName}\nQty: ${cartEntry.quantity}\nTime: ${time}\nDate: ${date}\n\n${stockMsg}`;
                                    window.open(`https://wa.me/${(settings.whatsappNumber || '918708381844').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                                  title="Inquire on WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={outOfStock}
                                  onClick={() => addToCart(product)}
                                  className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs ${
                                    outOfStock
                                      ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white'
                                  }`}
                                >
                                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {outOfStock
                                      ? t('outOfStock')
                                      : t('addToCart')}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const now = new Date();
                                    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                    const date = now.toLocaleDateString('en-IN');
                                    const customerName = currentUser?.name || 'Customer';
                                    const stockMsg = product.stockQuantity <= 0 ? 'Please request an order (Out of Stock)' : 'Do you have this in stock?';
                                    const text = `Product: ${product.name}\nCustomer: ${customerName}\nQty: 1\nTime: ${time}\nDate: ${date}\n\n${stockMsg}`;
                                    window.open(`https://wa.me/${(settings.whatsappNumber || '918708381844').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-zinc-200 hover:bg-emerald-50 hover:border-emerald-500 text-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                                  title="Inquire on WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Dedicated bottom scroll clearance spacer so no card is ever hidden behind the fixed bottom bar */}
        <div className="h-24 w-full shrink-0 no-print" aria-hidden="true" />
      </main>

      {/* =================================================================== */}
      {/* DETAILED PRODUCT SPECIFICATION SHEET MODAL (MATCHING ATTACHED UI)   */}
      {/* =================================================================== */}
      <ProductDetailSheetModal
        product={inspectedProduct}
        allProducts={filteredProducts}
        cart={cart}
        settings={settings}
        currentUser={currentUser}
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
              <Sparkles className="w-4 h-4 text-[#00C1FD]" />
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
      {/* OFFLINE & AUTOMATIC SYNC INDICATOR (Positioned above bottom nav)    */}
      {/* =================================================================== */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg max-w-md no-print">
          <WifiOff className="w-4 h-4 text-[#00C1FD] shrink-0" />
          <span>{t('offlineBanner')}</span>
        </div>
      )}

      {isOnline && syncToast && (
        <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg no-print">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 text-[#00C1FD] animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{syncToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* FULLY ATTACHED BOTTOM APP NAVIGATION BAR                            */}
      {/* =================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-6px_24px_rgba(0,0,0,0.3)] px-3 py-2 no-print transition-colors">
        <div className="max-w-md mx-auto bg-stone-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full py-1 px-3 flex items-center justify-around text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors">
          <button
            type="button"
            onClick={() => {
              handleNavigate('public');
            }}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
              viewMode === 'public'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px]">Catalogue</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-bold">Cart</span>
            {totalCartItems > 0 && (
              <span className="absolute -top-0.5 right-0.5 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-bold shadow-2xs ring-2 ring-white dark:ring-zinc-900">
                {totalCartItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsOrdersModalOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4 text-[#00C1FD]" />
            <span className="text-[10px]">Orders</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleNavigate(
                authToken && currentAdmin ? 'admin_dashboard' : 'admin_login'
              );
            }}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
              viewMode === 'admin_login' || viewMode === 'admin_dashboard'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-500" />
            <span className="text-[10px]">Admin</span>
          </button>
        </div>
      </nav>
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
