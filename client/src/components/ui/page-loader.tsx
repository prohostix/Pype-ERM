import { cn } from '@/lib/utils';

interface PageLoaderProps {
  label?: string;
  /** Fill the whole screen (used while the app signs you in). Otherwise it fills the space it is placed in. */
  fullScreen?: boolean;
  className?: string;
}

/** The standard "round loader with text": a thin green ring that spins, with a soft label under it. */
export function PageLoader({ label = 'Loading', fullScreen = false, className }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center bg-white',
        fullScreen ? 'min-h-screen' : 'h-64 bg-transparent',
        className,
      )}
      style={{ fontFamily: 'Urbanist, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-[5px] border-[#eaf6e6]" />
          <div className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-[#54b947] animate-spin" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-500 animate-pulse">{label}</p>
      </div>
    </div>
  );
}
