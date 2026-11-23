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
  ClipboardCheck,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type AdminStats = {
  label: string;
  value: string | number;
  detail?: string;
  icon: typeof LayoutDashboard;
  accent: string;
};

export function AdminHome() {
  const [path, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const dashboardQuery = trpc.workspace.overview.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    staleTime: 30_000,
  });

  const data = isAuthenticated && user?.role === "admin"
    ? (dashboardQuery.data ?? {
        school: { name: "Excel International Academy", tenantKey: "excel-ia-primary" },
        metrics: { published: 0, drafts: 0, assignments: 0, grades: 0, subjects: 0, classes: 0, totalUsers: 0, admins: 0, teachers: 0, students: 0 },
        assessments: [],
        assignments: [],
      } as any)
    : null;

  const handleNavigate = (targetPath: string) => {
    const parts = path.split("/");
    if (parts[1] === targetPath.split("/")[1]) return;
    navigate(targetPath);
  };

  const handleLogin = () => navigate("/login");
  const handleLogout = async () => {
    // Admin logout
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const isAdmin = true;
  const previewMode = false;

  const { metrics, assessments } = data;

  const adminStats: AdminStats[] = [
    {
      label: "Total Users",
      value: metrics.totalUsers.toString(),
      detail: `${metrics.admins} Admins · ${metrics.teachers} Teachers · ${metrics.students} Students`,
      icon: Users,
      accent: "accent-blue",
    },
    {
      label: "Assessments",
      value: (metrics.published + metrics.drafts).toString(),
      detail: `${metrics.published} published · ${metrics.drafts} drafts`,
      icon: Library,
      accent: "accent-gold",
    },
    {
      label: "Active Classes",
      value: metrics.classes.toString(),
      detail: `${metrics.grades} grades · ${metrics.subjects} subjects`,
      icon: GraduationCap,
      accent: "accent-coral",
    },
    {
      label: "Assignments",
      value: metrics.assignments.toString(),
      detail: "School-wide assigned work",
      icon: ClipboardCheck,
      accent: "accent-mint",
    },
  ];

  const recentAssessments = assessments.slice(0, 5).map((a: any) => ({
    id: a.id,
    title: a.title,
    subject: a.subject,
    gradeLabel: a.gradeLabel,
    status: a.status,
  }));

  return (
    <div className="page-wrap">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow light">
            <span className="eyebrow-line" />Monday, 20 November 2026
          </div>
          <h1>Admin Dashboard</h1>
          <p>Manage your entire school's assessment ecosystem.</p>
          <div className="hero-actions">
            <Button className="button-mustard" onClick={() => navigate("/admin/create-assessment")}>
              <Plus size={16} /> Create assessment
            </Button>
            <Button variant="ghost" onClick={() => navigate("/admin/users")}>
              <Users size={16} /> Manage accounts
            </Button>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {adminStats.map(stat => (
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
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Recent assessments</div>
              <CardTitle>Recent school activity</CardTitle>
              <CardDescription>Assessments recently created or updated.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="assessment-list">
            {recentAssessments.length ? (
              recentAssessments.map((assessment: any) => (
                <button
                  key={assessment.id}
                  className="assessment-row"
                  onClick={() => navigate(`/assessments/${assessment.id}`)}
                >
                  <div className="assessment-type-icon">
                    <FileText size={17} />
                  </div>
                  <div className="assessment-main">
                    <strong>{assessment.title}</strong>
                    <span>{assessment.subject} · {assessment.gradeLabel}</span>
                  </div>
                  <div className="assessment-meta">
                    <Badge>
                      <span>{assessment.status.replace("_", " ")}</span>
                    </Badge>
                    <span>{assessment.questionCount} questions</span>
                  </div>
                  <ChevronRight size={16} className="row-chevron" />
                </button>
              ))
            ) : (
              <div className="empty-state">No assessments found.</div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />School overview</div>
              <CardTitle>Key metrics</CardTitle>
              <CardDescription>Overview of school performance.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {/* Placeholder for school overview widgets */}
            <div className="space-y-4">
              <div className="metric-mini">
                <span className="metric-mini-label">Completion rate</span>
                <span className="metric-mini-value">78%</span>
              </div>
              <div className="metric-mini">
                <span className="metric-mini-label">Average score</span>
                <span className="metric-mini-value">71</span>
              </div>
              <div className="metric-mini">
                <span className="metric-mini-label">Pass rate</span>
                <span className="metric-mini-value">82%</span>
              </div>
              <div className="metric-mini">
                <span className="metric-mini-label">Active sessions</span>
                <span className="metric-mini-value">12</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}