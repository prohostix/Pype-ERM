import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface PlaceholderPanelProps {
  title: string;
  description?: string;
}

export function PlaceholderPanel({ title, description = 'This feature is currently under development.' }: PlaceholderPanelProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card className="border-none shadow-lg bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md">
            We are working hard to bring you this feature. Check back later for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
