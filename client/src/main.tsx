import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/hooks/useAuth'
import { CurrencyBoundary } from '@/components/CurrencyBoundary'
import { DeleteApprovalProvider } from '@/contexts/DeleteApprovalContext'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <DeleteApprovalProvider>
      <CurrencyBoundary>
        <App />
      </CurrencyBoundary>
      <Toaster position="top-right" richColors />
    </DeleteApprovalProvider>
  </AuthProvider>,
)
