import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Database, LogIn, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

const DsmsMigrationPanel: React.FC = () => {
  const { user } = useAuth();
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
  const [progress, setProgress] = useState<{
    status: string;
    programsMigrated: number;
    studentsMigrated: number;
    paymentsMigrated: number;
    leadsMigrated: number;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.organizationId) return;
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const socket = io(rawUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-org', user.organizationId);
    });

    socket.on('dsms_migration_progress', (data: any) => {
      setProgress(data);
    });

    socket.on('dsms_migration_completed', (data: any) => {
      setResult(data);
      setIsMigrating(false);
      setProgress(null);
    });

    socket.on('dsms_migration_error', (data: any) => {
      setError(data.message || 'An error occurred during background migration.');
      setIsMigrating(false);
      setProgress(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMigrating(true);
    setResult(null);
    setError(null);
    setProgress(null);

    try {
      const response = await api.post('/organizations/migrate-dsms', {
        dsmsUrl,
        username,
        password
      });

      if (response.data.success) {
        // If it's a 202 Accepted, do NOT set isMigrating to false yet.
        // Wait for the socket event to trigger completion.
        if (response.status !== 202) {
           setResult(response.data.data);
           setIsMigrating(false);
        } else {
           // We just wait, the progress bar is showing
        }
      } else {
        setError(response.data.message || 'Migration failed.');
        setIsMigrating(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred during migration.');
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
            
            {isMigrating && progress && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4 transition-all duration-300">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  {progress.status}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="bg-white p-2 rounded text-center shadow-sm border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{progress.programsMigrated}</div>
                    <div className="text-xs text-gray-500 font-medium">Programs</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center shadow-sm border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{progress.studentsMigrated}</div>
                    <div className="text-xs text-gray-500 font-medium">Students</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center shadow-sm border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{progress.paymentsMigrated}</div>
                    <div className="text-xs text-gray-500 font-medium">Payments</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center shadow-sm border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{progress.leadsMigrated}</div>
                    <div className="text-xs text-gray-500 font-medium">Enquiries</div>
                  </div>
                </div>
              </div>
            )}
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
