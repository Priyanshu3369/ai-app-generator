'use client';
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, Loader2, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CSVImporter({ appId, model, fields, token, onComplete }: { appId: string, model: string, fields: any[], token?: string, onComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [data, setData] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (res) => {
        const fileHeaders = res.meta.fields || [];
        setHeaders(fileHeaders);
        const autoMap: Record<string, string> = {};
        fields.forEach(field => {
          const match = fileHeaders.find(h => h.toLowerCase() === field.name.toLowerCase());
          if (match) autoMap[match] = field.name;
        });
        setMapping(autoMap);
        setStep(2);
      }
    });
  };

  const executeImport = () => {
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const payload = res.data.map((row: any) => {
          const record: any = {};
          Object.keys(mapping).forEach(csvHeader => {
            const dbField = mapping[csvHeader];
            if (dbField) record[dbField] = row[csvHeader];
          });
          return record;
        });

        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const response = await fetch(`/api/apps/${appId}/import`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model, data: payload })
          });
          const json = await response.json();
          if (json.success) {
            setResult({ success: json.data.successCount, failed: json.data.failedCount });
            if (onComplete) onComplete();
          } else {
            throw new Error(json.error);
          }
        } catch (err) {
          alert('Import failed: ' + (err as Error).message);
        } finally {
          setImporting(false);
          setStep(3);
        }
      }
    });
  };

  const variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" variants={variants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-card/50 hover:bg-card/80 transition-colors cursor-pointer group" onClick={() => fileRef.current?.click()}>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload CSV File</h3>
            <p className="text-muted-foreground text-center max-w-md">Drag and drop your CSV file here, or click to browse. Ensure your file contains headers.</p>
            <input type="file" accept=".csv" className="hidden" ref={fileRef} onChange={handleFileChange} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" variants={variants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
                <div>
                  <h4 className="font-medium text-sm">{file?.name}</h4>
                  <p className="text-xs text-muted-foreground">{headers.length} columns detected</p>
                </div>
              </div>
              <button onClick={() => { setStep(1); setFile(null); }} className="text-sm font-medium text-muted-foreground hover:text-foreground">Change File</button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Map Columns to Database Fields</h3>
              <div className="grid gap-3">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card">
                    <div className="flex-1 font-mono text-sm">{h}</div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        value={mapping[h] || ''}
                        onChange={(e) => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                      >
                        <option value="">-- Ignore Column --</option>
                        {fields.map(f => (
                          <option key={f.name} value={f.name}>{f.label || f.name} ({f.type})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-2">
              <button
                onClick={executeImport}
                disabled={importing || Object.values(mapping).filter(Boolean).length === 0}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-8 disabled:opacity-50"
              >
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Run Import'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && result && (
          <motion.div key="step3" variants={variants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center p-12 text-center border border-border rounded-2xl bg-card">
            {result.failed === 0 ? (
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
              </div>
            )}
            <h3 className="text-2xl font-bold tracking-tight mb-2">Import Complete</h3>
            <div className="flex gap-8 mt-6 mb-8">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-emerald-500">{result.success}</span>
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Success</span>
              </div>
              <div className="w-px bg-border"></div>
              <div className="flex flex-col items-center">
                <span className={result.failed > 0 ? "text-3xl font-bold text-rose-500" : "text-3xl font-bold text-muted-foreground"}>{result.failed}</span>
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Failed</span>
              </div>
            </div>
            <button
              onClick={() => { setStep(1); setFile(null); setMapping({}); setResult(null); }}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-6"
            >
              Import Another File
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
