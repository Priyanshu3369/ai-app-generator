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

      <div className="rounded-md border border-border overflow-hidden bg-card relative">
        {loading && data.length === 0 && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
              <tr>
                {columns.map(col => (
                  <th key={col.field} className="px-6 py-3 font-semibold whitespace-nowrap">
                    <div 
                      className={cn("flex items-center gap-1", col.sortable !== false && "cursor-pointer hover:text-foreground transition-colors")} 
                      onClick={() => col.sortable !== false && handleSort(col.field)}
                    >
                      {col.header}
                      {col.sortable !== false && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                  </th>
                ))}
                {actions && actions.length > 0 && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <motion.tbody 
              className="divide-y divide-border"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground">
                    No records found.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <motion.tr 
                    key={row.id || i} 
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 }
                    }}
                    className={cn(
                      "bg-card hover:bg-muted/30 transition-colors group",
                      onEdit && "cursor-pointer"
                    )}
                    onClick={() => onEdit && onEdit(row)}
                  >
                    {columns.map(col => (
                      <td key={col.field} className="px-6 py-4 whitespace-nowrap">
                        {renderCell(row[col.field], col.render)}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {actions.map(act => (
                            <button
                              key={act.action}
                              onClick={() => handleAction(act.action, row)}
                              className={cn(
                                "p-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors",
                                act.action === 'delete' && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-muted-foreground"
                              )}
                              title={act.label}
                            >
                              {act.action === 'edit' ? <Edit2 className="w-4 h-4" /> : act.action === 'delete' ? <Trash2 className="w-4 h-4" /> : <span className="text-xs px-1">{act.label}</span>}
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
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{Math.min((page - 1) * limit + 1, total)}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= total}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
