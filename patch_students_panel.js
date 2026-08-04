const fs = require('fs');
const path = './client/src/components/panels/StudentsPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(
  "import { Plus, Edit, Trash2, Mail, Phone, GraduationCap, Upload, Bell, CalendarDays, ExternalLink, MessageSquare, Key, Download, User, BookOpen, Building2, FileText, ChevronRight, Search, DollarSign, Eye } from 'lucide-react';",
  "import { Plus, Edit, Trash2, Mail, Phone, GraduationCap, Upload, Bell, CalendarDays, ExternalLink, MessageSquare, Key, Download, User, BookOpen, Building2, FileText, ChevronRight, Search, DollarSign, Eye, TrendingUp } from 'lucide-react';\nimport { StudentProgressTab } from '@/components/panels/StudentProgressTab';"
);

// 2. State
content = content.replace(
  "const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);",
  "const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);\n  const [progressDialogOpen, setProgressDialogOpen] = useState(false);\n  const [progressDialogStudent, setProgressDialogStudent] = useState<any>(null);"
);

// 3. handleOpenProgress handler
content = content.replace(
  "const handleOpenPaymentDialog = async (student: any) => {",
  "const handleOpenProgress = (student: any) => {\n    setProgressDialogStudent(student);\n    setProgressDialogOpen(true);\n  };\n\n  const handleOpenPaymentDialog = async (student: any) => {"
);

// 4. Button replacement
content = content.replace(
  `{/* Log Payment */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenPaymentDialog(student)} title="Log Payment">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </Button>`,
  `{/* Update Progress */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenProgress(student)} title="Update Progress">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </Button>`
);

// 5. Dialog
const dialogStr = `
      {/* Progress Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Progress - {progressDialogStudent?.name}</DialogTitle>
          </DialogHeader>
          {progressDialogStudent && (
            <StudentProgressTab 
              student={progressDialogStudent} 
              onUpdate={() => {
                fetchStudents();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
`;

content = content.replace(
  `{/* Quick Log Payment Dialog */}`,
  dialogStr + `\n      {/* Quick Log Payment Dialog */}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched');
