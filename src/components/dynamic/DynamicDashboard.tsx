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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full"
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
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1 }
              }}
              onClick={() => handleWidgetClick(w.model)}
              className="group hover-lift relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm cursor-pointer glass"
            >
              {/* Decorative background glow */}
              <div className={cn("absolute -right-8 -bottom-8 w-32 h-32 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full", 
                w.color === 'blue' ? 'bg-blue-500' : 
                w.color === 'green' ? 'bg-emerald-500' : 
                w.color === 'red' ? 'bg-rose-500' : 
                w.color === 'yellow' ? 'bg-amber-500' : 
                w.color === 'purple' ? 'bg-purple-500' : 
                w.color === 'orange' ? 'bg-orange-500' : 
                'bg-primary'
              )} />

              <div className="flex flex-col gap-6 relative z-10">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:scale-110", getColorClass(w.color))}>
                  {React.cloneElement(getIcon(w.icon || w.title) as React.ReactElement, { size: 28 } as any)}
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">{w.title}</p>
                    <div className="h-px flex-1 bg-border/50 group-hover:bg-primary/20 transition-colors" />
                  </div>
                  
                  {loading ? (
                    <div className="h-10 w-24 bg-muted/50 rounded-xl animate-shimmer" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-4xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {w.aggregation === 'sum' && w.field?.includes('price') ? (
                          <span className="text-2xl font-bold text-muted-foreground mr-1">$</span>
                        ) : ''}
                        {data[i]?.toLocaleString() || '0'}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+12%</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Subtle accent line */}
              <div className={cn("absolute bottom-0 left-0 right-0 h-1 transition-all duration-500 transform scale-x-0 group-hover:scale-x-100", 
                w.color === 'blue' ? 'bg-blue-500' : 
                w.color === 'green' ? 'bg-emerald-500' : 
                w.color === 'red' ? 'bg-rose-500' : 
                'bg-primary'
              )} />
            </motion.div>
          );
        }
        return (
          <div key={i} className="col-span-full sm:col-span-1 bg-card border border-border rounded-3xl p-10 flex flex-col items-center justify-center text-muted-foreground min-h-[220px] border-dashed glass">
            <LayoutDashboard size={40} className="mb-6 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest text-center">Widget: <span className="text-foreground">{w.type}</span></p>
            <p className="text-xs font-medium opacity-60 mt-1">Pending implementation</p>
          </div>
        );
      })}
    </motion.div>

  );
}
