import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/hooks/useAuth'
import { DeleteApprovalProvider } from '@/contexts/DeleteApprovalContext'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <DeleteApprovalProvider>
      <App />
      <Toaster position="top-right" richColors />
    </DeleteApprovalProvider>
  </AuthProvider>,
)
