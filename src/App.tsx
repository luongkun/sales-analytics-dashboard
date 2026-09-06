import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nProvider';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductsProvider } from './context/ProductsContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout, ViewNavProvider } from './components/layout/Layout';
import { CommandPalette } from './components/CommandPalette';
import { CartDrawer } from './components/CartDrawer';
import { VIEW_TITLES } from './data/static';
import type { ViewId } from './lib/types';

import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { RevenuePage } from './pages/RevenuePage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { UpgradesPage } from './pages/UpgradesPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { TopupPage } from './pages/TopupPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { SupportPage } from './pages/SupportPage';
import { AiChatPage } from './pages/AiChatPage';
import { PolicyPage } from './pages/PolicyPage';
import { CheckoutPage } from './pages/CheckoutPage';

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <ProductsProvider>
              <CartProvider>
                <NotificationProvider>
                  <Shell />
                </NotificationProvider>
              </CartProvider>
            </ProductsProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<ViewId>('overview');
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl/⌘+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        if (view === 'checkout') setView('products');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  // Title động + sync parent (iframe)
  useEffect(() => {
    const title = `${VIEW_TITLES[view] || 'Dashboard'} · Sales Suite Pro`;
    document.title = title;
    try {
      if (window.parent && window.parent !== window) window.parent.document.title = title;
    } catch {
      /* cross-origin */
    }
  }, [view]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <ViewNavProvider value={{ setView }}>
      <Layout view={view} setView={setView} onOpenPalette={() => setPaletteOpen(true)}>
        <ErrorBoundary key={view}>
          {renderView(view, setView)}
        </ErrorBoundary>
      </Layout>
      <CartDrawer onCheckout={() => setView('checkout')} onBrowseProducts={() => setView('products')} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={setView} />
    </ViewNavProvider>
  );
}

function renderView(view: ViewId, setView: (v: ViewId) => void) {
  switch (view) {
    case 'overview':
      return <OverviewPage />;
    case 'revenue':
      return <RevenuePage />;
    case 'orders':
      return <OrdersPage />;
    case 'products':
      return <ProductsPage />;
    case 'customers':
      return <CustomersPage />;
    case 'reports':
      return <ReportsPage />;
    case 'upgrades':
      return <UpgradesPage />;
    case 'admin':
      return <AdminPage />;
    case 'profile':
      return <ProfilePage />;
    case 'topup':
      return <TopupPage />;
    case 'myorders':
      return <MyOrdersPage />;
    case 'support':
      return <SupportPage />;
    case 'aichat':
      return <AiChatPage />;
    case 'policy':
      return <PolicyPage />;
    case 'checkout':
      return <CheckoutPage onBack={() => setView('products')} onHome={() => setView('overview')} />;
    default:
      return <OverviewPage />;
  }
}
