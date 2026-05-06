'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Activity, CreditCard, Box, TrendingUp, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DynamicDashboard({ appId, widgets, token, pages }: { appId: string, widgets: any[], token?: string, pages?: any[] }) {
  const router = useRouter();
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const results: Record<string, any> = {};
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await Promise.all(widgets.map(async (w, idx) => {
        if (w.type !== 'stat' || !w.model) return;
        try {
          const res = await fetch(`/api/apps/${appId}/aggregate?model=${w.model}&type=${w.aggregation || 'count'}&field=${w.field || ''}`, { headers });
          const json = await res.json();
          results[idx] = json.success ? json.data.value : 0;
        } catch {
          results[idx] = 0;
        }
      }));
      setData(results);
      setLoading(false);
    }
    loadData();
  }, [appId, widgets, token]);

  const handleWidgetClick = (modelName?: string) => {
    if (!modelName || !pages) return;
    // Find a page that has a table for this model
    const page = pages.find(p => p.components?.some((c: any) => c.type === 'table' && c.model === modelName));
    if (page) {
      router.push(`/app/${appId}${page.path === '/' ? '' : page.path}`);
    }
  };

  const getIcon = (name?: string) => {
    switch (name?.toLowerCase()) {
      case 'users': case 'people': return <Users />;
      case 'activity': case 'pulse': return <Activity />;
      case 'money': case 'currency': case 'payment': return <CreditCard />;
      case 'box': case 'product': return <Box />;
      case 'trend': case 'chart': return <TrendingUp />;
      case 'dashboard': return <LayoutDashboard />;
      default: return <HelpCircle />;
    }
  };

  const getColorClass = (color?: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      red: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      yellow: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    };
    return map[color || ''] || 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <motion.div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.1 }
        }
      }}
    >
      {widgets.map((w, i) => {
        if (w.type === 'stat') {
          return (
            <motion.div 
              key={i} 
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1 }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => handleWidgetClick(w.model)}
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden group active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                {React.cloneElement(getIcon(w.icon || w.title) as React.ReactElement, { size: 100 } as any)}
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20", getColorClass(w.color))}>
                  {React.cloneElement(getIcon(w.icon || w.title) as React.ReactElement, { size: 24 } as any)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">{w.title}</p>
                  {loading ? (
                    <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  ) : (
                    <h4 className="text-3xl font-bold tracking-tight text-foreground">
                      {w.aggregation === 'sum' && w.field?.includes('price') ? '$' : ''}
                      {data[i]?.toLocaleString() || '0'}
                    </h4>
                  )}
                </div>
              </div>
            </motion.div>
          );
        }
        return (
          <div key={i} className="col-span-1 sm:col-span-2 lg:grid-cols-4 bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground min-h-[200px] border-dashed">
            <LayoutDashboard size={32} className="mb-4 opacity-50" />
            <p>Widget type <strong>{w.type}</strong> is not fully implemented.</p>
          </div>
        );
      })}
    </motion.div>
  );
}
