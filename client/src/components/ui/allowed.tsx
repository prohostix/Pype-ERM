import type { ReactNode } from 'react';

/** Shows its content only when the signed-in user may use it (see `mayOn` in lib/access). */
export function Allowed({ when, children }: { when: boolean; children: ReactNode }) {
  return when ? <>{children}</> : null;
}
