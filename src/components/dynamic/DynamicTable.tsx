'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, ArrowUpDown, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnDef {
  field: string;
  header: string;
  render?: string;
  sortable?: boolean;
}

interface ActionDef {
  label: string;
  action: string;
  confirm?: boolean;
}

export default function DynamicTable({ appId, model, columns, actions, onEdit, token, refreshKey }: { appId: string, model: string, columns: ColumnDef[], actions?: ActionDef[], onEdit?: (r: any) => void, token?: string, refreshKey?: number }) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 10;

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) q.set('search', search);
      if (sortField) { q.set('sort', sortField); q.set('order', sortOrder); }
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/apps/${appId}/data/${model}?${q.toString()}`, { headers });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTotal(json.pagination.total);
      } else {
        throw new Error(json.error);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [appId, model, page, search, sortField, sortOrder, token, refreshKey]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAction = async (act: string, record: any) => {
    if (act === 'edit' && onEdit) {
      onEdit(record);
    } else if (act === 'delete') {
      if (!confirm('Are you sure you want to delete this record?')) return;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/apps/${appId}/data/${model}?id=${record.id}`, { method: 'DELETE', headers });
      loadData();
    }
  };

  const renderCell = (val: any, renderType?: string) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground/50">—</span>;
    if (renderType === 'badge') return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
        {String(val)}
      </span>
    );
    if (renderType === 'currency') return <span className="font-medium">${Number(val).toFixed(2)}</span>;
    if (renderType === 'date') return <span className="text-muted-foreground">{new Date(val).toLocaleDateString()}</span>;
    if (typeof val === 'boolean') return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset", val ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400")}>
        {val ? 'Yes' : 'No'}
      </span>
    );
    if (typeof val === 'object') return <span className="font-mono text-xs text-muted-foreground">{JSON.stringify(val)}</span>;
    return <span className="text-sm">{String(val)}</span>;
  };

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search records..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
          <span>{total} records found</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table/Card View */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card/50 glass relative min-h-[200px]">
        {loading && data.length === 0 && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold bg-muted/30 border-b border-border">
              <tr>
                {columns.map(col => (
                  <th key={col.field} className="px-6 py-4 font-bold whitespace-nowrap">
                    <div 
                      className={cn("flex items-center gap-1.5", col.sortable !== false && "cursor-pointer hover:text-foreground transition-colors")} 
                      onClick={() => col.sortable !== false && handleSort(col.field)}
                    >
                      {col.header}
                      {col.sortable !== false && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                  </th>
                ))}
                {actions && actions.length > 0 && <th className="px-6 py-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <motion.tbody 
              className="divide-y divide-border/50"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
            >
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-20 text-center text-muted-foreground font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-20 mb-2" />
                      No records found.
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <motion.tr 
                    key={row.id || i} 
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className={cn(
                      "bg-transparent hover:bg-muted/30 transition-all group/row",
                      onEdit && "cursor-pointer"
                    )}
                    onClick={() => onEdit && onEdit(row)}
                  >
                    {columns.map(col => (
                      <td key={col.field} className="px-6 py-4 whitespace-nowrap font-medium text-foreground/80">
                        {renderCell(row[col.field], col.render)}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/row:translate-x-0">
                          {actions.map(act => (
                            <button
                              key={act.action}
                              onClick={() => handleAction(act.action, row)}
                              className={cn(
                                "p-2 rounded-xl border border-border bg-background hover:scale-110 active:scale-95 transition-all shadow-sm",
                                act.action === 'delete' && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-muted-foreground"
                              )}
                              title={act.label}
                            >
                              {act.action === 'edit' ? <Edit2 className="w-4 h-4" /> : act.action === 'delete' ? <Trash2 className="w-4 h-4" /> : <span className="text-xs px-1 font-bold uppercase">{act.label}</span>}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </motion.tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-border/50">
          {data.length === 0 && !loading ? (
            <div className="px-6 py-20 text-center text-muted-foreground font-medium">
              <div className="flex flex-col items-center gap-2">
                <Search className="w-8 h-8 opacity-20 mb-2" />
                No records found.
              </div>
            </div>
          ) : (
            data.map((row, i) => (
              <motion.div 
                key={row.id || i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 flex flex-col gap-4 bg-card/30 hover:bg-muted/20 active:bg-muted/40 transition-colors"
                onClick={() => onEdit && onEdit(row)}
              >
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  {columns.map(col => (
                    <div key={col.field} className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{col.header}</span>
                      <div className="text-sm font-semibold truncate">
                        {renderCell(row[col.field], col.render)}
                      </div>
                    </div>
                  ))}
                </div>
                {actions && actions.length > 0 && (
                  <div className="flex items-center justify-end gap-3 pt-3 mt-1 border-t border-border/50" onClick={e => e.stopPropagation()}>
                    {actions.map(act => (
                      <button
                        key={act.action}
                        onClick={() => handleAction(act.action, row)}
                        className={cn(
                          "flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border border-border shadow-sm active:scale-95",
                          act.action === 'delete' ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-background text-foreground"
                        )}
                      >
                        {act.action === 'edit' ? <Edit2 className="w-3.5 h-3.5" /> : act.action === 'delete' ? <Trash2 className="w-3.5 h-3.5" /> : null}
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest order-2 sm:order-1">
          Showing <span className="text-foreground">{Math.min((page - 1) * limit + 1, total)}</span>–<span className="text-foreground">{Math.min(page * limit, total)}</span> <span className="mx-1 text-muted-foreground/30">/</span> <span className="text-foreground">{total}</span>
        </div>
        <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all border-2 border-border bg-card hover:bg-accent hover:border-primary/50 h-10 px-6 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= total}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all border-2 border-border bg-card hover:bg-accent hover:border-primary/50 h-10 px-6 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}

    </div>
  );
}
