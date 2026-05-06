'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, LogOut, ChevronRight, LayoutDashboard, CheckSquare, 
  Package, Users, Settings, BarChart3, MessageSquare, Calendar,
  FolderOpen, CreditCard, Ticket, ClipboardList, Briefcase, FileText, Eye, EyeOff
} from 'lucide-react';
import PageRenderer from '@/components/dynamic/PageRenderer';
import NotificationInbox from '@/components/dynamic/NotificationInbox';
import { cn } from '@/lib/utils';

interface AppConfig {
  appName: string;
  appId?: string;
  theme?: { primaryColor?: string; darkMode?: boolean };
  auth?: { enabled: boolean; ui?: { loginTitle?: string; signupTitle?: string } };
  models: { name: string; fields: any[]; userScoped?: boolean }[];
  pages: { path: string; title: string; icon?: string; requiresAuth?: boolean; components: Record<string, unknown>[] }[];
  notifications?: unknown[];
}

export default function AppViewer() {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId as string;
  const slugParts = (params.slug as string[]) || [];
  const currentPath = '/' + slugParts.join('/');

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    fetch(`/api/apps/${appId}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setConfig(j.data.config);
        else setError(j.error || 'App not found');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [appId]);

  useEffect(() => {
    const saved = localStorage.getItem(`token_${appId}`);
    const savedUser = localStorage.getItem(`user_${appId}`);
    if (saved) setToken(saved);
    if (savedUser) try { setUser(JSON.parse(savedUser)); } catch {}
  }, [appId]);

  useEffect(() => {
    if (config?.pages) {
      const idx = config.pages.findIndex(p => p.path === currentPath);
      if (idx >= 0) setActivePage(idx);
    }
  }, [config, currentPath]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: authMode, ...authForm, appId }),
      });
      const json = await res.json();
      if (json.success) {
        setToken(json.data.token);
        setUser(json.data.user);
        localStorage.setItem(`token_${appId}`, json.data.token);
        localStorage.setItem(`user_${appId}`, JSON.stringify(json.data.user));
      } else {
        setAuthError(json.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem(`token_${appId}`);
    localStorage.removeItem(`user_${appId}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Initializing Workspace...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-xl text-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
          <X size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Application Error</h2>
        <p className="text-muted-foreground mb-8">{error}</p>
        <button onClick={() => router.push('/')} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-6 w-full">
          Return to Platform
        </button>
      </div>
    </div>
  );

  if (!config) return null;

  const needsAuth = config.auth?.enabled;
  const currentPage = config.pages[activePage];
  const pageRequiresAuth = currentPage?.requiresAuth || needsAuth;

  if (pageRequiresAuth && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" style={{ '--primary': config.theme?.primaryColor || '240 5.9% 10%' } as React.CSSProperties}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl shadow-inner">
                {config.appName[0].toUpperCase()}
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">{config.appName}</h1>
              <p className="text-sm text-muted-foreground">
                {authMode === 'login' ? (config.auth?.ui?.loginTitle || 'Sign in to continue') : (config.auth?.ui?.signupTitle || 'Create your account')}
              </p>
            </div>

            {authError && (
              <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center gap-2">
                <X size={16} /> {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={authForm.name} onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email address</label>
                <input type="email" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={authLoading} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2 transition-all disabled:opacity-50">
                {authLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
          <div className="px-8 py-4 bg-muted/50 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} className="font-medium text-primary hover:underline">
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const iconMap: Record<string, React.ElementType> = {
    'layout-dashboard': LayoutDashboard, 'check-square': CheckSquare, 'package': Package,
    'users': Users, 'settings': Settings, 'bar-chart': BarChart3, 'message-square': MessageSquare,
    'calendar': Calendar, 'folder': FolderOpen, 'credit-card': CreditCard, 'ticket': Ticket,
    'clipboard': ClipboardList, 'briefcase': Briefcase, 'file': FileText
  };

  const getPageIcon = (iconName?: string, path?: string) => {
    if (iconName && iconMap[iconName]) {
      const Icon = iconMap[iconName];
      return <Icon size={18} />;
    }
    const defaultIcon = iconMap[path?.replace('/', '') || ''] || FileText;
    return React.createElement(defaultIcon, { size: 18 });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ '--primary': config.theme?.primaryColor || '240 5.9% 10%' } as React.CSSProperties}>
      
      {/* Desktop Sidebar */}
      <aside className={cn("hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 z-20", sidebarOpen ? "w-64" : "w-[72px]")}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold flex-shrink-0">
              {config.appName[0].toUpperCase()}
            </div>
            {sidebarOpen && <span className="font-semibold truncate">{config.appName}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {config.pages.map((page, idx) => (
            <button 
              key={idx} 
              onClick={() => { setActivePage(idx); router.push(`/app/${appId}${page.path !== '/' ? page.path : ''}`); }}
              className={cn(
                "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors group",
                activePage === idx 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                !sidebarOpen && "justify-center px-0"
              )}
              title={!sidebarOpen ? page.title : undefined}
            >
              <span className={cn("flex-shrink-0", activePage === idx ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                {getPageIcon(page.icon, page.path)}
              </span>
              {sidebarOpen && <span className="truncate">{page.title}</span>}
            </button>
          ))}
        </div>

        {user && (
          <div className="p-4 border-t border-border">
            <div className={cn("flex items-center", sidebarOpen ? "justify-between" : "justify-center")}>
              {sidebarOpen && (
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 border border-border">
                    {user.name ? user.name[0] : user.email[0]}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{user.name || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>
              )}
              <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside 
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-3/4 max-w-sm border-r border-border bg-card z-50 flex flex-col md:hidden shadow-2xl"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold">
                  {config.appName[0].toUpperCase()}
                </div>
                <span className="font-semibold truncate">{config.appName}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground p-2"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {config.pages.map((page, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setActivePage(idx); setMobileMenuOpen(false); router.push(`/app/${appId}${page.path !== '/' ? page.path : ''}`); }}
                  className={cn("flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium", activePage === idx ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary")}
                >
                  {getPageIcon(page.icon, page.path)} {page.title}
                </button>
              ))}
            </div>
            {user && (
              <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold uppercase border border-border">
                    {user.name ? user.name[0] : user.email[0]}
                  </div>
                  <div className="flex flex-col overflow-hidden text-left">
                    <span className="text-sm font-medium truncate">{user.name || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive p-2"><LogOut size={18} /></button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
              <Menu size={24} />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary transition-colors">
              <Menu size={20} />
            </button>
            
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center text-sm font-medium text-muted-foreground">
              <span 
                className="hover:text-foreground cursor-pointer transition-colors" 
                onClick={() => { setActivePage(0); router.push(`/app/${appId}`); }}
                title="Go to App Dashboard"
              >
                {config.appName}
              </span>
              <ChevronRight size={16} className="mx-2 opacity-50" />
              <span className="text-foreground">{currentPage?.title || 'Unknown Route'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActivePage(0); router.push(`/app/${appId}`); }} 
              className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-secondary transition-colors hidden sm:flex items-center gap-1.5"
            >
              <LayoutDashboard size={14} /> Dashboard
            </button>
            {config.notifications && <NotificationInbox appId={appId} token={token} />}
            <button onClick={() => router.push('/')} className="text-xs font-medium border border-border rounded-md px-3 py-1.5 hover:bg-secondary transition-colors hidden sm:block">
              Exit App
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentPage ? (
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight">{currentPage.title}</h1>
                </div>
                <PageRenderer
                  appId={appId}
                  components={currentPage.components as any[]}
                  models={config.models as any[]}
                  token={token}
                />
              </motion.div>
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-card">
                <LayoutDashboard className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
                <p className="text-muted-foreground mb-6">This route does not exist in the application configuration.</p>
                <button onClick={() => router.push('/')} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4">
                  Return Home
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
