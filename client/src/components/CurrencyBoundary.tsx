import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { setCurrency, setCurrencyOptions } from '@/lib/currency';

// Loads the organisation's currency once after login, before the app draws any amounts.
export function CurrencyBoundary({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setCurrency('INR'); setLoadedFor(null); return; }
    let cancelled = false;
    api.get('/organizations/currency')
      .then((res) => {
        const d = res.data?.data;
        if (d?.options) setCurrencyOptions(d.options);
        setCurrency(d?.code || 'INR');
      })
      .catch(() => setCurrency('INR'))
      .finally(() => { if (!cancelled) setLoadedFor(userId); });
    return () => { cancelled = true; };
  }, [userId]);

  if (userId && loadedFor !== userId) return null;
  return <>{children}</>;
}
