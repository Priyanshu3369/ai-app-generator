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
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4 justify-between">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
              <Terminal size={18} />
            </div>
            AI App Generator
          </div>
          <div className="flex items-center gap-4">
            <a href="#apps" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">My Apps</a>
            <button 
              onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              Start Building
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full pt-24 pb-32 flex flex-col items-center justify-center text-center px-4">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-50 blur-[100px]"></div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Production Ready v1.0
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6">
            Generate apps from <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">JSON Config</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform structured JSON into fully working, enterprise-grade web applications instantly. UI, database, REST APIs, and authentication included.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="inline-flex items-center justify-center rounded-lg text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 h-12 px-8"
            >
              <Rocket className="mr-2 h-5 w-5" /> Initialize Project
            </button>
            <a 
              href="#features" 
              className="inline-flex items-center justify-center rounded-lg text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8"
            >
              Explore Features
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Enterprise capabilities out of the box</h2>
          <p className="text-lg text-muted-foreground">Everything you need to ship production applications in seconds.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { icon: <TableProperties />, title: 'Dynamic UI', desc: 'Forms, tables, and dashboards rendered automatically.' },
            { icon: <Server />, title: 'Auto REST APIs', desc: 'Secure CRUD endpoints generated instantly.' },
            { icon: <Database />, title: 'PostgreSQL DB', desc: 'Tables created and evolved dynamically via DDL.' },
            { icon: <Lock />, title: 'Authentication', desc: 'JWT auth with signup, login, and tenant isolation.' },
            { icon: <Grip />, title: 'CSV Import', desc: 'Interactive uploads with smart column mapping.' },
            { icon: <Bell />, title: 'Notifications', desc: 'Event-triggered alerts and mock email integration.' },
          ].map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-colors"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="mb-2 text-xl font-bold">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Apps Section */}
      <section id="apps" className="border-t border-border bg-muted/30 py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Your Workspaces</h2>
            <button 
              onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              <Plus className="mr-1 h-4 w-4" /> New Workspace
            </button>
          </div>

          {loadingApps ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : apps.length === 0 ? (
            <div className="text-center rounded-2xl border border-dashed border-border p-12 bg-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No apps created yet</h3>
              <p className="text-muted-foreground mb-6">Create your first application using the JSON config editor.</p>
              <button 
                onClick={() => { setShowEditor(true); setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4"
              >
                Create App
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map(app => (
                <div key={app.id} className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg truncate">{app.name}</h3>
                    <button onClick={() => handleDeleteApp(app.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground flex-grow mb-6 line-clamp-2">{app.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
                    <button onClick={() => router.push(`/app/${app.id}`)} className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80">
                      Launch <ChevronRight className="ml-1 h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Editor Section */}
      <AnimatePresence>
        {showEditor && (
          <motion.section 
            id="builder"
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="container mx-auto px-4 py-24 max-w-5xl"
          >
            <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">JSON Configuration</h2>
                </div>
                <button 
                  onClick={handleCreate} 
                  disabled={creating}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                >
                  {creating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> : <Play className="mr-2 h-4 w-4" />}
                  Deploy Engine
                </button>
              </div>
              
              {error && (
                <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted/30 border-r border-border flex flex-col items-center py-4 text-xs text-muted-foreground select-none pointer-events-none">
                  {configText.split('\n').map((_, i) => <div key={i} className="h-6">{i + 1}</div>)}
                </div>
                <textarea
                  className="w-full h-[600px] p-4 pl-16 bg-[#0d1117] text-[#c9d1d9] font-mono text-sm focus:outline-none resize-y leading-6"
                  value={configText}
                  onChange={e => setConfigText(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="border-t border-border mt-auto bg-background">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI App Generator. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
