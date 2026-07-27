import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, MonitorSmartphone } from 'lucide-react';

export function StudentPortalManagementPanel() {
  const [loading, setLoading] = useState(false);

  const fetchPortalData = async () => {
    setLoading(true);
    // Mock API call
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Student Portal Management</CardTitle>
            <CardDescription>Manage student portal access, settings, and features</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPortalData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
          <MonitorSmartphone className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Select a student or program to configure portal settings</p>
        </div>
      </CardContent>
    </Card>
  );
}
