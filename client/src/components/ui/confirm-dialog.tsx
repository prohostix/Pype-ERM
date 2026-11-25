import { useEffect, useRef, useState } from 'react';
import { HelpCircle, TriangleAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { registerConfirmHost, type DialogRequest } from '@/lib/confirm';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** The single popup behind `confirmDialog()` and `promptDialog()`. Mount it once. */
export function ConfirmDialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const pending = useRef<DialogRequest | null>(null);
  const textBox = useRef<HTMLTextAreaElement>(null);

  const answer = (confirmed: boolean) => {
    pending.current?.resolve(confirmed ? text.trim() : null);
    pending.current = null;
    setOpen(false);
  };

  useEffect(() => {
    registerConfirmHost((next) => {
      pending.current?.resolve(null); // a newer question replaces an unanswered one
      pending.current = next;
      setRequest(next);
      setText('');
      setOpen(true);
    });
    return () => registerConfirmHost(null);
  }, []);

  const danger = request?.tone === 'danger';
  const Icon = danger ? TriangleAlert : HelpCircle;
  const input = request?.input;
  const missingText = Boolean(input?.required) && !text.trim();

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) answer(false); }}>
      {/* The content stays rendered with the last question while it animates closed */}
      <AlertDialogContent
        // A popup with a text box starts in it; otherwise Cancel is focused
        onOpenAutoFocus={(e) => { if (textBox.current) { e.preventDefault(); textBox.current.focus(); } }}
        className="z-[100] sm:max-w-[420px] rounded-[2rem] border-0 bg-white dark:bg-[#12241a] p-6 sm:p-8 gap-6"
        style={{ fontFamily: 'Urbanist, ui-sans-serif, system-ui, sans-serif' }}
      >
        <AlertDialogHeader className="items-center sm:items-center text-center sm:text-center gap-3">
          <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', danger ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15' : 'bg-[#eaf6e6] text-[#256c1d] dark:bg-[#54b947]/20 dark:text-[#8ae47e]')}>
            <Icon className="h-6 w-6" />
          </span>
          <AlertDialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{request?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-line break-words">{request?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        {input && (
          <div className="space-y-2">
            <Label htmlFor="dialog-text" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {input.label} {input.required ? <span className="text-rose-500">*</span> : <span className="font-normal text-slate-400">(optional)</span>}
            </Label>
            <Textarea
              id="dialog-text"
              ref={textBox}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={input.placeholder}
              required={input.required}
              className="rounded-2xl bg-[#f4f6f3] dark:bg-white/5 border-transparent focus-visible:border-[#54b947] focus-visible:ring-4 focus-visible:ring-[#54b947]/20 text-sm px-4 py-3 resize-none"
            />
          </div>
        )}
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:justify-stretch">
          <AlertDialogCancel className="mt-0 h-11 flex-1 rounded-full border-slate-200 font-semibold">
            {request?.cancelText || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => answer(true)}
            disabled={missingText}
            className={cn('h-11 flex-1 rounded-full font-semibold shadow-none', danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-[#8ae47e] text-[#0b1d14] hover:bg-[#7bd96f]')}
          >
            {request?.confirmText || 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
