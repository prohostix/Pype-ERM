import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';

export function BulkWhatsAppPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recipientCount] = useState(0);

  const handleSend = async () => {
    if (!message) {
      toast.error('Please enter a message');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/communications/whatsapp', { message, recipientCount });
      toast.success('Bulk WhatsApp campaign started successfully!');
      setMessage('');
    } catch (e) {
      toast.error('Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 wizard-form">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">WhatsApp Campaign</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Draft rich messages to send via WhatsApp API</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Compose */}
        <div className="lg:col-span-3 rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold tracking-tight">Compose Message</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Use *bold*, _italic_ and ~strikethrough~ to format</p>
          </div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Message Content</Label>
              <Textarea
                placeholder="Type your message here... (*bold*, _italic_, ~strikethrough~)"
                className="min-h-[200px] resize-none rounded-2xl bg-white border border-[#cbd5c8] p-4 text-sm focus:border-[#54b947]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{message.length} characters</p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-[#cfe9c9] bg-[#f4f6f3] p-4">
              <Label className="flex items-center justify-center gap-2 text-sm font-semibold text-[#256c1d] cursor-pointer">
                Attach Media (Optional)
              </Label>
              <Input type="file" className="hidden" />
            </div>

            <Button onClick={handleSend} disabled={loading || !message} className="w-full h-12 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              {loading ? 'Sending...' : 'Send WhatsApp Campaign'}
            </Button>
          </div>
        </div>

        {/* Recipients */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold tracking-tight">Recipients</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Select target audience</p>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <div className="rounded-2xl bg-[#f4f6f3] p-5 text-center">
              <p className="text-sm font-semibold text-slate-900">Select Filters</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Use the filter panel to select programs, branches, or specific student statuses to build your recipient list.</p>
            </div>
            <div className="rounded-2xl bg-[#eaf6e6] p-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#256c1d]">Selected</span>
              <span className="text-3xl font-semibold tracking-tight text-slate-900">{recipientCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
