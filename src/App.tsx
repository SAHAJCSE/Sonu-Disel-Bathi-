import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase.ts';
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
  Wallet,
  Share2,
  Heart,
  Lock,
  Mic,
  MicOff,
  MessageCircle,
  Sun,
  Moon,
  Settings,
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
import { SettingsPopup } from './components/SettingsPopup.tsx';
import { ActionFeedbackToast, ActionToastData } from './components/ActionFeedbackToast.tsx';
import { audioFeedback } from './utils/audioFeedback.ts';
import { useDebounce } from './hooks/useDebounce.ts';
import { ProductStructuredData } from './components/ProductStructuredData.tsx';
import { ProductSkeleton } from './components/ProductSkeleton.tsx';

const HERO_WORKSHOP_IMAGE =
  '/assets/aistudio/2a699790a8a58fccc2585b7051c3cd969c0efb91b5c7046a8963907a3f01ad54.png';
const HERO_DARK_IMAGE =
  '/assets/aistudio/file_00000000e6208208bb56f2c619997a8a_8a27068f.png';

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
  const [adminTab, setAdminTab] = useState<'inventory' | 'smart_entry' | 'history' | 'orders' | 'settings'>('inventory');
  
  const [viewHistory, setViewHistory] = useState<
    { mode: 'public' | 'admin_login' | 'admin_dashboard'; tab?: 'inventory' | 'smart_entry' | 'history' | 'orders' | 'settings' }[]
  >([]);

  const handleNavigate = useCallback(
    (newMode: 'public' | 'admin_login' | 'admin_dashboard', newTab?: 'inventory' | 'smart_entry' | 'history' | 'orders' | 'settings') => {
      if (newMode === viewMode && (!newTab || newTab === adminTab)) return;
      
      setViewHistory((prev) => [...prev, { mode: viewMode, tab: adminTab }]);
      setViewMode(newMode);
      if (newTab) setAdminTab(newTab);
      
      // Fix: Only scroll if NOT switching tabs within admin panel
      if (newMode !== 'admin_dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
  const [isFetching, setIsFetching] = useState(true);
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
  const [maxPriceLimit, setMaxPriceLimit] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<
    'FEATURED' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_DESC' | 'NAME_ASC'
  >('FEATURED');
  const [gridCols, setGridCols] = useState<'auto' | 1 | 2 | 3 | 4>('auto');
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [favourites, setFavourites] = useState<number[]>(() =>
    readCache<number[]>('sdb_favourites', [])
  );
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(
    null
  );

  useEffect(() => {
    writeCache('sdb_favourites', favourites);
  }, [favourites]);

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
  const [allOrders, setAllOrders] = useState<CustomerOrder[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      return 'light';
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
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'pa' ? 'pa-IN' : 'en-IN';

      rec.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0]?.transcript || '';
        }
        if (text.trim()) {
          setSearchQuery(text.trim());
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          showActionFeedback('Mic Blocked', 'Please allow microphone access in browser', 'general');
        }
      };

      rec.onend = () => {
        // If still in listening state, restart immediately to support long sessions until manually stopped
        if (isListeningRef.current) {
          try {
            rec.start();
          } catch (err) {
            console.warn('Speech recognition restart notice:', err);
            isListeningRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
    }
  }, [lang, showActionFeedback]);

  const toggleVoiceSearch = useCallback(() => {
    if (!recognitionRef.current) {
      showActionFeedback('Not Supported', 'Voice search not supported in this browser', 'general');
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch {}
    } else {
      try {
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
        audioFeedback.play('click');
      } catch (err) {
        console.error('Failed to start recognition:', err);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  }, [isListening, showActionFeedback]);

  const uploadImageIfBase64 = async (imageUrl: string, token: string): Promise<string> => {
    if (!imageUrl.startsWith('data:')) return imageUrl;
    try {
      const mimeMatch = imageUrl.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataBase64: imageUrl, mimeType }),
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
    setIsFetching(true);
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
    } finally {
      setIsFetching(false);
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
    // Orders page removed
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
  }, [fetchPublicCatalogue, fetchAdminDashboard, flushOfflineQueue, fetchNotifications]);

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
              showActionFeedback(
                newNotif.title,
                newNotif.message,
                'general',
                'notification'
              );
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
              showActionFeedback(
                `New Order #${ord.orderNumber}`,
                `₹${ord.totalAmount?.toLocaleString('en-IN')}`,
                'order_placed',
                'order_placed'
              );
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
              showActionFeedback(
                `Order #${ord.orderNumber} Updated`,
                ord.status?.toUpperCase(),
                'general',
                'notification'
              );
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
  }, [isOnline, fetchPublicCatalogue, fetchAdminDashboard, fetchNotifications]);

  // Real-time Firestore Sync (Guarantees parity across all devices and tabs)
  useEffect(() => {
    if (!isOnline) return;

    // 1. Listen for Product changes in real-time across all devices/browsers
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const allProducts: Product[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && (data.name || data.title)) {
          allProducts.push({
            id: Number(data.id) || Number(docSnap.id) || 0,
            name: String(data.name || data.title || ''),
            size: data.size || 'Medium',
            imageUrl: data.imageUrl || data.image || '',
            price: Number(data.price) || 0,
            stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : Number(data.stockQuantity) || 0,
            burnerType: data.burnerType || 'Commercial Burner',
            isActive: data.isActive !== false,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        }
      });
      allProducts.sort((a, b) => Number(a.id) - Number(b.id));
      if (allProducts.length > 0) {
        setAdminProducts(allProducts);
        const activeProducts = allProducts.filter((p) => p.isActive);
        setPublicProducts(activeProducts);
        writeCache(CACHE_KEYS.ADMIN_PRODUCTS, allProducts);
        writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, activeProducts);
      }
    }, (error) => {
      console.warn('Firestore Products listener error:', error);
    });

    // 2. Listen for Settings changes
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      snapshot.docs.forEach((docSnap) => {
        if (docSnap.id === 'global') {
          const newSettings = docSnap.data() as BusinessSettings;
          setSettings(newSettings);
          writeCache(CACHE_KEYS.SETTINGS, newSettings);
        }
      });
    }, (error) => {
      console.warn('Firestore Settings listener error:', error);
    });

    // 3. Listen for Orders changes
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const allOrdersList: CustomerOrder[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as CustomerOrder;
        if (data && data.orderNumber) {
          allOrdersList.push(data);
        }
      });
      allOrdersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (allOrdersList.length > 0) {
        setAllOrders(allOrdersList);
      }
    }, (error) => {
      console.warn('Firestore Orders listener error:', error);
    });

    // 4. Listen for Stock Movements
    const unsubMovements = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const allMovementsList: StockMovement[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as StockMovement;
        if (data && data.productId) {
          allMovementsList.push(data);
        }
      });
      allMovementsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (allMovementsList.length > 0) {
        setStockMovements(allMovementsList);
        writeCache(CACHE_KEYS.ADMIN_MOVEMENTS, allMovementsList);
      }
    }, (error) => {
      console.warn('Firestore Movements listener error:', error);
    });

    return () => {
      unsubProducts();
      unsubSettings();
      unsubOrders();
      unsubMovements();
    };
  }, [isOnline, currentUser?.uid]);

  // Cart Handlers
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;
    audioFeedback.play('add_to_cart');
    const existing = cart.find((item) => item.product.id === product.id);
    const newQty = existing ? Math.min(product.stockQuantity, existing.quantity + 1) : 1;
    showActionFeedback(
      newQty === 1 ? '1 item added to cart' : `${newQty} items in cart`,
      product.name,
      'cart_add'
    );
    setCart((prev) => {
      const ex = prev.find((item) => item.product.id === product.id);
      if (ex) {
        const nextQty = Math.min(product.stockQuantity, ex.quantity + 1);
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
    if (currentItem && !isCartOpen) {
      if (newQty > currentItem.quantity) {
        audioFeedback.play('add_to_cart');
      } else {
        audioFeedback.play('remove_from_cart');
      }
      showActionFeedback(
        `${newQty} ${newQty === 1 ? 'item' : 'items'} in cart`,
        currentItem.product.name,
        newQty > currentItem.quantity ? 'cart_add' : 'cart_update'
      );
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
            // Direct Firestore broadcast for instant multi-browser live sync
            void setDoc(doc(db, 'products', String(serverProduct.id)), serverProduct);
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
          void setDoc(doc(db, 'products', String(productId)), finalData, { merge: true });
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
    const target = adminProducts.find((p) => p.id === productId);
    const nextStock = target
      ? actionType === 'ADD'
        ? target.stockQuantity + amount
        : actionType === 'REMOVE'
        ? Math.max(0, target.stockQuantity - amount)
        : Math.max(0, amount)
      : amount;

    // 1. Instant optimistic stock update
    setAdminProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== productId) return p;
        return { ...p, stockQuantity: nextStock, updatedAt: new Date().toISOString() };
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
          const resData = await res.json().catch(() => null);
          const finalStock = resData?.product?.stockQuantity ?? nextStock;
          void setDoc(doc(db, 'products', String(productId)), { stockQuantity: finalStock }, { merge: true });
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
    // 1. Optimistic removal
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

    if (isOnline && authToken) {
      try {
        await fetch(`/api/admin/products/${productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        void deleteDoc(doc(db, 'products', String(productId)));
        void fetchAdminDashboard(authToken);
        void fetchPublicCatalogue();
        return;
      } catch {
        // offline queue
      }
    }

    enqueueOfflineAction('DELETE_PRODUCT', { productId }, `Delete product #${productId}`);
  };

  const handleDeleteAll = async () => {
    if (isOnline && authToken) {
      try {
        await fetch('/api/admin/products/delete-all', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setAdminProducts([]);
        setPublicProducts([]);
        setStockMovements([]);
        writeCache(CACHE_KEYS.ADMIN_PRODUCTS, []);
        writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, []);
        writeCache(CACHE_KEYS.ADMIN_MOVEMENTS, []);
        void fetchAdminDashboard(authToken);
        void fetchPublicCatalogue();
      } catch {
        alert('Could not clear catalogue while offline.');
      }
    } else {
      alert('Could not clear catalogue while offline.');
    }
  };

  const handleUpdateSettings = async (data: Partial<BusinessSettings>) => {
    // 1. Optimistic settings update
    setSettings((prev) => ({ ...prev, ...data }));
    writeCache(CACHE_KEYS.SETTINGS, { ...settings, ...data });

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
          void fetchAdminDashboard(authToken);
          void fetchPublicCatalogue();
          return;
        }
      } catch {
        // offline queue
      }
    }

    enqueueOfflineAction('UPDATE_SETTINGS', data, 'Update business settings');
  };

  const handleUpdateAdminProfile = async (
    adminId: number,
    email: string,
    name: string,
    newPassword?: string
  ) => {
    if (isOnline && authToken) {
      try {
        const res = await fetch(`/api/admin/profiles/${adminId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ email, name, newPassword }),
        });
        if (res.ok) {
          void fetchAdminDashboard(authToken);
          showActionFeedback('Profile Updated', 'Admin credentials changed', 'general');
        }
      } catch {
        alert('Cannot update profile while offline.');
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    if (isOnline && authToken) {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          void fetchAdminDashboard(authToken);
          showActionFeedback('Order Updated', `Status changed to ${status}`, 'general');
        }
      } catch {
        // No offline support for orders
      }
    }
  };

  const handleStockVerifiedUpdate = useCallback((latest: Product[]) => {
    setPublicProducts(latest.filter(p => p.isActive));
    writeCache(CACHE_KEYS.PUBLIC_PRODUCTS, latest.filter(p => p.isActive));
  }, []);

  const activePublicProducts = publicProducts;

  const catalogPriceBounds = useMemo(() => {
    if (activePublicProducts.length === 0) return { min: 0, max: 10000 };
    const prices = activePublicProducts.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
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

        const matchesCeiling =
          maxPriceLimit === null || p.price <= maxPriceLimit;

        const matchesFavourites =
          !showFavouritesOnly || favourites.includes(p.id);

        return (
          matchesSize &&
          matchesSearch &&
          matchesCeiling &&
          matchesFavourites
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
    maxPriceLimit,
    sortBy,
    showFavouritesOnly,
    favourites,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    debouncedSearchQuery.trim() !== '' ||
    selectedSize !== 'ALL' ||
    maxPriceLimit !== null ||
    showFavouritesOnly ||
    sortBy !== 'FEATURED';

  const resetAllCatalogueFilters = useCallback(() => {
    setSearchQuery('');
    flushSearchNow('');
    setSelectedSize('ALL');
    setMaxPriceLimit(null);
    setShowFavouritesOnly(false);
    setSortBy('FEATURED');
  }, [flushSearchNow]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      <ProductStructuredData products={publicProducts} settings={settings} />
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

      {/* Floating Settings Button - Top Right */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-6 right-6 z-40 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
      >
        <Settings className="w-6 h-6 text-zinc-900 dark:text-zinc-50" />
      </motion.button>

      {/* Main Viewport */}
      <main className="flex-1 pb-32 pt-20">
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
            orders={allOrders}
            settings={settings}
            activeTab={adminTab}
            onTabChange={(tab) => handleNavigate('admin_dashboard', tab)}
            authToken={authToken}
            isOnline={isOnline}
            offlineQueue={offlineQueue}
            isSyncing={isSyncing}
            onSyncNow={flushOfflineQueue}
            onUpdateOrderStatus={handleUpdateOrderStatus}
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
            {/* HERO SECTION: OFFICIAL SONU DIESEL BHATTHI BANNER               */}
            {/* =============================================================== */}
            <section className="overflow-hidden transition-colors relative w-full flex items-center justify-center py-2 sm:py-3">
              <div className="w-full max-w-2xl flex items-center justify-center p-3 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm transition-colors">
                <img
                  src={theme === 'dark' ? HERO_DARK_IMAGE : HERO_WORKSHOP_IMAGE}
                  alt={settings.businessName || 'Sonu Diesel Bhatti'}
                  className="w-full max-h-48 sm:max-h-60 object-contain mx-auto"
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
                <div className="relative flex-1 group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full pl-14 pr-40 py-4.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 focus:bg-white dark:focus:bg-zinc-900 text-[16px] text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all shadow-sm hover:shadow-md"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          flushSearchNow('');
                        }}
                        className="p-2.5 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleVoiceSearch}
                      title={isListening ? 'Stop Listening' : 'Voice Search'}
                      className={`h-11 px-6 rounded-full transition-all cursor-pointer font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse shadow-red-500/20' 
                          : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span className="hidden xs:inline">{isListening ? 'Stop' : 'Voice'}</span>
                    </button>
                  </div>
                </div>

                {/* Compact Sort + Icon Column Toggle + Red Clear All Button */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                  {/* Simple Budget Input */}
                  <div className="relative inline-flex items-center">
                    <Wallet className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
                    <input
                      type="number"
                      placeholder="Budget"
                      value={maxPriceLimit || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMaxPriceLimit(val === '' ? null : Number(val));
                      }}
                      className="pl-9 pr-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-950/50 text-[13px] font-bold text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-900 transition-all w-32"
                    />
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
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        gridCols === 'auto'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <Grid2x2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGridCols(1)}
                      title="1-Column List"
                      aria-label="1-Column List"
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        gridCols === 1
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Red Clear Filters (Only visible if something active) */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllCatalogueFilters}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('clearAllBtn')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Filters & Options */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {/* Size Selector */}
                <div className="relative flex-1 min-w-[130px]">
                  <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-950/50 text-[13px] font-bold text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-900 transition-all cursor-pointer appearance-none shadow-xs"
                  >
                    <option value="ALL">{t('filterAllSizes')} ({getSizeCount('ALL')})</option>
                    {['Small', 'Medium', 'Large', 'Extra Large'].map((sz) => (
                      <option key={sz} value={sz}>
                        {translateSize(sz)} ({getSizeCount(sz)})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
                  </div>
                </div>

                {/* Sort Selector */}
                <div className="relative flex-1 min-w-[130px]">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full pl-9 pr-8 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-950/50 text-[13px] font-bold text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-zinc-900 transition-all cursor-pointer appearance-none shadow-xs"
                  >
                    <option value="FEATURED">{t('sortFeatured')}</option>
                    <option value="PRICE_ASC">{t('sortPriceAsc')}</option>
                    <option value="PRICE_DESC">{t('sortPriceDesc')}</option>
                    <option value="STOCK_DESC">{t('sortStockDesc')}</option>
                    <option value="NAME_ASC">{t('sortNameAsc')}</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
                  </div>
                </div>

                {/* Favourites Only Toggle */}
                <button
                  type="button"
                  onClick={() => setShowFavouritesOnly((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    showFavouritesOnly
                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                      : 'bg-stone-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${showFavouritesOnly ? 'fill-white' : ''}`} />
                  <span>Favourites ({favourites.length})</span>
                </button>
              </div>
            </section>

            {/* =============================================================== */}
            {/* DYNAMIC PRODUCT GRID / LIST DISPLAY                             */}
            {/* =============================================================== */}
            <div id="catalogue-grid" className="scroll-mt-32 min-h-[400px]">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl transition-colors">
                  <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                    <Search className="w-8 h-8 text-zinc-300" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {showFavouritesOnly ? 'No Favourites Yet' : t('noProductsFound')}
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-sm px-4">
                      {showFavouritesOnly
                        ? 'Tap the heart icon on any bhatti to save and compare your favourite commercial burners.'
                        : 'Try adjusting your filters, budget, or search terms.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (showFavouritesOnly) {
                        setShowFavouritesOnly(false);
                      } else {
                        resetAllCatalogueFilters();
                      }
                    }}
                    className="px-5 py-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                  >
                    {showFavouritesOnly ? 'View All Products' : t('resetFilters')}
                  </button>
                </div>
              ) : (
                <div
                  className={`grid gap-4 sm:gap-6 ${
                    gridCols === 'auto'
                      ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                      : 'grid-cols-1 max-w-2xl mx-auto'
                  }`}
                >
                  {filteredProducts.map((product) => {
                    const outOfStock = product.stockQuantity <= 0;
                    const isFav = favourites.includes(product.id);
                    const cartEntry = cart.find((c) => c.product.id === product.id);
                    const quantityInCart = cartEntry ? cartEntry.quantity : 0;

                    return (
                      <motion.article
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ y: -3 }}
                        onClick={() => setInspectedProduct(product)}
                        className="group bg-zinc-900/90 dark:bg-zinc-900 text-white rounded-[28px] p-3.5 border border-zinc-200/20 dark:border-zinc-800/80 flex flex-col shadow-xl hover:shadow-2xl cursor-pointer transition-all duration-300"
                      >
                        {/* Image Container with Full Image coverage & Heart Button */}
                        <div className="relative aspect-square w-full bg-zinc-800/90 rounded-[22px] overflow-hidden mb-3.5 flex items-center justify-center">
                          <ProductImage
                            src={product.imageUrl}
                            alt={product.name}
                            sizeLabel={product.size}
                            fitMode="cover"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {/* Stock Count Circle Badge ("Show stock count on products with circle bg") */}
                          <div
                            className={`absolute top-2.5 left-2.5 w-9 h-9 rounded-full backdrop-blur-md flex flex-col items-center justify-center shadow-lg z-10 select-none border ${
                              outOfStock
                                ? 'bg-black/85 text-zinc-400 border-zinc-700/60'
                                : 'bg-black/75 text-white border-white/20'
                            }`}
                            title={outOfStock ? 'Out of stock' : `${product.stockQuantity} in stock`}
                          >
                            <span className="text-[11px] font-mono font-bold leading-tight">
                              {outOfStock ? '0' : product.stockQuantity}
                            </span>
                            <span className="text-[7px] uppercase font-bold tracking-tight text-zinc-300 leading-none">
                              {outOfStock ? 'out' : 'qty'}
                            </span>
                          </div>

                          {/* Favourite Heart Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isNowFav = !isFav;
                              setFavourites((prev) =>
                                isFav
                                  ? prev.filter((id) => id !== product.id)
                                  : [...prev, product.id]
                              );
                              showActionFeedback(
                                isNowFav ? 'Added to Favourites' : 'Removed from Favourites',
                                product.name,
                                isNowFav ? 'favorite_add' : 'favorite_remove',
                                'favorite'
                              );
                            }}
                            className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-md z-10"
                            aria-label="Toggle favourite"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                isFav ? 'fill-white text-white' : 'text-white/80'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex flex-col flex-1 px-1">
                          <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1 tracking-tight">
                            {product.name}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                            {product.size} • {product.burnerType || 'Commercial Burner'}
                          </p>

                          {/* Price and Cart Button (Expands to Stepper when in cart) */}
                          <div className="mt-3.5 pt-1 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                                ₹{product.price.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {quantityInCart > 0 ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="h-10 px-2 rounded-2xl bg-white text-zinc-950 flex items-center gap-1.5 shadow-md border border-zinc-200 shrink-0"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCartQty(product.id, quantityInCart - 1);
                                  }}
                                  className="w-7 h-7 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-90 text-zinc-900 flex items-center justify-center transition-all cursor-pointer font-bold"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-bold font-mono text-sm px-1 min-w-[18px] text-center text-zinc-950">
                                  {quantityInCart}
                                </span>
                                <button
                                  type="button"
                                  disabled={quantityInCart >= product.stockQuantity}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCartQty(product.id, quantityInCart + 1);
                                  }}
                                  className="w-7 h-7 rounded-xl bg-zinc-950 hover:bg-zinc-800 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer font-bold"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                disabled={outOfStock}
                                aria-label={outOfStock ? 'Out of stock' : 'Add to cart'}
                                className={`h-10 px-3.5 rounded-2xl flex items-center gap-1.5 transition-all shadow-md font-bold text-xs shrink-0 ${
                                  outOfStock
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-white text-zinc-950 hover:bg-zinc-100 active:scale-95 cursor-pointer'
                                }`}
                              >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </div>
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
        onStockVerifiedUpdate={handleStockVerifiedUpdate}
      />

      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        isSoundMuted={isSoundMuted}
        onToggleSound={toggleSoundMute}
        currentLang={lang}
        onChangeLang={setLang}
        isLoggedIn={!!authToken}
        onLogout={handleSignOut}
      />

      <AnimatePresence>
        {actionToast && (
          <ActionFeedbackToast
            key={actionToast.id}
            toast={actionToast}
            onDismiss={() => setActionToast(null)}
          />
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* OFFLINE & AUTOMATIC SYNC INDICATOR (Positioned above bottom nav)    */}
      {/* =================================================================== */}
      {!isOnline && (
        <div className="fixed bottom-16 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xl max-w-md no-print">
          <WifiOff className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>{t('offlineBanner')}</span>
        </div>
      )}

      {isOnline && syncToast && (
        <div className="fixed bottom-16 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xl no-print">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-zinc-200 shrink-0" />
          )}
          <span>{syncToast}</span>
        </div>
      )}

      {/* Floating Bottom Navigation Bar (Minimal Black & White Theme with Rounded Borders) */}
      <nav className="fixed bottom-3 left-0 right-0 z-40 px-3 pointer-events-none no-print">
        <div className="max-w-[340px] sm:max-w-sm mx-auto pointer-events-auto bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-300/80 dark:border-zinc-800 rounded-full p-1.5 flex items-center justify-between shadow-2xl transition-all">
          {/* Home Tab */}
          <button
            type="button"
            onClick={() => {
              handleNavigate('public');
              setShowFavouritesOnly(false);
            }}
            className={`flex-1 py-1.5 px-2 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
              viewMode === 'public' && !showFavouritesOnly
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
            aria-label="Home Catalogue"
          >
            <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Home</span>
          </button>

          {/* Favourites Tab (Toggles grid view visibility between all products and favourited items only) */}
          <button
            type="button"
            onClick={() => {
              if (viewMode !== 'public') handleNavigate('public');
              setShowFavouritesOnly((prev) => !prev);
            }}
            className={`flex-1 py-1.5 px-2 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer relative ${
              viewMode === 'public' && showFavouritesOnly
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
            aria-label="Toggle Favourites Filter"
          >
            <div className="relative">
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                  showFavouritesOnly ? 'fill-current scale-105' : ''
                }`}
              />
              {favourites.length > 0 && (
                <span
                  className={`absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center leading-none border ${
                    viewMode === 'public' && showFavouritesOnly
                      ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white border-zinc-900 dark:border-white'
                      : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-white/40 dark:border-zinc-900'
                  }`}
                >
                  {favourites.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Favourites</span>
          </button>

          {/* Cart Tab */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex-1 py-1.5 px-2 rounded-full flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all duration-200 cursor-pointer relative"
            aria-label="Open Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[9px] font-mono font-bold flex items-center justify-center leading-none border border-white/40 dark:border-zinc-900">
                  {totalCartItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Cart</span>
          </button>

          {/* Admin Tab */}
          <button
            type="button"
            onClick={() => handleNavigate(currentAdmin ? 'admin_dashboard' : 'admin_login')}
            className={`flex-1 py-1.5 px-2 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
              viewMode === 'admin_dashboard' || viewMode === 'admin_login'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
            aria-label="Admin Portal"
          >
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Admin</span>
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
