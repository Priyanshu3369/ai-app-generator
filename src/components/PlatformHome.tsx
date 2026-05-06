'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Rocket, Database, Lock, TableProperties, Bell, 
  Trash2, ChevronRight, Play, Server, Code2, Plus, Grip 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SAMPLE_CONFIG = {
  appName: "TaskFlow",
  description: "Enterprise task and project management",
  auth: { enabled: true, methods: ["email"] },
  theme: { primaryColor: "#6366f1", darkMode: true },
  models: [
    {
      name: "tasks",
      userScoped: true,
      fields: [
        { name: "title", type: "string", label: "Title", required: true },
        { name: "description", type: "text", label: "Description" },
        { name: "status", type: "select", label: "Status", options: ["Todo", "In Progress", "Done"], defaultValue: "Todo" },
        { name: "priority", type: "select", label: "Priority", options: ["Low", "Medium", "High"], defaultValue: "Medium" }
      ]
    }
  ],
  pages: [
    {
      path: "/dashboard",
      title: "Overview",
      icon: "layout-dashboard",
      components: [
        {
          type: "dashboard",
          widgets: [
            { type: "stat", title: "Active Tasks", model: "tasks", aggregation: "count", color: "blue", icon: "list-todo" }
          ]
        }
      ]
    },
    {
      path: "/tasks",
      title: "Tasks",
      icon: "check-square",
      components: [
        {
          type: "table",
          model: "tasks",
          columns: [
            { field: "title", header: "Title" },
            { field: "status", header: "Status", render: "badge" },
            { field: "priority", header: "Priority", render: "badge" }
          ],
          actions: [{ label: "Edit", action: "edit" }, { label: "Delete", action: "delete", confirm: true }]
        }
      ]
    }
  ]
};

const CRM_CONFIG = {
  appName: "Sales CRM",
  description: "Customer Relationship Management System",
  auth: { enabled: true, methods: ["email"] },
  theme: { primaryColor: "#10b981", darkMode: true },
  models: [
    {
      name: "customers",
      userScoped: true,
      fields: [
        { name: "name", type: "string", label: "Company Name", required: true },
        { name: "contact", type: "string", label: "Contact Person" },
        { name: "email", type: "string", label: "Email" },
        { name: "status", type: "select", label: "Status", options: ["Lead", "Active", "Churned"], defaultValue: "Lead" }
      ]
    }
  ],
  pages: [
    {
      path: "/dashboard",
      title: "Dashboard",
      icon: "layout-dashboard",
      components: [
        { type: "dashboard", widgets: [{ type: "stat", title: "Total Customers", model: "customers", aggregation: "count", color: "green", icon: "users" }] }
      ]
    },
    {
      path: "/customers",
      title: "Customers",
      icon: "users",
      components: [
        {
          type: "table", model: "customers",
          columns: [{ field: "name", header: "Company" }, { field: "email", header: "Email" }, { field: "status", header: "Status", render: "badge" }],
          actions: [{ label: "Edit", action: "edit" }, { label: "Delete", action: "delete", confirm: true }]
        }
      ]
    }
  ]
};

const INVENTORY_CONFIG = {
  appName: "StockFlow",
  description: "Warehouse & Inventory Management",
  auth: { enabled: true, methods: ["email"] },
  theme: { primaryColor: "#f59e0b", darkMode: false },
  models: [
    {
      name: "products",
      userScoped: true,
      fields: [
        { name: "sku", type: "string", label: "SKU", required: true },
        { name: "name", type: "string", label: "Product Name", required: true },
        { name: "quantity", type: "integer", label: "Quantity in Stock", required: true },
        { name: "price", type: "currency", label: "Unit Price" }
      ]
    }
  ],
  pages: [
    {
      path: "/dashboard",
      title: "Overview",
      icon: "layout-dashboard",
      components: [
        { type: "dashboard", widgets: [
          { type: "stat", title: "Total Products", model: "products", aggregation: "count", color: "orange", icon: "box" },
          { type: "stat", title: "Total Stock Value", model: "products", aggregation: "sum", field: "price", color: "green", icon: "money" }
        ]}
      ]
    },
    {
      path: "/inventory",
      title: "Inventory",
      icon: "package",
      components: [
        {
          type: "table", model: "products",
          columns: [{ field: "sku", header: "SKU" }, { field: "name", header: "Product Name" }, { field: "quantity", header: "Stock", render: "badge" }, { field: "price", header: "Price", render: "currency" }],
          actions: [{ label: "Edit", action: "edit" }, { label: "Delete", action: "delete", confirm: true }]
        }
      ]
    }
  ]
};

interface App {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function PlatformHome() {
  const router = useRouter();
  const [configText, setConfigText] = useState(JSON.stringify(SAMPLE_CONFIG, null, 2));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    fetch('/api/apps')
      .then(r => r.json())
      .then(j => { if (j.success) setApps(j.data || []); })
      .catch(() => {})
      .finally(() => setLoadingApps(false));
  }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      let parsed;
      try { parsed = JSON.parse(configText); } catch { throw new Error('Invalid JSON syntax.'); }
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: parsed }),
      });
      const json = await res.json();
      if (json.success) router.push(`/app/${json.data.appId}`);
      else setError(json.error || 'Failed to create app');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm('Delete this app? This cannot be undone.')) return;
    await fetch(`/api/apps/${id}`, { method: 'DELETE' });
    setApps(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 glass">
        <div className="container-px mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
            <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Terminal size={20} />
            </div>
            <span className="text-gradient-primary">AI App Generator</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="#apps" className="hidden sm:inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2">My Apps</a>
            <button 
              onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-ring bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg h-9 px-4 sm:px-6"
            >
              Start Building
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full pt-20 pb-24 sm:pt-32 sm:pb-40 flex flex-col items-center justify-center text-center container-px">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[400px] w-[400px] rounded-full bg-primary/10 opacity-30 blur-[120px] animate-pulse-glow"></div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center rounded-full border border-border/50 glass px-4 py-1.5 text-xs font-semibold mb-8 tracking-wide">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2.5 animate-pulse"></span>
            PRODUCTION READY v1.0
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight max-w-5xl mb-8 leading-[1.1]">
            Build apps at the speed of <span className="text-gradient-vibrant">thought</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Transform simple JSON into full-stack, enterprise-grade web applications. Instant deployment with UI, DB, and Auth included.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button 
              onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl text-base font-bold transition-all focus-ring bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 h-14 px-10"
            >
              <Rocket className="mr-2.5 h-5 w-5" /> Initialize Project
            </button>
            <a 
              href="#features" 
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl text-base font-bold transition-all focus-ring border-2 border-border bg-card/50 hover:bg-muted h-14 px-10 glass"
            >
              Explore Features
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="container-px mx-auto section-py">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5">Enterprise grade core</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Everything you need to ship production applications in seconds, without writing a single line of boilerplate.</p>
        </div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {[
            { icon: <TableProperties />, title: 'Dynamic UI', desc: 'Auto-rendered forms, tables, and dashboards that scale with your data.' },
            { icon: <Server />, title: 'Auto REST APIs', desc: 'Secure, high-performance CRUD endpoints generated for every model.' },
            { icon: <Database />, title: 'Live Database', desc: 'Dynamic PostgreSQL schema evolution powered by our DDL engine.' },
            { icon: <Lock />, title: 'Pro Auth', desc: 'Production-ready JWT authentication with deep tenant isolation.' },
            { icon: <Grip />, title: 'Data Tools', desc: 'Smart CSV imports and bulk management tools out of the box.' },
            { icon: <Bell />, title: 'Events Engine', desc: 'Real-time notifications and transactional email triggers.' },
          ].map((f, i) => (
            <motion.div 
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              className="group hover-lift relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 sm:p-10"
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                {f.icon}
              </div>
              <h3 className="mb-3 text-2xl font-bold">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Apps Section */}
      <section id="apps" className="border-y border-border bg-muted/20 section-py">
        <div className="container-px mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 text-center sm:text-left">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">My Workspaces</h2>
              <p className="text-muted-foreground font-medium">Manage your active deployments and app configurations.</p>
            </div>
            <button 
              onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="inline-flex items-center text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-all"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Create New Workspace
            </button>
          </div>

          {loadingApps ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-muted-foreground animate-pulse">Loading Workspaces...</span>
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center rounded-3xl border-2 border-dashed border-border p-12 sm:p-20 bg-card/50 glass">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
                <Code2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Launch your first app</h3>
              <p className="text-muted-foreground mb-10 max-w-md mx-auto font-medium leading-relaxed">Your list of workspaces is currently empty. Use the JSON engine below to initialize your first deployment.</p>
              <button 
                onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                className="inline-flex items-center justify-center rounded-2xl text-base font-bold bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 h-12 px-10"
              >
                Open Editor
              </button>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              {apps.map(app => (
                <motion.div 
                  key={app.id} 
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    show: { opacity: 1, scale: 1 }
                  }}
                  className="group hover-lift rounded-3xl border border-border bg-card p-8 shadow-sm flex flex-col"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-secondary rounded-2xl">
                      <Rocket className="h-5 w-5 text-primary" />
                    </div>
                    <button onClick={() => handleDeleteApp(app.id)} className="text-muted-foreground hover:text-destructive p-2 rounded-xl hover:bg-destructive/10 transition-all opacity-0 sm:opacity-100 sm:group-hover:opacity-100">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-2xl truncate mb-3">{app.name}</h3>
                  <p className="text-muted-foreground flex-grow mb-8 line-clamp-2 font-medium leading-relaxed">{app.description}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-border">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">Created</span>
                      <span className="text-xs font-bold">{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => router.push(`/app/${app.id}`)} className="inline-flex items-center justify-center rounded-xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground h-10 px-5 transition-all">
                      Launch App
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Editor Section */}
      <AnimatePresence>
        {showEditor && (
          <motion.section 
            id="builder"
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className="container-px mx-auto section-py max-w-6xl"
          >
            <div className="rounded-[2.5rem] border border-border bg-card shadow-2xl overflow-hidden glass">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <Code2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl leading-none mb-1">JSON Configuration</h2>
                    <p className="text-xs font-medium text-muted-foreground">Define your application schema</p>
                  </div>
                </div>
                <button 
                  onClick={handleCreate} 
                  disabled={creating}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl text-base font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 h-12 px-8 disabled:opacity-50 transition-all"
                >
                  {creating ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin mr-3" /> : <Play className="mr-2.5 h-5 w-5 fill-current" />}
                  Deploy Engine
                </button>
              </div>
              
              <div className="px-8 py-4 border-b border-border bg-background/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-4">Templates</span>
                <button onClick={() => setConfigText(JSON.stringify(SAMPLE_CONFIG, null, 2))} className="text-xs font-bold px-4 py-2 rounded-xl border border-border bg-card hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap">Task Manager</button>
                <button onClick={() => setConfigText(JSON.stringify(CRM_CONFIG, null, 2))} className="text-xs font-bold px-4 py-2 rounded-xl border border-border bg-card hover:border-green-500/50 hover:text-green-500 transition-all whitespace-nowrap">Sales CRM</button>
                <button onClick={() => setConfigText(JSON.stringify(INVENTORY_CONFIG, null, 2))} className="text-xs font-bold px-4 py-2 rounded-xl border border-border bg-card hover:border-orange-500/50 hover:text-orange-500 transition-all whitespace-nowrap">Inventory System</button>
              </div>
              
              {error && (
                <div className="px-8 py-4 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm font-bold flex items-center gap-2">
                  <X className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted/20 border-r border-border hidden sm:flex flex-col items-center py-6 text-[10px] font-bold text-muted-foreground/50 select-none pointer-events-none">
                  {configText.split('\n').map((_, i) => <div key={i} className="h-6 leading-6">{i + 1}</div>)}
                </div>
                <textarea
                  className="w-full h-[500px] sm:h-[650px] p-6 sm:pl-16 bg-[#010409] text-[#c9d1d9] font-mono text-sm focus:outline-none resize-none leading-6 selection:bg-primary/30"
                  value={configText}
                  onChange={e => setConfigText(e.target.value)}
                  spellCheck={false}
                />
                <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-[10px] font-bold text-muted-foreground bg-card/80 px-2 py-1 rounded border border-border glass">JSON Mode</div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="border-t border-border mt-auto bg-card/50 glass">
        <div className="container-px mx-auto py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2.5 font-bold text-foreground">
            <div className="w-6 h-6 bg-primary/10 text-primary rounded flex items-center justify-center">
              <Terminal size={14} />
            </div>
            AI App Generator
          </div>
          <p>© {new Date().getFullYear()} All rights reserved. Built for creators.</p>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>

  );
}
