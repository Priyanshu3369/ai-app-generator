'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, AlertCircle } from 'lucide-react';
import DynamicTable from './DynamicTable';
import DynamicForm from './DynamicForm';
import DynamicDashboard from './DynamicDashboard';
import CSVImporter from './CSVImporter';
import NotificationInbox from './NotificationInbox';
import { cn } from '@/lib/utils';

interface ComponentConfig {
  type: string;
  id?: string;
  model?: string;
  props?: Record<string, unknown>;
  columns?: any[];
  actions?: any[];
  fields?: string[];
  onSubmit?: string;
  successMessage?: string;
  widgets?: any[];
  children?: ComponentConfig[];
}

interface ModelConfig {
  name: string;
  fields: any[];
  userScoped?: boolean;
}

export default function PageRenderer({ appId, components, models, pages, token }: { appId: string, components: ComponentConfig[], models: ModelConfig[], pages: any[], token?: string }) {
  return (
    <div className="flex flex-col gap-8 w-full">
      {components.map((comp, idx) => (
        <ComponentRenderer key={comp.id || idx} appId={appId} component={comp} models={models} pages={pages} token={token} />
      ))}
    </div>
  );
}

function ComponentRenderer({ appId, component, models, pages, token }: { appId: string; component: ComponentConfig; models: ModelConfig[]; pages: any[]; token?: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const model = models.find(m => m.name === component.model);

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const method = editRecord ? 'PUT' : 'POST';
    const body = editRecord ? { ...data, id: editRecord.id } : data;
    const res = await fetch(`/api/apps/${appId}/data/${component.model}`, { method, headers, body: JSON.stringify(body) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    setShowForm(false);
    setEditRecord(null);
    setRefreshKey(k => k + 1);
  };

  switch (component.type) {
    case 'table': {
      const columns = component.columns || model?.fields.filter(f => !f.hidden).slice(0, 8).map(f => ({ field: f.name, header: f.label || f.name })) || [];
      const actions = component.actions || [{ label: 'Edit', action: 'edit' }, { label: 'Delete', action: 'delete' }];
      return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center px-6 py-5 border-b border-border bg-muted/20">
            <h3 className="text-lg font-semibold tracking-tight">{component.props?.title as string || (model ? model.name : 'Data Table')}</h3>
            <button 
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New
            </button>
          </div>
          
          <AnimatePresence>
            {showForm && model && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                  onClick={() => { setShowForm(false); setEditRecord(null); }}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[90vh] flex flex-col"
                >
                  <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-lg">{editRecord ? 'Edit Record' : 'Create New Record'}</h3>
                    <button onClick={() => { setShowForm(false); setEditRecord(null); }} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                    <DynamicForm
                      fields={component.fields ? model.fields.filter(f => component.fields!.includes(f.name)) : model.fields}
                      onSubmit={handleFormSubmit}
                      initialData={editRecord || undefined}
                      submitLabel={editRecord ? 'Save Changes' : 'Create Record'}
                      successMessage={component.successMessage}
                      onCancel={() => { setShowForm(false); setEditRecord(null); }}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          
          <div className="p-6">
            <DynamicTable appId={appId} model={component.model!} columns={columns} actions={actions} onEdit={(record) => { setEditRecord(record); setShowForm(true); }} token={token} refreshKey={refreshKey} />
          </div>
        </div>
      );
    }

    case 'form': {
      if (!model) return <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">Form Error: Model not found</div>;
      return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden max-w-2xl">
          <div className="px-6 py-5 border-b border-border bg-muted/20">
            <h3 className="text-lg font-semibold tracking-tight">{component.props?.title as string || `Create ${model.name}`}</h3>
          </div>
          <div className="p-6">
            <DynamicForm fields={component.fields ? model.fields.filter(f => component.fields!.includes(f.name)) : model.fields} onSubmit={handleFormSubmit} submitLabel={component.onSubmit === 'update' ? 'Save Changes' : 'Create Record'} successMessage={component.successMessage} />
          </div>
        </div>
      );
    }

    case 'dashboard': {
      return (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold tracking-tight px-1">{component.props?.title as string || 'Overview Metrics'}</h3>
          <DynamicDashboard appId={appId} widgets={component.widgets || []} token={token} pages={pages} />
        </div>
      );
    }

    case 'csv-import': {
      if (!model) return <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">CSV Error: Model not found</div>;
      return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/20">
            <h3 className="text-lg font-semibold tracking-tight">{component.props?.title as string || `Import Data into ${model.name}`}</h3>
          </div>
          <div className="p-6">
            <CSVImporter appId={appId} model={model.name} fields={model.fields} token={token} onComplete={() => setRefreshKey(k => k + 1)} />
          </div>
        </div>
      );
    }

    case 'heading': {
      return <h2 className="text-2xl font-bold tracking-tight mt-4">{component.props?.text as string || component.props?.content as string || 'Heading'}</h2>;
    }

    case 'text': {
      return <p className="text-muted-foreground leading-relaxed text-base">{component.props?.text as string || component.props?.content as string || ''}</p>;
    }

    case 'stats': {
      const widgets = (component.widgets || []).map(w => ({ ...w, type: 'stat' }));
      return <DynamicDashboard appId={appId} widgets={widgets} token={token} pages={pages} />;
    }

    default: {
      return (
        <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Unknown Component Type</p>
            <code className="text-xs bg-destructive/10 px-2 py-1 rounded">{component.type}</code>
            {component.children && (
              <div className="mt-4 flex flex-col gap-4">
                {component.children.map((child, i) => <ComponentRenderer key={i} appId={appId} component={child} models={models} token={token} />)}
              </div>
            )}
          </div>
        </div>
      );
    }
  }
}
