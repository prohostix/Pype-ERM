import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function BulkSmsPanel() {
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
      await api.post('/communications/sms', { message, recipientCount });
      toast.success('Bulk SMS campaign started successfully!');
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Compose SMS</CardTitle>
              <CardDescription>Draft your message to be sent via SMS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Message Content</Label>
            <Textarea 
              placeholder="Type your message here... (Max 160 characters per SMS segment)"
              className="min-h-[150px] resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={640}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{message.length} characters</span>
              <span>~{Math.ceil(message.length / 160) || 1} SMS credits per recipient</span>
            </div>
          </div>
          
          <Button onClick={handleSend} disabled={loading || !message} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Sending...' : 'Send SMS Campaign'}
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
              
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md w-full flex justify-between items-center">
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
