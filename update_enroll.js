const fs = require('fs');
const path = 'client/src/components/panels/EnrollStudentPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add states
content = content.replace(
  "const [studentMode, setStudentMode] = useState<'new' | 'existing'>('new');",
  `const [studentMode, setStudentMode] = useState<'new' | 'existing' | 'provisional'>('new');
  const [provisionalEnrollments, setProvisionalEnrollments] = useState<any[]>([]);
  const [selectedProvisionalId, setSelectedProvisionalId] = useState<string>('');`
);

// 2. Update fetchData
content = content.replace(
  "const [progsRes, walletRes, studentsRes] = await Promise.all([",
  `const [progsRes, walletRes, studentsRes, provRes] = await Promise.all([`
);
content = content.replace(
  "api.get('/students').catch(() => ({ data: { data: [] } })),",
  `api.get('/students').catch(() => ({ data: { data: [] } })),
        api.get('/enrollment/provisional').catch(() => ({ data: { data: [] } })),`
);
content = content.replace(
  "setStudents(studentsRes.data.data || []);",
  `setStudents(studentsRes.data.data || []);
      setProvisionalEnrollments(provRes.data.data?.filter((e: any) => e.status === 'provisional_finance_verified') || []);`
);

// 3. Update getFeeOptions inside EnrollStudentPanel to handle provisional
// There's a check for `studentMode === 'existing' && selectedStudentId` which is fine to ignore for provisional since provisional students aren't existing fully yet.

// 4. Update handleEnroll
content = content.replace(
  /await api\.post\('\/enrollment\/enroll', \{\s*\.\.\.form,\s*studentId: studentMode === 'existing' \? selectedStudentId : undefined,\s*programId: selectedProgram\.id,\s*feeMode: selectedFeeModeId\s*\}\);/g,
  `if (studentMode === 'provisional' && selectedProvisionalId) {
        await api.put(\`/enrollment/\${selectedProvisionalId}/provisional-complete\`, {
          ...form,
          programId: selectedProgram.id,
          feeMode: selectedFeeModeId 
        });
      } else {
        await api.post('/enrollment/enroll', { 
          ...form, 
          studentId: studentMode === 'existing' ? selectedStudentId : undefined,
          programId: selectedProgram.id,
          feeMode: selectedFeeModeId 
        });
      }`
);
content = content.replace(
  "setSelectedStudentId('');",
  `setSelectedStudentId('');
      setSelectedProvisionalId('');`
);

// 5. Add radio button
content = content.replace(
  `<span className="text-sm font-medium">Existing Student</span>
              </label>`,
  `<span className="text-sm font-medium">Existing Student</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={studentMode === 'provisional'} onChange={() => {
                  setStudentMode('provisional');
                  setSelectedProvisionalId('');
                  setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '', specialisation: '' });
                }} />
                <span className="text-sm font-medium">From Provisional</span>
              </label>`
);

// 6. Add Dropdown for provisional
content = content.replace(
  /\{studentMode === 'existing' && \([\s\S]*?<\/div>\s*\)\}/g,
  (match) => {
    return match + `\n
            {studentMode === 'provisional' && (
              <div className="space-y-1 pb-2 border-b">
                <Label>Select Verified Provisional Enrollment</Label>
                <select 
                  className="w-full border rounded-md p-2 bg-background text-sm"
                  value={selectedProvisionalId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProvisionalId(id);
                    const p = provisionalEnrollments.find(pe => pe.id === id);
                    if (p) {
                      setForm({
                        studentName: p.studentName || '',
                        studentEmail: p.studentEmail || '',
                        studentPhone: p.studentPhone || '',
                        studentAddress: p.studentAddress === 'To be filled' ? '' : p.studentAddress || '',
                        specialisation: p.specialisation || '',
                      });
                      if (p.programId) {
                         const prog = programs.find(pr => pr.id === p.programId);
                         if (prog) {
                           setSelectedProgram(prog);
                         }
                      }
                    } else {
                      setForm({ studentName: '', studentEmail: '', studentPhone: '', studentAddress: '', specialisation: '' });
                      setSelectedProgram(null);
                    }
                  }}
                >
                  <option value="">-- Choose Provisional Enrollment --</option>
                  {provisionalEnrollments.map(p => (
                    <option key={p.id} value={p.id}>{p.studentName} ({p.studentEmail})</option>
                  ))}
                </select>
              </div>
            )}`;
  }
);

// 7. Fix handleEnroll validation disable condition
content = content.replace(
  `disabled={!selectedProgram || !selectedFeeModeId || submitting || (balance < currentRequiredFee)}`,
  `disabled={!selectedProgram || !selectedFeeModeId || submitting || (balance < currentRequiredFee) || (studentMode === 'provisional' && !selectedProvisionalId)}`
);

fs.writeFileSync(path, content);
console.log('Done');
