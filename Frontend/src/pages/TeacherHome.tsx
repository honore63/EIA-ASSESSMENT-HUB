import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Library,
  Plus,
  Clock3,
  Target,
  Users,
  GraduationCap,
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  FileText,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type AssessmentStat = {
  label: string;
  value: string | number;
  detail?: string;
  icon: typeof LayoutDashboard;
  accent: string;
};

type RecentActivity = {
  id: number;
  title: string;
  description: string;
  time: string;
  type: "assessment" | "assignment" | "submission";
  status?: string;
};

type ClassPerformance = {
  className: string;
  totalStudents: number;
  assessments: number;
  averageScore: number;
  completionRate: number;
};

export function TeacherHome() {
  const [path, navigate] = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const utils = trpc.useUtils();

  // Prevent auto-navigate away when just loading
  const skipNav = useMemo(() => {
    const parts = path.split("/");
    return parts.length > 1 ? parts[1] : null;
  }, [path]);

  // Fetch dashboard data
  const dashboardQuery = trpc.workspace.overview.useQuery(undefined, {
    enabled: isAuthenticated && user?.role !== "student" && !user?.mustChangePassword,
    staleTime: 30_000,
  });

  const publishMutation = trpc.assessments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Assessment status updated");
      utils.workspace.overview.invalidate();
      utils.assessments.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const data = isAuthenticated && !loading
    ? (dashboardQuery.data ?? {
        school: { name: "Excel International Academy", tenantKey: "excel-ia-primary" },
        metrics: { published: 0, drafts: 0, assignments: 0, grades: 0, subjects: 0, classes: 0, totalUsers: 0, admins: 0, teachers: 0, students: 0 },
        assessments: [],
        assignments: [],
      } as any)
    : null;

  const isAdmin = user?.role === "admin";
  const previewMode = !isAuthenticated;

  // Handle navigation - only navigate if not skipping (prevents infinite loop on load)
  const handleNavigate = (targetPath: string) => {
    const currentParts = path.split("/");
    const targetParts = targetPath.split("/");
    
    // Don't navigate if we're already at the target or if this is an initial load
    if (currentParts[1] === targetParts[1] && currentParts[0] === "") {
      return; // Already there
    }
    
    // Special case: if path starts with / and current is root
    if (path === "/" && targetParts[1]) {
      navigate(targetPath);
      return;
    }
    
    navigate(targetPath);
  };

  const handleLogin = () => navigate("/login");
  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Signed out");
  };

  if (loading && !data) {
    return null; // Will be rendered by layout skeleton
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role === "student") {
    return null; // Students have their own history page
  }

  // Dashboard statistics
  const assessmentTotal = data.metrics.published + data.metrics.drafts;
  const { metrics, assessments, assignments } = data;

  // Teacher-specific stats
  const teacherStats: AssessmentStat[] = [
    {
      label: "Total Assessments Created",
      value: assessmentTotal.toString(),
      detail: `${metrics.published} published · ${metrics.drafts} drafts`,
      icon: Library,
      accent: "accent-blue",
    },
    {
      label: "Active Assignments",
      value: metrics.assignments.toString(),
      detail: "Assigned and in progress",
      icon: ClipboardCheck,
      accent: "accent-gold",
    },
    {
      label: "Total Students Reached",
      value: metrics.students.toString(),
      detail: "Active learner accounts",
      icon: Users,
      accent: "accent-coral",
    },
    {
      label: "Learning Groups",
      value: `${metrics.classes} classes`,
      detail: `${metrics.grades} grades · ${metrics.subjects} subjects`,
      icon: GraduationCap,
      accent: "accent-mint",
    },
  ];

  // Recent assessments
  const recentAssessments = assessments.slice(0, 5).map((a: any) => ({
    id: a.id,
    title: a.title,
    subject: a.subject,
    gradeLabel: a.gradeLabel,
    status: a.status,
    questionCount: a.questionCount,
  }));

  // Recent activity
  const recentActivity: RecentActivity[] = [
    { id: 1, title: "Algebraic Checkpoint assigned", description: "25 students assigned", time: "2 hours ago", type: "assignment", status: "available" },
    { id: 2, title: "Forces & Motion published", description: "82% completion", time: "Yesterday", type: "assessment", status: "published" },
    { id: 3, title: "Digital Citizenship submitted", description: "15/20 submitted", time: "2 days ago", type: "submission", status: "submitted" },
  ];

  // Class performance overview
  const classPerformance: ClassPerformance[] = [
    { className: "Grade 9 · Horizon", totalStudents: 28, assessments: 5, averageScore: 76, completionRate: 82 },
    { className: "Grade 8 · Cedar", totalStudents: 24, assessments: 3, averageScore: 88, completionRate: 91 },
    { className: "Grade 7 · Maple", totalStudents: 22, assessments: 4, averageScore: 71, completionRate: 67 },
  ];

  // Quick actions
  const quickActions = [
    {
      title: "Create New Assessment",
      description: "Build a new assessment from scratch",
      action: () => handleNavigate("/assessments/new"),
      icon: Plus,
      variant: "mustard",
    },
    {
      title: "Assign Assessment",
      description: "Assign an existing assessment to a class",
      action: () => handleNavigate("/assignments"),
      icon: ClipboardCheck,
      variant: "ghost",
    },
  ];

  return (
    <div className="page-wrap">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow light">
            <span className="eyebrow-line" />Monday, 20 November 2026
          </div>
          <h1>Teacher Dashboard</h1>
          <p>Your assessment workspace for turning everyday answers into the next teaching move.</p>
          <div className="hero-actions">
            {!isAdmin && (
              <Button className="button-mustard" onClick={() => handleNavigate("/assessments/new")}>
                <Plus size={16} /> Build assessment
              </Button>
            )}
            <Button variant="ghost" className="button-ghost-light" onClick={() => handleNavigate("/analytics")}>
              <BarChart3 size={16} /> View learning signals
            </Button>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {teacherStats.map(stat => (
          <Card key={stat.label} className="metric-card">
            <div className="metric-topline">
              <span>{stat.label}</span>
              <span className={`metric-icon ${stat.accent}`}>
                <stat.icon size={17} />
              </span>
            </div>
            <div className="metric-value">{stat.value}</div>
            <div className="metric-detail">{stat.detail || ""}</div>
          </Card>
        ))}
      </section>

      <section className="dashboard-grid">
        {/* Recent Assessments Card */}
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Recently created</div>
              <CardTitle>My Assessments</CardTitle>
              <CardDescription>Assessments available in your account.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="assessment-list">
            {recentAssessments.length ? (
              recentAssessments.map((assessment: any) => (
                <button
                  key={assessment.id}
                  className="assessment-row"
                  onClick={() => handleNavigate(`/assessments/${assessment.id}`)}
                >
                  <div className="assessment-type-icon">
                    <FileText size={17} />
                  </div>
                  <div className="assessment-main">
                    <strong>{assessment.title}</strong>
                    <span>{assessment.subject} · {assessment.gradeLabel}</span>
                  </div>
                  <div className="assessment-meta">
                    <Badge><span>{statusLabel(assessment.status)}</span></Badge>
                    <span>{assessment.questionCount} questions</span>
                  </div>
                  <ChevronRight size={16} className="row-chevron" />
                </button>
              ))
            ) : (
              <div className="empty-state">No assessments have been created yet.</div>
            )}
            <button className="list-footer-link" onClick={() => handleNavigate("/assessments")}>
              See all assessments <ArrowUpRight size={14} />
            </button>
          </CardContent>
        </Card>

        {/* Assignment Activity Card */}
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />In the classroom</div>
              <CardTitle>Assignment Activity</CardTitle>
              <CardDescription>Progress from saved assignment records.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length ? (
              assignments.map((assignment: any) => (
                <div key={assignment.id} className="assignment-row">
                  <div className="assignment-row-top">
                    <div>
                      <strong>{assignment.title}</strong>
                      <span>{assignment.classLabel}</span>
                    </div>
                    <Badge>{statusLabel(assignment.status)}</Badge>
                  </div>
                  <div className="assignment-progress">
                    <Progress
                      value={
                        assignment.totalLearners
                          ? assignment.submissions / assignment.totalLearners * 100
                          : 0
                      }
                    />
                    <span>
                      {assignment.submissions}/{assignment.totalLearners}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No assignment activity yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Quick actions</div>
              <CardTitle>Get started quickly</CardTitle>
              <CardDescription>Build or assign an assessment in seconds.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {quickActions.map(action => (
              <div
                key={action.title}
                className="quick-action-item"
                onClick={action.action}
              >
                <action.icon
                  size={20}
                  className="mr-3 text-primary flex-shrink-0"
                />
                <div>
                  <strong>{action.title}</strong>
                  <span className="text-sm text-muted-foreground">{action.description}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}