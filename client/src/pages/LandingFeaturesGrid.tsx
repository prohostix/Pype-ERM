import { Activity, Award, BarChart3, Bell, Bot, Briefcase, Calendar, Check, CheckSquare, Clock, FileText, FolderKanban, GraduationCap, Headphones, Inbox, Layers, LayoutDashboard, Lock, PenTool, PieChart, Play, Search, Sliders, Sparkles, Tag, Target, TrendingUp, Users, Zap } from 'lucide-react';

/** Full-width feature wall: a ruled grid of module tiles with four focal cards, faded at the edges. */
export function LandingFeaturesGrid() {
  return (
    <section aria-label="All modules" className="relative z-10 pb-10 sm:pb-16 overflow-hidden w-full">
        {/* Full-width container with true CSS gradient mask fade on left and right */}
        <div className="w-full overflow-x-auto pb-6 pt-2">
          <div 
            className="w-full flex justify-center px-4"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
            }}
          >
            <div className="relative overflow-hidden min-w-[1240px] w-full max-w-[1360px] border-t border-l border-emerald-950/15 grid grid-cols-10 bg-white/70 backdrop-blur-sm">

              {/* ROW 1 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Layers className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Course Batches</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-50 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Search className="w-6 h-6 text-slate-600 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Unified Search</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Check className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={2} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Admin Tasks</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Activity className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Branch Pipeline</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FileText className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Curriculum</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bot className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">WhatsApp Bot</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Calendar className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Calendar</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Sliders className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Doc Verify</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FolderKanban className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-all">Portfolios</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Briefcase className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Fee Templates</span>
              </div>

              {/* ROW 2 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bell className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Dues Alerts</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <PieChart className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Collections MIS</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Target className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Intake Goals</span>
              </div>

              {/* CENTER CARD 1: Student Admissions (Spans 2 cols, 2 rows) - Styled like Projects with Green Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-emerald-50/40 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-emerald-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Micro UI Preview */}
                  <div className="w-full max-w-[190px] bg-white rounded-xl shadow-md border border-emerald-100 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">Needs Review 5</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">Enrolled 3</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex -space-x-1.5">
                        <div className="w-4 h-4 rounded-full bg-[#54b947] text-[8px] text-white flex items-center justify-center font-bold">AS</div>
                        <div className="w-4 h-4 rounded-full bg-emerald-700 text-[8px] text-white flex items-center justify-center font-bold">RV</div>
                      </div>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-3/4 h-full bg-[#54b947]"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-md bg-[#54b947] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">Admissions</span>
                </div>
              </div>

              {/* CENTER CARD 2: Provisional & Team Review (Spans 2 cols, 2 rows) - Styled like Docs with Green Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-teal-50/40 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-teal-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Stack Preview */}
                  <div className="w-full max-w-[190px] relative">
                    <div className="absolute -top-1 left-3 right-3 h-14 bg-teal-50/60 rounded-lg border border-teal-100"></div>
                    <div className="relative bg-white rounded-xl shadow-md border border-teal-100 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-800">
                        <span>Provisional SLA Review</span>
                        <span className="text-[8px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">Approved</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-teal-200 rounded-full w-full"></div>
                        <div className="h-1 bg-slate-100 rounded-full w-4/5"></div>
                        <div className="h-1 bg-slate-100 rounded-full w-2/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <Users className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-teal-950 transition-colors">Team Review</span>
                </div>
              </div>

              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Calendar className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Exam Sprints</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Target className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Custom Status</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bot className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">AI Notice Draft</span>
              </div>

              {/* ROW 3 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Zap className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Gateway Webhook</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Award className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Merit Awards</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FileText className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Intake Forms</span>
              </div>
              {/* (Center cards span here) */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Zap className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Automations</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Sliders className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Custom Fields</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Clock className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Timesheets</span>
              </div>

              {/* ROW 4 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Bot className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">AI Counselor</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Target className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Quota Priorities</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Clock className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Fee Timelines</span>
              </div>

              {/* CENTER CARD 3: Fee Collections (Spans 2 cols, 2 rows) - Styled like Brain with Green / Emerald Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-emerald-50/30 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-emerald-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Fee Reconcile Dialog */}
                  <div className="w-full max-w-[190px] bg-white rounded-xl shadow-md border border-emerald-100 p-2.5 space-y-2">
                    <div className="text-[9px] text-slate-400 font-medium">UPI Reconciliation (Instant)</div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50/80 border border-emerald-100 text-[9px] text-[#256c1d]">
                      <Sparkles className="w-2.5 h-2.5 text-[#54b947]" />
                      <span>Term II Settlement: ₹48,500</span>
                    </div>
                    <div className="text-[8px] font-bold text-slate-700 flex items-center justify-between pt-0.5">
                      <span>Webhook HDFC-089</span>
                      <span className="text-[7px] bg-emerald-100 text-[#1a5323] px-1 py-0.2 rounded font-bold">MATCHED ✓</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#256c1d] to-[#54b947] text-white flex items-center justify-center text-xs shadow-xs">
                    ₹
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">Collections</span>
                </div>
              </div>

              {/* CENTER CARD 4: HR & Attendance (Spans 2 cols, 2 rows) - Styled like Chat with Green Theme */}
              <div className="col-span-2 row-span-2 border-r border-b border-emerald-950/10 bg-gradient-to-b from-green-50/40 via-white to-white flex flex-col items-center justify-between p-6 relative overflow-hidden group cursor-pointer hover:bg-green-50/20 hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-xl transition-all z-10">
                <div className="w-full flex justify-center pt-2">
                  {/* Floating Bio-Sync Log */}
                  <div className="w-full max-w-[190px] bg-white rounded-xl shadow-md border border-emerald-100 p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#54b947] text-white text-[8px] flex items-center justify-center font-bold">JD</div>
                      <div className="h-2 w-20 bg-emerald-100 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[8px] flex items-center justify-center font-bold">SK</div>
                      <div className="h-2 w-14 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-1 pt-1 text-[8px] text-slate-500 font-semibold">
                      <span>📍 Main Branch</span>
                      <span className="text-emerald-700">• 98.4% On Time</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-5 h-5 rounded-md bg-[#256c1d] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">Bio-Attendance</span>
                </div>
              </div>

              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Play className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Video Lectures</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <LayoutDashboard className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Branch View</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Lock className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">SSO & 2FA</span>
              </div>

              {/* ROW 5 */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Inbox className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">SMS & Alerts</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <LayoutDashboard className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Executive MIS</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Clock className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Shift Tracking</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FolderKanban className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">Kanban Quotas</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Layers className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Branch Scopes</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-30 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Users className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Parents Portal</span>
              </div>

              {/* ROW 6: Continuous full 10-column row spanning across below the 4 focal cards */}
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-20 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Tag className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Custom Tags</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-40 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Headphones className="w-6 h-6 text-slate-600 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold text-center leading-tight transition-colors">24/7 Support</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <CheckSquare className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Checklists</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Calendar className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Scheduling</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <FileText className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Spreadsheets</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-60 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <PenTool className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Whiteboards</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <BarChart3 className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Gantt Charts</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-55 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <TrendingUp className="w-6 h-6 text-slate-700 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Roadmaps</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-40 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Inbox className="w-6 h-6 text-slate-600 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-colors">Inbox</span>
              </div>
              <div className="h-28 border-r border-b border-emerald-950/10 flex flex-col items-center justify-center p-3 opacity-20 hover:opacity-100 hover:bg-white hover:border-[#54b947] hover:ring-2 hover:ring-[#54b947]/80 hover:shadow-md transition-all cursor-pointer group z-10 relative">
                <Users className="w-6 h-6 text-slate-500 group-hover:text-[#256c1d] mb-2 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors">Teams</span>
              </div>

            </div>
          </div>
        </div>
    </section>
  );
}
