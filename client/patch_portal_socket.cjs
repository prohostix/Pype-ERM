const fs = require('fs');
const path = './src/pages/ModernFacultyPortal.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('socket.io-client')) {
  // Add imports
  code = code.replace(
    "import { toast } from 'sonner';",
    "import { toast } from 'sonner';\nimport { useAuth } from '@/contexts/AuthContext';\nimport { io, Socket } from 'socket.io-client';\nimport { useRef } from 'react';"
  );
  
  // Add socket initialization
  const hookCode = `  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const rawUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    const socket = io(rawUrl && rawUrl !== '' ? rawUrl : window.location.origin, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      socket.emit('join-user', user.id);
    });
    
    socket.on('session-started', (sessionData: any) => {
      toast.success('Your Principal just started a Live Class for you!', { duration: 5000 });
      // If we are on the live tab, we might want to refresh, but the child handles its own fetch.
      // So we can just show a badge or notify.
    });
    
    socket.on('session-ended', (sessionId: string) => {
      toast.info('A Live Class was ended.', { duration: 3000 });
    });
    
    return () => {
      socket.disconnect();
    };
  }, [user]);`;

  code = code.replace(
    "const [metrics, setMetrics] = useState({",
    hookCode + "\n\n  const [metrics, setMetrics] = useState({"
  );
  
  fs.writeFileSync(path, code);
  console.log('Patched ModernFacultyPortal with WebSockets');
}
