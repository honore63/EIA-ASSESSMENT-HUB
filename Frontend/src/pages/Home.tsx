import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import StudentHistory from "@/pages/StudentHistory";
import UserManagement from "@/pages/UserManagement";
import { TeacherDashboard } from "@/pages/TeacherDashboard";

type Assessment = { id: number; title: string; subject: string; gradeLabel: string; status: string; questionCount: number; totalMarks: number; completionRate: number; averageScore: number; durationMinutes: number };
type Assignment = { id: number; title: string; classLabel: string; status: string; submissions: number; totalLearners: number };
type Approval = { id: number; fullName: string; subjectsSummary: string; gradesSummary: string };
type Workspace = { school: { name: string; tenantKey: string }; metrics: { published: number; drafts: number; assignments: number; grades: number; subjects: number; classes: number; totalUsers: number; admins: number; teachers: number; students: number }; assessments: Assessment[]; approvals: Approval[]; assignments: Assignment[] };

const previewData: Workspace = {
  school: { name: "Excel International Academy", tenantKey: "excel-ia-primary" },
  metrics: { published: 18, drafts: 6, assignments: 12, grades: 13, subjects: 8, classes: 26, totalUsers: 340, admins: 4, teachers: 32, students: 304 },
  assessments: [
    { id: 1, title: "Algebraic Thinking · Checkpoint 02", subject: "Mathematics", gradeLabel: "Grade 9", status: "published", questionCount: 12, totalMarks: 24, completionRate: 82, averageScore: 76, durationMinutes: 25 },
    { id: 2, title: "Forces & Motion · Exit Ticket", subject: "Integrated Science", gradeLabel: "Grade 8", status: "published", questionCount: 6, totalMarks: 10, completionRate: 64, averageScore: 71, durationMinutes: 12 },
    { id: 3, title: "Digital Citizenship Starter", subject: "Digital Literacy", gradeLabel: "Grade 6", status: "draft", questionCount: 8, totalMarks: 16, completionRate: 0, averageScore: 0, durationMinutes: 18 },
  ],
  approvals: [],
  assignments: [
    { id: 1, title: "Algebraic Thinking · Checkpoint 02", classLabel: "Grade 9 · Horizon", status: "in_progress", submissions: 21, totalLearners: 28 },
    { id: 2, title: "Fractions & Equivalence · Practice", classLabel: "Grade 5 · Cedar", status: "available", submissions: 16, totalLearners: 24 },
  ],
};

const navItems = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Assessments", path: "/assessments", icon: FileText },
  { label: "Question bank", path: "/question-bank", icon: Library },
  { label: "Assignments", path: "/assignments", icon: ClipboardCheck },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];
const utilityItems = [{ label: "Settings", path: "/settings", icon: Settings2 }];
const emptyWorkspace: Workspace = {
  school: { name: "Excel International Academy", tenantKey: "excel-ia-primary" },
  metrics: { published: 0, drafts: 0, assignments: 0, grades: 0, subjects: 0, classes: 0, totalUsers: 0, admins: 0, teachers: 0, students: 0 },
  assessments: [],
  approvals: [],
  assignments: [],
};

function initials(name: string) { return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase(); }
function statusLabel(status: string) { return status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
function StatusBadge({ status }: { status: string }) { const tone = status === "published" || status === "approved" || status === "available" ? "status-positive" : status === "draft" ? "status-neutral" : status === "pending_approval" || status === "in_progress" ? "status-warm" : "status-muted"; return <span className={`status-badge ${tone}`}><span className="status-dot" />{statusLabel(status)}</span>; }
function MetricCard({ label, value, detail, icon: Icon, accent }: { label: string; value: string | number; detail: string; icon: typeof Activity; accent: string }) { return <div className="metric-card"><div className="metric-topline"><span>{label}</span><span className={`metric-icon ${accent}`}><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>; }

function Shell({ children, path, onNavigate, user, previewMode, onLogin, onLogout }: { children: ReactNode; path: string; onNavigate: (path: string) => void; user: { name?: string | null; email?: string | null; role?: string | null } | null; previewMode: boolean; onLogin: () => void; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user?.name || "Preview educator";
  const roleLabel = user?.role === "admin" ? "Admin" : user?.role === "student" ? "Student" : user ? "Teacher" : "Read-only preview";
  const visibleNavItems = user?.role === "student"
    ? [{ label: "Assessment history", path: "/student/history", icon: ClipboardCheck }]
    : user?.role === "admin"
      ? [...navItems, { label: "User management", path: "/users", icon: Users }]
      : navItems;
  const visibleUtilityItems = user?.role === "admin" ? utilityItems : [];
  const renderNav = (items: typeof navItems) => items.map(item => { const active = item.path === "/" ? path === "/" : path.startsWith(item.path); const Icon = item.icon; return <button key={item.path} className={`side-nav-item ${active ? "active" : ""}`} onClick={() => { onNavigate(item.path); setSidebarOpen(false); }}><Icon size={17} /><span>{item.label}</span>{active && <span className="nav-active-mark" />}</button>; });
  return <div className="app-shell"><div className={`mobile-scrim ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} /><aside className={`side-rail ${sidebarOpen ? "open" : ""}`}><div className="brand-lockup"><div className="brand-mark"><span>E</span><span>A</span></div><div><div className="brand-name">EXCEL</div><div className="brand-subtitle">ASSESSMENT HUB</div></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={17} /></button></div><div className="school-switcher"><div className="school-avatar">EA</div><div className="school-copy"><strong>Excel IA</strong><span>2026 / 27 · Current</span></div><ChevronDown size={15} /></div><div className="rail-section-label">Workspace</div><nav className="side-nav">{renderNav(visibleNavItems)}</nav>{visibleUtilityItems.length > 0 && <><div className="rail-section-label rail-section-label-spaced">Manage</div><nav className="side-nav">{renderNav(visibleUtilityItems)}</nav></>}<div className="rail-spacer" />{user?.role !== "student" && <div className="rail-progress"><div className="rail-progress-heading"><span>Term 1 rhythm</span><span>74%</span></div><Progress value={74} /><p>Keep the feedback loop moving.</p></div>}<div className="rail-user"><div className="avatar avatar-small">{initials(displayName)}</div><div className="rail-user-copy"><strong>{displayName}</strong><span>{roleLabel}</span></div><button className="icon-button" onClick={previewMode ? onLogin : onLogout} aria-label={previewMode ? "Sign in" : "Sign out"}>{previewMode ? <ArrowUpRight size={16} /> : <LogOut size={16} />}</button></div></aside><main className="main-canvas"><header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="crumb"><span>Excel IA</span><ChevronRight size={14} /><strong>{path === "/" ? "Overview" : path === "/assessments/new" ? "Assessment Studio" : path.slice(1).replace("-", " ")}</strong></div></div><div className="topbar-actions"><div className="connection-pill"><span className="live-pulse" />{previewMode ? "Preview mode" : "Workspace synced"}</div><button className="icon-button topbar-icon" aria-label="Search"><Search size={17} /></button><button className="icon-button topbar-icon notification-button" aria-label="Notifications"><Bell size={17} /><span className="notification-dot" /></button><div className="topbar-avatar">{initials(displayName)}</div></div></header>{children}</main></div>;
}

function LegacyDashboard({ data, previewMode, onNavigate, onLogin, onApproval, isAdmin }: { data: Workspace; previewMode: boolean; onNavigate: (path: string) => void; onLogin: () => void; onApproval: (id: number, status: "approved" | "rejected") => void; isAdmin: boolean }) {
  return <div className="page-wrap"><section className="hero-panel"><div className="hero-copy"><div className="eyebrow light"><span className="eyebrow-line" />Monday, 20 November 2026</div><h1>Make the next<br /><em>question count.</em></h1><p>Your assessment workspace for turning everyday answers into the next useful teaching move.</p><div className="hero-actions"><Button className="button-mustard" onClick={() => onNavigate("/assessments/new")}><Plus size={16} /> Build assessment</Button><Button variant="ghost" className="button-ghost-light" onClick={() => onNavigate("/analytics")}><BarChart3 size={16} /> View learning signals</Button></div></div><div className="hero-art"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-art-card art-card-back" /><div className="hero-art-card art-card-front"><div className="art-card-kicker">LIVE SIGNAL</div><div className="art-card-score">82<span>%</span></div><div className="art-card-label">class completion</div><div className="art-card-line"><span style={{ width: "82%" }} /></div><div className="art-card-foot"><span>Grade 9 · Horizon</span><Activity size={13} /></div></div><div className="hero-art-note"><Sparkles size={13} /> Objective mastery is up</div></div></section><div className="preview-strip"><div className="preview-strip-icon"><ShieldCheck size={16} /></div><div><strong>{previewMode ? "Exploring the read-only workspace preview" : "Good to see you, there."}</strong><span>{previewMode ? "Sign in to create, publish, assign and review work in your own school space." : "Your workspace is connected to Excel IA and ready for the next learning cycle."}</span></div>{previewMode ? <Button size="sm" variant="outline" onClick={onLogin}>Sign in to continue <ArrowUpRight size={14} /></Button> : <span className="preview-strip-status"><CheckCircle2 size={15} /> Synced</span>}</div><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" />The pulse</div><h2>School at a glance</h2></div><button className="text-link" onClick={() => onNavigate("/analytics")}>Open analytics <ArrowUpRight size={14} /></button></div><section className="metrics-grid"><MetricCard label="Published assessments" value={data.metrics.published} detail="3 ready for this week" icon={FileText} accent="accent-blue" /><MetricCard label="Active assignments" value={data.metrics.assignments} detail="Across 26 classes" icon={ClipboardCheck} accent="accent-mint" /><MetricCard label="Needs your review" value={data.approvals.length} detail="Teacher approvals waiting" icon={UserCheck} accent="accent-gold" /><MetricCard label="Learning groups" value={data.metrics.classes} detail={`${data.metrics.grades} grades · ${data.metrics.subjects} subjects`} icon={Users} accent="accent-coral" /></section><section className="dashboard-grid"><Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow"><span className="eyebrow-line" />Recently moving</div><CardTitle>Assessment workspace</CardTitle><CardDescription>Keep a clear view of what is live, building, and ready for reuse.</CardDescription></div><button className="icon-button" onClick={() => onNavigate("/assessments")} aria-label="Open all assessments"><ArrowUpRight size={17} /></button></CardHeader><CardContent className="assessment-list">{data.assessments.slice(0, 4).map(assessment => <button className="assessment-row" key={assessment.id} onClick={() => onNavigate(assessment.status === "draft" ? "/assessments/new" : "/assessments")}><div className="assessment-type-icon"><FileText size={17} /></div><div className="assessment-main"><strong>{assessment.title}</strong><span>{assessment.subject} · {assessment.gradeLabel}</span></div><div className="assessment-meta"><StatusBadge status={assessment.status} /><span>{assessment.questionCount} questions</span></div><ChevronRight size={16} className="row-chevron" /></button>)}<button className="list-footer-link" onClick={() => onNavigate("/assessments")}><ListChecks size={15} /> See all assessments</button></CardContent></Card><Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow"><span className="eyebrow-line" />Learning signals</div><CardTitle>Momentum by subject</CardTitle><CardDescription>Average performance from your latest published work.</CardDescription></div><span className="signal-window">Last 30 days <ChevronDown size={13} /></span></CardHeader><CardContent><div className="signal-chart"><div className="chart-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-area"><div className="chart-grid-lines"><span /><span /><span /><span /><span /></div><div className="chart-bars"><div className="chart-bar-group"><div className="chart-bar bar-navy" style={{ height: "76%" }} /><div className="chart-bar bar-mustard" style={{ height: "82%" }} /><span>Math</span></div><div className="chart-bar-group"><div className="chart-bar bar-navy" style={{ height: "71%" }} /><div className="chart-bar bar-mustard" style={{ height: "64%" }} /><span>Science</span></div><div className="chart-bar-group"><div className="chart-bar bar-navy" style={{ height: "84%" }} /><div className="chart-bar bar-mustard" style={{ height: "91%" }} /><span>Digital</span></div><div className="chart-bar-group"><div className="chart-bar bar-navy" style={{ height: "69%" }} /><div className="chart-bar bar-mustard" style={{ height: "77%" }} /><span>English</span></div></div></div></div><div className="chart-legend"><span><i className="legend-dot dot-navy" />Average score</span><span><i className="legend-dot dot-mustard" />Completion</span></div></CardContent></Card></section><section className="dashboard-grid"><Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow"><span className="eyebrow-line" />Admin desk</div><CardTitle>Teacher approvals</CardTitle><CardDescription>Keep the teaching community moving safely.</CardDescription></div><span className="count-badge">{data.approvals.length} open</span></CardHeader><CardContent>{data.approvals.length === 0 ? <div className="empty-state"><CheckCircle2 size={20} />All caught up.</div> : data.approvals.map(approval => <div className="approval-row" key={approval.id}><div className="avatar avatar-warm">{initials(approval.fullName)}</div><div className="approval-main"><strong>{approval.fullName}</strong><span>{approval.subjectsSummary} · {approval.gradesSummary}</span></div><div className="approval-actions">{isAdmin && !previewMode ? <><button className="approval-button approve" onClick={() => onApproval(approval.id, "approved")} aria-label={`Approve ${approval.fullName}`}><Check size={15} /></button><button className="approval-button reject" onClick={() => onApproval(approval.id, "rejected")} aria-label={`Reject ${approval.fullName}`}><X size={15} /></button></> : <span className="review-stamp">Review</span>}</div></div>)}</CardContent></Card><Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow"><span className="eyebrow-line" />In the classroom</div><CardTitle>Assignment pulse</CardTitle><CardDescription>Where learners are in the loop right now.</CardDescription></div><button className="text-link small" onClick={() => onNavigate("/assignments")}>View all <ArrowUpRight size={13} /></button></CardHeader><CardContent>{data.assignments.map(assignment => <div className="assignment-row" key={assignment.id}><div className="assignment-row-top"><div><strong>{assignment.title}</strong><span>{assignment.classLabel}</span></div><StatusBadge status={assignment.status} /></div><div className="assignment-progress"><Progress value={(assignment.submissions / assignment.totalLearners) * 100} /><span>{assignment.submissions}/{assignment.totalLearners}</span></div></div>)}</CardContent></Card></section></div>;
}

function Dashboard({ data, previewMode, onNavigate, onLogin, isAdmin }: { data: Workspace; previewMode: boolean; onNavigate: (path: string) => void; onLogin: () => void; isAdmin: boolean }) {
  const assessmentTotal = data.metrics.published + data.metrics.drafts;
  return (
    <div className="page-wrap">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow light"><span className="eyebrow-line" />Excel International Academy</div>
          <h1>{isAdmin ? <>A clear view of<br /><em>school activity.</em></> : <>Make the next<br /><em>question count.</em></>}</h1>
          <p>{isAdmin ? "Manage accounts and follow assessment activity across the school." : "Create meaningful assessments and turn student answers into your next teaching move."}</p>
          <div className="hero-actions">
            {!isAdmin && <Button className="button-mustard" onClick={() => previewMode ? onLogin() : onNavigate("/assessments/new")}><Plus size={16} /> Build assessment</Button>}
            <Button variant="ghost" className="button-ghost-light" onClick={() => onNavigate(isAdmin ? "/users" : "/analytics")}>
              {isAdmin ? <Users size={16} /> : <BarChart3 size={16} />}
              {isAdmin ? "Manage accounts" : "View learning signals"}
            </Button>
          </div>
        </div>
      </section>
      {previewMode && <div className="preview-strip"><div className="preview-strip-icon"><ShieldCheck size={16} /></div><div><strong>Read-only workspace preview</strong><span>Sign in to access your role-based school workspace.</span></div><Button size="sm" variant="outline" onClick={onLogin}>Sign in <ArrowUpRight size={14} /></Button></div>}
      <div className="section-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" />The pulse</div><h2>{isAdmin ? "School at a glance" : "My teaching workspace"}</h2></div>
        <button className="text-link" onClick={() => onNavigate(isAdmin ? "/users" : "/analytics")}>{isAdmin ? "Open user management" : "Open analytics"} <ArrowUpRight size={14} /></button>
      </div>
      <section className="metrics-grid">
        {isAdmin ? <>
          <MetricCard label="Total users" value={data.metrics.totalUsers} detail={`${data.metrics.admins} Admins · ${data.metrics.teachers} Teachers`} icon={Users} accent="accent-blue" />
          <MetricCard label="Students" value={data.metrics.students} detail="Optional learner accounts" icon={GraduationCap} accent="accent-mint" />
          <MetricCard label="Assessments" value={assessmentTotal} detail={`${data.metrics.published} published · ${data.metrics.drafts} drafts`} icon={FileText} accent="accent-gold" />
          <MetricCard label="Active assignments" value={data.metrics.assignments} detail="School-wide" icon={ClipboardCheck} accent="accent-coral" />
        </> : <>
          <MetricCard label="Published assessments" value={data.metrics.published} detail="My published work" icon={FileText} accent="accent-blue" />
          <MetricCard label="Drafts" value={data.metrics.drafts} detail="Ready to continue building" icon={ListChecks} accent="accent-mint" />
          <MetricCard label="Active assignments" value={data.metrics.assignments} detail="Assigned by me" icon={ClipboardCheck} accent="accent-gold" />
          <MetricCard label="Learning groups" value={data.metrics.classes} detail={`${data.metrics.grades} grades · ${data.metrics.subjects} subjects`} icon={Users} accent="accent-coral" />
        </>}
      </section>
      <section className="dashboard-grid">
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div><div className="eyebrow"><span className="eyebrow-line" />Recently updated</div><CardTitle>Assessment workspace</CardTitle><CardDescription>Assessments available in your account scope.</CardDescription></div>
            <button className="icon-button" onClick={() => onNavigate("/assessments")} aria-label="Open all assessments"><ArrowUpRight size={17} /></button>
          </CardHeader>
          <CardContent className="assessment-list">
            {data.assessments.length ? data.assessments.slice(0, 4).map(assessment => (
              <button className="assessment-row" key={assessment.id} onClick={() => onNavigate(assessment.status === "draft" ? "/assessments/new" : "/assessments")}>
                <div className="assessment-type-icon"><FileText size={17} /></div>
                <div className="assessment-main"><strong>{assessment.title}</strong><span>{assessment.subject} · {assessment.gradeLabel}</span></div>
                <div className="assessment-meta"><StatusBadge status={assessment.status} /><span>{assessment.questionCount} questions</span></div>
                <ChevronRight size={16} className="row-chevron" />
              </button>
            )) : <div className="empty-state">No assessments have been created in this account yet.</div>}
            <button className="list-footer-link" onClick={() => onNavigate("/assessments")}>See all assessments <ArrowUpRight size={14} /></button>
          </CardContent>
        </Card>
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div><div className="eyebrow"><span className="eyebrow-line" />In the classroom</div><CardTitle>Assignment activity</CardTitle><CardDescription>Progress from saved assignment records.</CardDescription></div>
            <button className="text-link small" onClick={() => onNavigate("/assignments")}>View all <ArrowUpRight size={13} /></button>
          </CardHeader>
          <CardContent>
            {data.assignments.length ? data.assignments.map(assignment => (
              <div className="assignment-row" key={assignment.id}>
                <div className="assignment-row-top"><div><strong>{assignment.title}</strong><span>{assignment.classLabel}</span></div><StatusBadge status={assignment.status} /></div>
                <div className="assignment-progress"><Progress value={assignment.totalLearners ? assignment.submissions / assignment.totalLearners * 100 : 0} /><span>{assignment.submissions}/{assignment.totalLearners}</span></div>
              </div>
            )) : <div className="empty-state">No assignment activity yet.</div>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AssessmentsPage({ data, previewMode, onNavigate, onLogin, onPublish }: { data: Workspace; previewMode: boolean; onNavigate: (path: string) => void; onLogin: () => void; onPublish: (id: number, status: "published" | "draft") => void }) {
  const [filter, setFilter] = useState("all");
  const rows = filter === "all" ? data.assessments : data.assessments.filter(item => item.status === filter);
  return <div className="page-wrap inner-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />Assessment studio</div><h1>Assessments</h1><p>Build, refine and release meaningful checks for every learning stage.</p></div><Button className="button-mustard" onClick={() => onNavigate("/assessments/new")}><Plus size={16} /> New assessment</Button></div><div className="toolbar"><div className="filter-tabs">{["all", "published", "draft"].map(item => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "All work" : statusLabel(item)}<span>{item === "all" ? data.assessments.length : data.assessments.filter(row => row.status === item).length}</span></button>)}</div><div className="toolbar-search"><Search size={15} /><input placeholder="Search assessments" /></div></div><div className="assessment-grid">{rows.map(assessment => <Card className="assessment-card" key={assessment.id}><CardHeader className="assessment-card-header"><div className="assessment-card-icon"><FileText size={18} /></div><button className="icon-button subtle" aria-label="More assessment actions"><MoreHorizontal size={17} /></button></CardHeader><CardContent><StatusBadge status={assessment.status} /><h3>{assessment.title}</h3><p>{assessment.subject} · {assessment.gradeLabel}</p><div className="assessment-card-stats"><span><ListChecks size={14} />{assessment.questionCount} questions</span><span><Clock3 size={14} />{assessment.durationMinutes} min</span><span><Target size={14} />{assessment.totalMarks} marks</span></div>{assessment.status === "published" && <><div className="card-progress-row"><span>Completion</span><strong>{assessment.completionRate}%</strong></div><Progress value={assessment.completionRate} /></>}</CardContent><div className="assessment-card-footer"><span>Updated this week</span>{assessment.status === "draft" ? <Button size="sm" variant="outline" onClick={() => onNavigate("/assessments/new")}>Continue <ChevronRight size={14} /></Button> : <Button size="sm" variant="ghost" onClick={() => onPublish(assessment.id, "draft")}>Unpublish</Button>}</div></Card>)}<button className="new-assessment-card" onClick={() => onNavigate("/assessments/new")}><div className="new-card-icon"><Plus size={22} /></div><strong>Start something new</strong><span>Blank, paste, AI or a reusable template</span></button></div>{previewMode && <div className="soft-callout"><Sparkles size={17} /><div><strong>This is a read-only preview.</strong><span>Sign in to save edits, publish assessments and assign work to learners.</span></div><Button size="sm" onClick={onLogin}>Sign in <ArrowUpRight size={14} /></Button></div>}</div>;
}

function StudioPage({ previewMode, onNavigate, onLogin }: { previewMode: boolean; onNavigate: (path: string) => void; onLogin: () => void }) {
  const [title, setTitle] = useState(""); const [subject, setSubject] = useState("Mathematics"); const [gradeLabel, setGradeLabel] = useState("Grade 9"); const [questionType, setQuestionType] = useState<"mcq" | "multi_select" | "true_false" | "short_answer" | "numeric" | "fill_blank">("mcq"); const [prompt, setPrompt] = useState(""); const [marks, setMarks] = useState("2"); const [duration, setDuration] = useState("25");
  const createMutation = trpc.assessments.create.useMutation({ onSuccess: () => { toast.success("Draft saved to your assessment workspace"); onNavigate("/assessments"); }, onError: error => toast.error(error.message) });
  const handleSave = () => { if (previewMode) { toast.info("Sign in to save this assessment to your workspace"); onLogin(); return; } if (!title.trim() || !prompt.trim()) { toast.error("Add a title and question prompt before saving"); return; } createMutation.mutate({ title, subject, gradeLabel, questionType, prompt, marks: Number(marks), durationMinutes: Number(duration) }); };
  return <div className="page-wrap inner-page studio-page"><div className="studio-heading"><button className="back-link" onClick={() => onNavigate("/assessments")}><ArrowLeft size={15} /> Back to assessments</button><div className="studio-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" />Assessment studio</div><h1>Shape the learning moment.</h1><p>Start with one strong question. Add sections, media and richer types as the assessment grows.</p></div><div className="autosave-pill"><span className="autosave-dot" />Draft workspace</div></div></div><div className="studio-layout"><aside className="studio-outline"><div className="outline-heading"><span>Build flow</span><span>01 / 03</span></div><div className="outline-step active"><span>01</span><div><strong>Assessment basics</strong><small>Title, class and intent</small></div></div><div className="outline-step"><span>02</span><div><strong>Questions</strong><small>Core types & answer keys</small></div></div><div className="outline-step"><span>03</span><div><strong>Release settings</strong><small>Feedback & assignment</small></div></div><div className="outline-tip"><Sparkles size={16} /><strong>Good to know</strong><p>Questions stay editable after publishing. Publish only when answer keys and feedback are ready.</p></div></aside><section className="studio-form-card"><div className="form-section-heading"><div><span className="section-number">01</span><div><h2>Assessment basics</h2><p>Give this learning moment a clear home.</p></div></div><Badge variant="outline">Required</Badge></div><div className="form-grid"><div className="field-span-2"><Label htmlFor="title">Assessment title</Label><Input id="title" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Algebraic Thinking · Checkpoint 03" /></div><div><Label htmlFor="subject">Subject</Label><select id="subject" value={subject} onChange={event => setSubject(event.target.value)}><option>Mathematics</option><option>Integrated Science</option><option>Digital Literacy</option><option>English Language</option></select></div><div><Label htmlFor="grade">Grade / stage</Label><select id="grade" value={gradeLabel} onChange={event => setGradeLabel(event.target.value)}><option>Grade 5</option><option>Grade 8</option><option>Grade 9</option><option>Grade 12</option></select></div><div className="field-span-2"><Label htmlFor="prompt">First question</Label><Textarea id="prompt" value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Write the question students should think through..." rows={5} /><div className="field-hint"><CircleHelp size={13} /> You can paste numbered questions later and keep uncertain items visible for review.</div></div><div><Label htmlFor="questionType">Question type</Label><select id="questionType" value={questionType} onChange={event => setQuestionType(event.target.value as typeof questionType)}><option value="mcq">Multiple choice</option><option value="multi_select">Multiple select</option><option value="true_false">True / False</option><option value="short_answer">Short answer</option><option value="numeric">Numerical answer</option><option value="fill_blank">Fill in the blank</option></select></div><div className="compact-fields"><div><Label htmlFor="marks">Marks</Label><Input id="marks" value={marks} onChange={event => setMarks(event.target.value)} type="number" min="1" /></div><div><Label htmlFor="duration">Minutes</Label><Input id="duration" value={duration} onChange={event => setDuration(event.target.value)} type="number" min="1" /></div></div></div><div className="form-divider" /><div className="form-bottom-row"><div className="form-note"><ShieldCheck size={16} /><span>Teacher review stays required before release.</span></div><div className="form-actions"><Button variant="ghost" onClick={() => onNavigate("/assessments")}>Cancel</Button><Button className="button-mustard" onClick={handleSave} disabled={createMutation.isPending}>{createMutation.isPending ? "Saving…" : previewMode ? "Sign in to save" : "Save draft"}<Send size={15} /></Button></div></div></section></div></div>;
}

function AnalyticsPage({ data, onNavigate }: { data: Workspace; onNavigate: (path: string) => void }) { const rows = data.assessments.filter(item => item.status === "published"); return <div className="page-wrap inner-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />Learning signals</div><h1>Analytics</h1><p>Read the room, then choose the next intervention with confidence.</p></div><Button variant="outline" onClick={() => onNavigate("/")}><ArrowLeft size={15} /> Back to overview</Button></div><div className="analytics-highlight"><div><span className="eyebrow light"><span className="eyebrow-line" />School signal</span><h2>Momentum is visible when feedback is close behind.</h2><p>Across the latest published assessments, learners are completing most work in the same week it is assigned.</p></div><div className="analytics-score"><strong>78%</strong><span>average completion</span><div className="score-ring"><div className="score-ring-inner">+6.4%</div></div></div></div><div className="metrics-grid analytics-metrics"><MetricCard label="Average score" value="77%" detail="Across published work" icon={Target} accent="accent-blue" /><MetricCard label="Completion rate" value="78%" detail="+6.4% from last month" icon={Activity} accent="accent-mint" /><MetricCard label="Questions reviewed" value="124" detail="Across 18 assessments" icon={CheckCircle2} accent="accent-gold" /><MetricCard label="Learners in motion" value="286" detail="Across 26 classes" icon={GraduationCap} accent="accent-coral" /></div><Card className="panel-card analytics-table-card"><CardHeader className="panel-header"><div><div className="eyebrow"><span className="eyebrow-line" />Assessment readout</div><CardTitle>Where to look next</CardTitle><CardDescription>Use completion and average score together to spot the useful next move.</CardDescription></div><button className="text-link small">Export report <ArrowUpRight size={13} /></button></CardHeader><CardContent><div className="analytics-table"><div className="analytics-table-head"><span>Assessment</span><span>Completion</span><span>Average score</span><span>Signal</span></div>{rows.map(item => <div className="analytics-table-row" key={item.id}><div><strong>{item.title}</strong><span>{item.subject} · {item.gradeLabel}</span></div><div><Progress value={item.completionRate} /><span>{item.completionRate}%</span></div><strong>{item.averageScore}%</strong><span className={item.averageScore >= 75 ? "signal-positive" : "signal-watch"}>{item.averageScore >= 75 ? "Ready to extend" : "Worth revisiting"}</span></div>)}</div></CardContent></Card></div>; }

function SecondaryPage({ path, data, onNavigate }: { path: string; data: Workspace; onNavigate: (path: string) => void }) { const configs: Record<string, { title: string; kicker: string; description: string; icon: typeof BookOpen }> = { "/question-bank": { title: "Question bank", kicker: "Reusable thinking", description: "Curate personal and school-shared questions that remain ready for the next lesson.", icon: Library }, "/assignments": { title: "Assignments", kicker: "In the classroom", description: "Track what learners have started, submitted, completed or still need from you.", icon: ClipboardCheck }, "/settings": { title: "Settings", kicker: "School workspace", description: "Shape your academic structure, permissions, feedback rules and connected services.", icon: Settings2 } }; const config = configs[path] ?? configs["/settings"]; const Icon = config.icon; return <div className="page-wrap inner-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />{config.kicker}</div><h1>{config.title}</h1><p>{config.description}</p></div><Button className="button-mustard" onClick={() => onNavigate(path === "/question-bank" ? "/assessments/new" : "/")}><Icon size={16} />{path === "/question-bank" ? "Create from bank" : path === "/settings" ? "Review setup" : "Back to overview"}</Button></div><div className="feature-banner"><div className="feature-banner-icon"><Icon size={21} /></div><div><span className="eyebrow">Phase 1 workspace</span><h2>{path === "/question-bank" ? "A calm home for your best questions." : path === "/assignments" ? "Keep every learner in the loop." : "Configure the conditions for good learning."}</h2><p>{path === "/question-bank" ? "Core question creation is live in Assessment Studio. Shared collections, tags, imports and moderation are staged next so nothing gets lost in a dead-end flow." : path === "/assignments" ? "Assignments created from the studio will appear here with status, due dates, submission progress and feedback release controls." : "Excel IA is configured as the first tenant with Grades 1–13, Cambridge curriculum stages and a current 2026 / 27 academic year."}</p></div><span className="feature-banner-tag">In progress</span></div><div className="secondary-grid"><Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow"><span className="eyebrow-line" />Ready now</div><CardTitle>{path === "/question-bank" ? "Starter collections" : path === "/assignments" ? "Live assignment pulse" : "Current setup"}</CardTitle></div></CardHeader><CardContent>{path === "/question-bank" ? <><div className="collection-row"><div className="collection-icon blue"><BookOpen size={17} /></div><div><strong>Cambridge foundations</strong><span>Reusable questions for Primary and Lower Secondary</span></div><span className="collection-count">24</span></div><div className="collection-row"><div className="collection-icon gold"><Target size={17} /></div><div><strong>Objective checkpoints</strong><span>Questions mapped to learning intentions</span></div><span className="collection-count">18</span></div><div className="collection-row"><div className="collection-icon mint"><Sparkles size={17} /></div><div><strong>My questions</strong><span>Personal questions from your workspace</span></div><span className="collection-count">12</span></div></> : path === "/assignments" ? data.assignments.map(item => <div className="assignment-row expanded" key={item.id}><div className="assignment-row-top"><div><strong>{item.title}</strong><span>{item.classLabel}</span></div><StatusBadge status={item.status} /></div><div className="assignment-progress"><Progress value={(item.submissions / item.totalLearners) * 100} /><span>{item.submissions} of {item.totalLearners} submitted</span></div></div>) : <><div className="setup-row"><div><strong>Academic year</strong><span>2026 / 27 · Term 1 current</span></div><CheckCircle2 size={18} className="success-icon" /></div><div className="setup-row"><div><strong>Curriculum mapping</strong><span>Cambridge Primary · Lower Secondary · IGCSE / AS & A Level</span></div><CheckCircle2 size={18} className="success-icon" /></div><div className="setup-row"><div><strong>School structure</strong><span>{data.metrics.grades} grades · {data.metrics.classes} classes · {data.metrics.subjects} subjects</span></div><CheckCircle2 size={18} className="success-icon" /></div></>}</CardContent></Card><Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow"><span className="eyebrow-line" />Next layer</div><CardTitle>What is coming into focus</CardTitle></div></CardHeader><CardContent><div className="roadmap-item"><span className="roadmap-number">02</span><div><strong>Individual practice</strong><span>One question at a time, feedback and results review.</span></div></div><div className="roadmap-item"><span className="roadmap-number">03</span><div><strong>Live classroom</strong><span>Join codes, teacher pacing and response signals.</span></div></div><div className="roadmap-item"><span className="roadmap-number">04</span><div><strong>AI + documents</strong><span>Source-grounded question generation with review.</span></div></div></CardContent></Card></div></div>; }

export default function Home() {
  const [path, navigate] = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const previewQuery = trpc.workspace.preview.useQuery(undefined, { staleTime: 60_000 });
  const workspaceQuery = trpc.workspace.overview.useQuery(undefined, { enabled: isAuthenticated && user?.role !== "student" && !user?.mustChangePassword, staleTime: 30_000 });
  const utils = trpc.useUtils();
  const publishMutation = trpc.assessments.updateStatus.useMutation({ onSuccess: () => { toast.success("Assessment status updated"); void utils.workspace.overview.invalidate(); void utils.assessments.list.invalidate(); }, onError: error => toast.error(error.message) });
  const data = (isAuthenticated ? workspaceQuery.data ?? emptyWorkspace : previewQuery.data ?? previewData) as unknown as Workspace;
  const previewMode = !isAuthenticated; const isAdmin = user?.role === "admin"; const page = useMemo(() => path || "/", [path]);
  const handleLogin = () => navigate("/login");
  const handleLogout = async () => { await logout(); navigate("/"); toast.success("Signed out"); };

  // Teacher dashboard route - use teacher sidebar
  if (isAuthenticated && user?.role === "teacher") {
    const teacherPage = page === "/" || page === "/teacher" ? "/teacher" : 
                       page === "/assessments" ? "/teacher/library" :
                       page === "/analytics" ? "/teacher/reports" :
                       page === "/users" ? "/teacher/classes" : page;
    const body = loading && !data ? <div className="loading-screen"><div className="loading-mark">EA</div><p>Opening your learning workspace…</p></div> : <TeacherDashboard path={teacherPage} onNavigate={navigate} onLogin={handleLogin} isAdmin={isAdmin} />;
    return <Shell path={page} onNavigate={navigate} user={user} previewMode={previewMode} onLogin={handleLogin} onLogout={handleLogout}>{body}</Shell>;
  }

  const body = loading && !data ? <div className="loading-screen"><div className="loading-mark">EA</div><p>Opening your learning workspace…</p></div> : user?.role === "student" ? <StudentHistory /> : page === "/users" ? <UserManagement /> : page === "/" ? <Dashboard data={data} previewMode={previewMode} onNavigate={navigate} onLogin={handleLogin} isAdmin={isAdmin} /> : page === "/assessments" ? <AssessmentsPage data={data} previewMode={previewMode} onNavigate={navigate} onLogin={handleLogin} onPublish={(id, status) => previewMode ? toast.info("Sign in to change assessment publication") : publishMutation.mutate({ id, status })} /> : page === "/assessments/new" ? <StudioPage previewMode={previewMode} onNavigate={navigate} onLogin={handleLogin} /> : page === "/analytics" ? <AnalyticsPage data={data} onNavigate={navigate} /> : <SecondaryPage path={page} data={data} onNavigate={navigate} />;
  return <Shell path={page} onNavigate={navigate} user={user} previewMode={previewMode} onLogin={handleLogin} onLogout={handleLogout}>{body}</Shell>;
}
