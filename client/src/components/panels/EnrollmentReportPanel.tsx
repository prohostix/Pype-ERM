
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileBarChart, Filter } from 'lucide-react';

export function EnrollmentReportPanel() {
  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Enrollment Report</CardTitle>
            <CardDescription>Track university enrollment status and metrics</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
          <FileBarChart className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Select university and batch to generate report</p>
        </div>
      </CardContent>
    </Card>
  );
}
