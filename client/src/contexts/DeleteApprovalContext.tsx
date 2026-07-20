import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type DeleteOptions = {
  url: string;
  config?: any;
  resolve: (val: any) => void;
  reject: (err: any) => void;
  apiInstance: any;
};

export const DeleteApprovalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingRequest, setPendingRequest] = useState<DeleteOptions | null>(null);

  useEffect(() => {
    const handleRequest = (e: Event) => {
      const customEvent = e as CustomEvent<DeleteOptions>;
      setPendingRequest(customEvent.detail);
      setReason('');
      setIsOpen(true);
    };

    window.addEventListener('requestDeleteApproval', handleRequest);
    return () => window.removeEventListener('requestDeleteApproval', handleRequest);
  }, []);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Deletion reason is mandatory.');
      return;
    }

    if (!pendingRequest) return;

    try {
      const { url, config, apiInstance } = pendingRequest;
      const reqConfig = config || {};
      reqConfig.headers = { ...reqConfig.headers, 'x-delete-reason': reason };
      
      const response = await apiInstance.delete(url, reqConfig);
      
      if (response.status === 202) {
        toast.success(response.data?.message || 'Delete request submitted for approval.');
        const silentError = new Error('DELETE_REQUESTED_NOT_COMPLETED');
        (silentError as any).isDeleteRequest = true;
        pendingRequest.reject(silentError);
      } else {
        pendingRequest.resolve(response);
      }
    } catch (error) {
      pendingRequest.reject(error);
    } finally {
      setIsOpen(false);
      setPendingRequest(null);
    }
  };

  const handleCancel = () => {
    if (pendingRequest) {
      pendingRequest.reject(new Error('Delete request cancelled.'));
    }
    setIsOpen(false);
    setPendingRequest(null);
  };

  return (
    <>
      {children}
      <Dialog open={isOpen} onOpenChange={handleCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              This deletion requires approval from a Department Manager and the CEO. 
              Please provide a mandatory explanation for why this record should be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for deletion..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim()}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
