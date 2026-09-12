const fs = require('fs');
const path = './src/pages/ModernFacultyPortal.tsx';

let code = fs.readFileSync(path, 'utf8');

// Add imports
code = code.replace(
  "import { FacultyAssignmentsPanel } from '@/components/panels/FacultyAssignmentsPanel';",
  "import { FacultyAssignmentsPanel } from '@/components/panels/FacultyAssignmentsPanel';\nimport { ActiveSessionsPanel } from '@/components/panels/ActiveSessionsPanel';\nimport { AttendanceManager } from '@/components/panels/AttendanceManager';"
);

// Add state
code = code.replace(
  '  const [activeTab, setActiveTab] = useState(initialTab || \'overview\');',
  `  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);`
);

// Add Tab
code = code.replace(
  "{ id: 'classes', label: 'My Classes', icon: BookOpen },",
  "{ id: 'live', label: 'Live Classes', icon: PlayCircle },\n    { id: 'classes', label: 'My Classes', icon: BookOpen },"
);
code = code.replace('Video,', 'Video, PlayCircle,');

// Add Panel rendering
const activeSessionsRender = `
            {activeTab === 'live' && !activeSessionId && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <ActiveSessionsPanel onEnterClass={(id, data) => {
                  setActiveSessionId(id);
                  setActiveSessionData(data);
                }} />
              </div>
            )}
            
            {activeTab === 'live' && activeSessionId && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <AttendanceManager 
                  sessionId={activeSessionId} 
                  sessionData={activeSessionData} 
                  onBack={() => {
                    setActiveSessionId(null);
                    setActiveSessionData(null);
                  }} 
                />
              </div>
            )}
`;

code = code.replace(
  "{activeTab === 'overview' && (",
  activeSessionsRender + "\n            {activeTab === 'overview' && ("
);

// clear active session state if tab changes
code = code.replace(
  'const handleTabChange = (tabId: string) => {',
  `const handleTabChange = (tabId: string) => {
    setActiveSessionId(null);
    setActiveSessionData(null);`
);

fs.writeFileSync(path, code);
console.log("Patched ModernFacultyPortal");
