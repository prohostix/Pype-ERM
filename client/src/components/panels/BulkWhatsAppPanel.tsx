import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send, Users, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

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
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Bulk WhatsApp campaign started successfully!');
      setMessage('');
    } catch (e) {
      toast.error('Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle>WhatsApp Campaign</CardTitle>
              <CardDescription>Draft rich messages to send via WhatsApp API</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Message Content</Label>
            <Textarea 
              placeholder="Type your message here... (*bold*, _italic_, ~strikethrough~)"
              className="min-h-[150px] resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          
          <div className="space-y-2 border p-3 rounded-md border-dashed">
            <Label className="flex items-center gap-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <ImageIcon className="w-4 h-4" />
              Attach Media (Optional)
            </Label>
            <Input type="file" className="hidden" />
          </div>
          
          <Button onClick={handleSend} disabled={loading || !message} className="w-full bg-green-600 hover:bg-green-700">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Sending...' : 'Send WhatsApp Campaign'}
          </Button>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-none bg-muted/30">
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>Select target audience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-background flex flex-col items-center justify-center min-h-[200px] border-dashed">
              <Users className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Select Filters</p>
              <p className="text-xs text-muted-foreground text-center">Use the filter panel to select programs, branches, or specific student statuses to build your recipient list.</p>
              
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md w-full flex justify-between items-center">
                <span className="font-semibold">Selected:</span>
                <span className="font-bold text-lg">{recipientCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
