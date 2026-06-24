import { useState, useEffect } from 'react';
import { PackageOpen, Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

export function BulkOldFeePanel() {
  const [oldFees, setOldFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  useEffect(() => { fetchOldFees(); }, []);

  const fetchOldFees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/old-fees');
      setOldFees(res.data.data || []);
    } catch { toast.error('Failed to load old fees'); }
    finally { setLoading(false); }
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const template = [
      { enrollmentNo: 'PYPEER001', studentName: 'John Doe', amount: 5000, description: 'Pending Tuition Fee 2024', dueDate: '2025-01-01', remarks: 'Historical arrear' }
    ];
    const ws = XLSX.utils.json_to_sheet(template, {
      header: ['enrollmentNo', 'studentName', 'amount', 'description', 'dueDate', 'remarks']
    });
    ws['!cols'] = [16, 22, 10, 30, 12, 28].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OldFees');
    XLSX.writeFile(wb, 'old_fees_template.xlsx');
    toast.success('Template downloaded!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    setPreview([]);
    setPreviewErrors([]);

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = lines.slice(1).map(line => {
          const cols = line.split(',').map(c => c.trim());
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
          return obj;
        });
        validatePreview(rows);
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const normalized = rows.map((row: any) => {
          const n: any = {};
          Object.keys(row).forEach(k => { n[k.trim().toLowerCase()] = row[k]; });
          return n;
        });
        validatePreview(normalized);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const validatePreview = (rows: any[]) => {
    const errors: string[] = [];
    const validated = rows.map((row, i) => {
      const err: string[] = [];
      if (!row.enrollmentno && !row.enrollmentNo) err.push('Missing enrollmentNo');
      if (!row.amount || isNaN(parseFloat(row.amount))) err.push('Invalid amount');
      if (!row.duedate && !row.dueDate) err.push('Missing dueDate');
      if (err.length) errors.push(`Row ${i + 2}: ${err.join(', ')}`);
      return {
        ...row,
        enrollmentNo: row.enrollmentno || row.enrollmentNo,
        amount: parseFloat(row.amount),
        dueDate: row.duedate || row.dueDate,
        description: row.description || 'Old Fee Arrear',
        remarks: row.remarks || '',
        _valid: err.length === 0
      };
    });
    setPreview(validated);
    setPreviewErrors(errors);
  };

  const handleImport = async () => {
    const valid = preview.filter(r => r._valid);
    if (valid.length === 0) { toast.error('No valid records to import'); return; }
    setImporting(true);
    try {
      const res = await api.post('/finance/old-fees/bulk', { fees: valid });
      const { created, skipped, errors } = res.data.data;
      toast.success(`Imported ${created} records (${skipped} skipped)`);
      if (errors.length) toast.warning(`Errors: ${errors.slice(0, 3).join('; ')}`);
      setPreview([]);
      fetchOldFees();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Import Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="w-5 h-5 text-orange-500" />
              Bulk Old Fee / Arrears Import
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-xl p-5 bg-slate-50 dark:bg-slate-900/30 text-center">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <p className="text-sm text-muted-foreground mb-3">Upload Excel (.xlsx) or CSV with columns:<br />
              <strong>enrollmentNo, studentName, amount, description, dueDate, remarks</strong>
            </p>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                <Upload className="w-4 h-4" /> Choose File
              </span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Preview ({preview.filter(r => r._valid).length} valid / {preview.filter(r => !r._valid).length} invalid)</h4>
                <Button size="sm" onClick={handleImport} disabled={importing || preview.filter(r => r._valid).length === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> {importing ? 'Importing...' : `Import ${preview.filter(r => r._valid).length} Records`}
                </Button>
              </div>
              {previewErrors.length > 0 && (
                <div className="mb-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 text-xs text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  {previewErrors.slice(0, 5).join(' | ')}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {['#', 'Enrollment No', 'Amount', 'Description', 'Due Date', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={`border-t ${!row._valid ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{row.enrollmentNo}</td>
                        <td className="px-3 py-2 font-bold text-orange-600">₹{(row.amount || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 truncate max-w-[180px]">{row.description}</td>
                        <td className="px-3 py-2">{row.dueDate}</td>
                        <td className="px-3 py-2">
                          {row._valid
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            : <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Old Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Existing Arrears ({oldFees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : oldFees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No arrears on record</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {oldFees.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div>
                    <div className="font-semibold text-sm">{f.student?.name} <span className="text-xs text-muted-foreground">({f.student?.enrollmentNo})</span></div>
                    <div className="text-xs text-muted-foreground">{f.title} • Due: {new Date(f.dueDate).toLocaleDateString('en-IN')}</div>
                    {f.student?.program?.name && <div className="text-xs text-muted-foreground">{f.student.program.name}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-600">₹{f.amount.toLocaleString()}</div>
                    <Badge className={f.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>{f.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
