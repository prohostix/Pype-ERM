import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Database, LogIn, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../lib/api';

const DsmsMigrationPanel: React.FC = () => {
  const [dsmsUrl, setDsmsUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<{
    programsMigrated: number;
    studentsMigrated: number;
    paymentsMigrated: number;
    leadsMigrated: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMigrating(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.post('/organizations/migrate-dsms', {
        dsmsUrl,
        username,
        password
      });

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError(response.data.message || 'Migration failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred during migration.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">DSMS Data Migration</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Connect to Legacy DSMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMigration} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dsmsUrl">DSMS Base URL</Label>
                <Input
                  id="dsmsUrl"
                  placeholder="https://www.dsms-tims.in"
                  value={dsmsUrl}
                  onChange={(e) => setDsmsUrl(e.target.value)}
                  required
                  disabled={isMigrating}
                />
                <p className="text-xs text-gray-500">Do not include /backend/web/index.php</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isMigrating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isMigrating}
                />
              </div>
            </div>

            <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
              <AlertTitle className="font-semibold">Warning: Resource Intensive Operation</AlertTitle>
              <AlertDescription>
                This operation will log into your DSMS instance and automatically scrape all programs and student data. 
                This may take a few minutes depending on the size of your organization. Please do not close this window while migrating.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button type="submit" disabled={isMigrating} className="gap-2">
                {isMigrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Migrating Data...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Start Automated Migration
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertTitle>Migration Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Migration Completed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-green-100">
                <h4 className="text-3xl font-bold text-green-600">{result.programsMigrated || 0}</h4>
                <p className="text-sm text-gray-600">Programs Imported</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-green-100">
                <h4 className="text-3xl font-bold text-green-600">{result.studentsMigrated || 0}</h4>
                <p className="text-sm text-gray-600">Students Imported</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-green-100">
                <h4 className="text-3xl font-bold text-green-600">{result.paymentsMigrated || 0}</h4>
                <p className="text-sm text-gray-600">Payments Auto-Logged</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-green-100">
                <h4 className="text-3xl font-bold text-green-600">{result.leadsMigrated || 0}</h4>
                <p className="text-sm text-gray-600">Enquiries Imported</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-yellow-700 mb-2">Warnings / Skipped Items:</h4>
                <div className="max-h-40 overflow-y-auto bg-white p-3 rounded border text-sm text-gray-700 font-mono">
                  {result.errors.map((e: string, i: number) => (
                    <div key={i} className="mb-1">{e}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DsmsMigrationPanel;
