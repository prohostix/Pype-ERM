import { Hourglass } from 'lucide-react';

interface ComingSoonPanelProps {
  title: string;
  description: string;
  /** One line shown inside the card explaining what to expect. */
  note?: string;
}

/** Standard page for modules that are planned but not released yet. */
export function ComingSoonPanel({ title, description, note }: ComingSoonPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm mt-1.5">{description}</p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 px-6 py-20 sm:py-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto">
          <Hourglass className="w-7 h-7" />
        </div>
        <span className="inline-flex mt-5 rounded-full bg-[#dff3da] text-[#256c1d] text-xs font-semibold px-3.5 py-1.5">Coming soon</span>
        <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{title} is on the way</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {note || "This module isn't available yet. We'll let you know here as soon as it's ready."}
        </p>
      </div>
    </div>
  );
}
