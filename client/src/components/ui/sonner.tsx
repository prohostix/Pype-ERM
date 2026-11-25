import { CircleCheck, Info, Loader2, OctagonAlert, TriangleAlert, X } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import './toast.css';

/** The app's toast alerts. Call `toast.success(...)`, `toast.error(...)` etc. from 'sonner'. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="app-toaster"
      position="top-right"
      closeButton
      gap={12}
      duration={4500}
      icons={{
        success: <CircleCheck />,
        error: <OctagonAlert />,
        warning: <TriangleAlert />,
        info: <Info />,
        loading: <Loader2 className="animate-spin" />,
        close: <X />,
      }}
      {...props}
    />
  );
}
