'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldConfig {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  hidden?: boolean;
}

interface DynamicFormProps {
  fields: FieldConfig[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  initialData?: Record<string, unknown>;
  submitLabel?: string;
  successMessage?: string;
  onCancel?: () => void;
}

export default function DynamicForm({ fields, onSubmit, initialData = {}, submitLabel = 'Submit', successMessage, onCancel }: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (name: string) => {
    setShowPasswords(prev => ({ ...prev, [name]: !prev[name] }));
  };

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
    } else {
      const defaults: Record<string, unknown> = {};
      fields.forEach(f => {
        if (f.type === 'boolean') defaults[f.name] = false;
        else if (f.type === 'select' && f.options?.length) defaults[f.name] = f.options[0];
      });
      setFormData(defaults);
    }
  }, [JSON.stringify(initialData), JSON.stringify(fields)]);

  const handleChange = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await onSubmit(formData);
      if (successMessage) {
        setSuccess(successMessage);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const visibleFields = fields.filter(f => !f.hidden);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 text-sm font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleFields.map(f => (
          <div key={f.name} className={cn("flex flex-col gap-1.5", (f.type === 'text' || f.type === 'json') ? "md:col-span-2" : "")}>
            <label className="text-sm font-medium text-foreground">
              {f.label || f.name} {f.required && <span className="text-destructive">*</span>}
            </label>
            
            {f.type === 'text' || f.type === 'json' ? (
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                required={f.required}
                placeholder={f.placeholder}
                value={(formData[f.name] as string) || ''}
                onChange={e => handleChange(f.name, e.target.value)}
              />
            ) : f.type === 'select' ? (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                required={f.required}
                value={(formData[f.name] as string) || ''}
                onChange={e => handleChange(f.name, e.target.value)}
              >
                {f.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : f.type === 'boolean' ? (
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={!!formData[f.name]}
                  onChange={e => handleChange(f.name, e.target.checked)}
                />
                <div className="w-11 h-6 bg-input rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-muted-foreground">
                  {!!formData[f.name] ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            ) : f.type === 'password' ? (
              <div className="relative">
                <input
                  type={showPasswords[f.name] ? 'text' : 'password'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                  required={f.required}
                  placeholder={f.placeholder}
                  value={(formData[f.name] as string) || ''}
                  onChange={e => handleChange(f.name, e.target.value)}
                />
                <button type="button" onClick={() => togglePassword(f.name)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none">
                  {showPasswords[f.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            ) : (
              <input
                type={f.type === 'integer' || f.type === 'float' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                step={f.type === 'float' || f.type === 'currency' ? '0.01' : '1'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                required={f.required}
                placeholder={f.placeholder}
                value={(formData[f.name] as string | number) || ''}
                onChange={e => handleChange(f.name, e.target.type === 'number' ? Number(e.target.value) : e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-6 py-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : submitLabel}
        </button>
      </div>
    </form>
  );
}
