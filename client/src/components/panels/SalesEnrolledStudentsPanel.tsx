import { useState, useEffect } from 'react';
import {
  GraduationCap, Search, RefreshCw, Eye, Upload, FileText,
  Calendar, Phone, Mail, MapPin, User, FileUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Document {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface Student {
  id: string;
  enrollmentNo: string;
  name: string;
  email: string;
  phone: string;
  altPhone?: string;
  fatherName?: string;
  dob?: string;
  address: string;
  pinCode?: string;
  status: string;
  createdAt: string;
  program?: { name: string; code: string };
  center?: { name: string; code: string };
  documents?: Document[];
  photo?: string;
}

export function SalesEnrolledStudentsPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      // Filter or show all students associated with the organization
      setStudents(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenProfile = (student: Student) => {
    setSelectedStudent(student);
    setDocName('');
    setSelectedFile(null);
    setProfileOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docName) {
        // Default document name to filename without extension
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setDocName(nameWithoutExt);
      }
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!docName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', docName);

      const res = await api.post(`/students/${selectedStudent.id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Document uploaded successfully!');
      
      // Update local state for selected student
      const updatedStudent = res.data.data;
      setSelectedStudent(updatedStudent);
      
      // Update in main list
      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      
      // Reset upload inputs
      setDocName('');
      setSelectedFile(null);
      // Reset file input element
      const fileInput = document.getElementById('student-doc-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const filtered = students.filter(s => {
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.enrollmentNo.toLowerCase().includes(term) ||
      (s.program?.name || '').toLowerCase().includes(term) ||
      (s.center?.name || '').toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedStudents = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Enrolled Students</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View active student profiles and manage their academic documents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
          <RefreshCw className={loading ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2'} />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name, email, enrollment number, program or center..."
          className="pl-9 bg-card"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Student List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No students found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paginatedStudents.map(student => (
            <Card
              key={student.id}
              className="hover:border-primary/40 cursor-pointer transition-all duration-250 hover:shadow-md"
              onClick={() => handleOpenProfile(student)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden border border-slate-200">
                    {student.photo ? (
                      <img 
                        src={api.getFileUrl(student.photo)}
                        alt={student.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{student.name}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase bg-green-50 text-green-700 border-green-200">
                        {student.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {student.enrollmentNo}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{student.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{student.phone}</span>
                      {student.program && <span>📚 {student.program.name}</span>}
                    </div>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-foreground hover:bg-primary gap-1">
                  <Eye className="w-4 h-4" /> View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 pb-2 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} students
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student Profile & Documents Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0 overflow-hidden border border-slate-200">
                    {selectedStudent.photo ? (
                      <img 
                        src={api.getFileUrl(selectedStudent.photo)}
                        alt={selectedStudent.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStudent.name}</DialogTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedStudent.enrollmentNo}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Father's Name</p>
                        <p className="text-sm font-medium">{selectedStudent.fatherName || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Date of Birth</p>
                        <p className="text-sm font-medium">
                          {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{selectedStudent.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Phone Number</p>
                        <p className="text-sm font-medium">{selectedStudent.phone}</p>
                      </div>
                    </div>

                    {selectedStudent.altPhone && (
                      <div className="flex items-start gap-2.5">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Alternative Phone</p>
                          <p className="text-sm font-medium">{selectedStudent.altPhone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Address &amp; Pin Code</p>
                        <p className="text-sm font-medium">
                          {selectedStudent.address}
                          {selectedStudent.pinCode && ` - ${selectedStudent.pinCode}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Academic Program</p>
                    <p className="font-semibold text-sm">{selectedStudent.program?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Code: {selectedStudent.program?.code || 'N/A'}</p>
                  </div>
                  <div className="border rounded-xl p-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Assigned Study Center</p>
                    <p className="font-semibold text-sm">{selectedStudent.center?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Code: {selectedStudent.center?.code || 'N/A'}</p>
                  </div>
                </div>

                {/* Document Management Section */}
                <div className="space-y-4">
                  <h3 className="font-bold text-base border-b pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Student Documents
                  </h3>

                  {/* Upload Form */}
                  <form onSubmit={handleUploadDocument} className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900/30 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><FileUp className="w-4 h-4" /> Upload New Document</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="doc-name">Document Label</Label>
                        <Input
                          id="doc-name"
                          value={docName}
                          onChange={e => setDocName(e.target.value)}
                          placeholder="e.g. 10th Marksheet, Aadhaar"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="student-doc-file">Select File</Label>
                        <Input
                          id="student-doc-file"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={handleFileChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={uploading || !selectedFile} size="sm">
                        {uploading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" /> Upload Document
                          </>
                        )}
                      </Button>
                    </div>
                  </form>

                  {/* Documents List */}
                  <div className="space-y-2">
                    {!selectedStudent.documents || selectedStudent.documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-muted/10 rounded-xl border border-dashed">
                        No documents uploaded yet.
                      </p>
                    ) : (
                      selectedStudent.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{doc.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Uploaded on {new Date(doc.uploadedAt).toLocaleString()}
                                {doc.uploadedBy && ` by ${doc.uploadedBy}`}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={doc.url.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:6478/api/v1'}${doc.url}` : doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium flex items-center gap-1"
                            >
                              View File
                            </a>
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setProfileOpen(false)}>Close Profile</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
