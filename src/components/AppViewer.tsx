'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, LogOut, ChevronRight, LayoutDashboard, CheckSquare, 
  Package, Users, Settings, BarChart3, MessageSquare, Calendar,
  FolderOpen, CreditCard, Ticket, ClipboardList, Briefcase, FileText, Eye, EyeOff,
  AlertCircle
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
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden" style={{ '--primary': config.theme?.primaryColor || '240 5.9% 10%' } as React.CSSProperties}>
        {/* Abstract background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-[420px] glass rounded-[2.5rem] overflow-hidden relative z-10 border-white/10 shadow-2xl"
        >
          <div className="p-10">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-6 font-black text-2xl shadow-xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                {config.appName[0].toUpperCase()}
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2 text-gradient-primary">{config.appName}</h1>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest opacity-60">
                {authMode === 'login' ? (config.auth?.ui?.loginTitle || 'Welcome Back') : (config.auth?.ui?.signupTitle || 'Join the Platform')}
              </p>
            </div>

            {authError && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-xs font-bold text-destructive flex items-center gap-3">
                <AlertCircle size={18} /> {authError}
              </motion.div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              {authMode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                  <input type="text" className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold focus-ring transition-all" value={authForm.name} onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email address</label>
                <input type="email" required className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold focus-ring transition-all" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold focus-ring transition-all pr-12" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={authLoading} className="w-full inline-flex items-center justify-center rounded-2xl text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 h-12 mt-4 transition-all active:scale-[0.98] disabled:opacity-50">
                {authLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
          <div className="px-10 py-6 bg-white/5 border-t border-white/10 text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {authMode === 'login' ? "New here? " : 'Already a member? '}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} className="text-primary hover:underline underline-offset-4 ml-1">
                {authMode === 'login' ? 'Register' : 'Login'}
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
      return <Icon size={20} />;
    }
    const defaultIcon = iconMap[path?.replace('/', '') || ''] || FileText;
    return React.createElement(defaultIcon, { size: 20 });
  };

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden selection:bg-primary/20" style={{ '--primary': config.theme?.primaryColor || '240 5.9% 10%' } as React.CSSProperties}>
      
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 88 }}
        className={cn("hidden md:flex flex-col border-r border-white/5 bg-card/30 glass transition-all duration-500 z-30 overflow-hidden")}
      >
        <div className="h-20 flex items-center px-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20 shrink-0 rotate-3">
              {config.appName[0].toUpperCase()}
            </div>
            {sidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="font-black text-lg tracking-tight truncate text-gradient-primary"
              >
                {config.appName}
              </motion.span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2 no-scrollbar">
          {config.pages.map((page, idx) => (
            <button 
              key={idx} 
              onClick={() => { setActivePage(idx); router.push(`/app/${appId}${page.path !== '/' ? page.path : ''}`); }}
              className={cn(
                "flex items-center gap-4 w-full rounded-2xl px-4 py-3.5 text-sm font-bold transition-all group relative",
                activePage === idx 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                !sidebarOpen && "justify-center px-0"
              )}
              title={!sidebarOpen ? page.title : undefined}
            >
              <span className={cn("shrink-0 transition-transform duration-300 group-hover:scale-110", activePage === idx ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                {getPageIcon(page.icon, page.path)}
              </span>
              {sidebarOpen && <span className="truncate tracking-wide">{page.title}</span>}
              {activePage === idx && sidebarOpen && (
                <motion.div layoutId="activeNav" className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary-foreground/50" />
              )}
            </button>
          ))}
        </div>

        {user && (
          <div className="p-6 border-t border-white/5 shrink-0 bg-white/2">
            <div className={cn("flex items-center", sidebarOpen ? "justify-between" : "justify-center")}>
              {sidebarOpen && (
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-sm font-black uppercase shrink-0 border border-primary/20">
                    {user.name ? user.name[0] : user.email[0]}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-black truncate leading-none mb-1">{user.name || 'User'}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{user.email.split('@')[0]}</span>
                  </div>
                </div>
              )}
              <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive p-2.5 rounded-xl hover:bg-destructive/10 transition-all active:scale-90" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside 
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[85%] max-w-sm border-r border-white/10 bg-card z-[70] flex flex-col md:hidden shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]"
          >
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20 rotate-3">
                  {config.appName[0].toUpperCase()}
                </div>
                <span className="font-black text-lg tracking-tight text-gradient-primary">{config.appName}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground p-2 active:scale-90 transition-transform"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
              {config.pages.map((page, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setActivePage(idx); setMobileMenuOpen(false); router.push(`/app/${appId}${page.path !== '/' ? page.path : ''}`); }}
                  className={cn(
                    "flex items-center gap-4 w-full rounded-2xl px-5 py-4 text-base font-bold transition-all", 
                    activePage === idx ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02]" : "text-muted-foreground active:bg-white/5"
                  )}
                >
                  <span className={activePage === idx ? "text-primary-foreground" : "text-primary"}>
                    {getPageIcon(page.icon, page.path)}
                  </span>
                  <span className="tracking-wide">{page.title}</span>
                </button>
              ))}
            </div>
            {user && (
              <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/2">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-base font-black uppercase border border-primary/20">
                    {user.name ? user.name[0] : user.email[0]}
                  </div>
                  <div className="flex flex-col overflow-hidden text-left">
                    <span className="text-base font-black truncate leading-none mb-1">{user.name || 'User'}</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest truncate">{user.email}</span>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive p-3 rounded-2xl bg-white/5 active:scale-90"><LogOut size={22} /></button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050505] overflow-hidden relative">
        
        {/* Topbar */}
        <header className="h-20 border-b border-white/5 bg-card/30 glass backdrop-blur-2xl flex items-center justify-between px-6 lg:px-10 z-20 sticky top-0 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground active:scale-90 transition-transform">
              <Menu size={28} />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-white/5 transition-all active:scale-90">
              <Menu size={22} />
            </button>
            
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-2">
              <div 
                className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary cursor-pointer transition-colors" 
                onClick={() => { setActivePage(0); router.push(`/app/${appId}`); }}
              >
                {config.appName}
              </div>
              <ChevronRight size={14} className="text-white/20" />
              <div className="text-sm font-bold tracking-wide text-foreground px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                {currentPage?.title || 'Route'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button 
              onClick={() => { setActivePage(0); router.push(`/app/${appId}`); }} 
              className="text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-xl px-4 py-2.5 hover:bg-white/5 transition-all hidden sm:flex items-center gap-2 active:scale-95"
            >
              <LayoutDashboard size={14} className="text-primary" /> Overview
            </button>
            {config.notifications && <NotificationInbox appId={appId} token={token} />}
            <button onClick={() => router.push('/')} className="text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-xl px-4 py-2.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all hidden sm:block active:scale-95">
              Exit App
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {currentPage ? (
                <motion.div
                  key={currentPath}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div>
                      <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gradient-primary mb-2">{currentPage.title}</h1>
                      <div className="h-1 w-12 bg-primary rounded-full" />
                    </div>
                  </div>
                  <PageRenderer
                    appId={appId}
                    components={currentPage.components as any[]}
                    models={config.models as any[]}
                    pages={config.pages as any[]}
                    token={token}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="h-[60vh] flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/2 glass"
                >
                  <div className="w-20 h-20 bg-muted/20 rounded-[2rem] flex items-center justify-center mb-8">
                    <LayoutDashboard className="w-10 h-10 text-muted-foreground opacity-20" />
                  </div>
                  <h2 className="text-3xl font-black mb-3 tracking-tight">Lost in Space</h2>
                  <p className="text-muted-foreground mb-10 max-w-sm text-center font-medium opacity-60">This module is not present in your engine configuration.</p>
                  <button onClick={() => router.push('/')} className="inline-flex items-center justify-center rounded-2xl text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 h-14 px-10 active:scale-95 transition-all">
                    Return Home
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>

  );
}
