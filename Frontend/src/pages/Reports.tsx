import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  ClipboardCheck,
  FileText,
  Image,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash,
  Download,
  Upload,
  Plus,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type ReportType = "individual" | "class" | "assessment" | "school";
type ExportFormat = "pdf" | "excel";

type StudentResult = {
  id: number;
  name: string;
  email?: string;
  assessmentTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeTaken?: number;
  submittedAt: Date;
  status: string;
};

type ClassResult = {
  className: string;
  totalStudents: number;
  assessments: number;
  averageScore: number;
  passRate: number;
  completionRate: number;
};

type QuestionAnalytics = {
  id: number;
  prompt: string;
  type: string;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTimeTaken: number;
};

export function TeacherReports() {
  const [path, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [reportType, setReportType] = useState<ReportType>("class");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [classes] = useState([{ id: 1, name: "Grade 9 · Horizon" }, { id: 2, name: "Grade 8 · Cedar" }]);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [classResults, setClassResults] = useState<ClassResult[]>([]);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  useEffect(() => {
    if (!selectedClass && classes.length > 0) setSelectedClass(classes[0]);
  }, [classes, selectedClass]);

  // Fetch report data based on type
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") return;
    setLoading(true);
    generateReport();
  }, [reportType, isAuthenticated, user]);

  const generateReport = async () => {
    setLoading(true);
    try {
      // In a full implementation, this would call TRPC endpoints
      // For now, generate mock data based on report type
      
      switch (reportType) {
        case "individual":
          // Individual student results
          const mockStudentResults: StudentResult[] = [
            {
              id: 1,
              name: "Sarah Johnson",
              assessmentTitle: "Algebraic Thinking · Checkpoint 02",
              score: 22,
              totalMarks: 25,
              percentage: 88,
              timeTaken: 1800,
              submittedAt: new Date(),
              status: "submitted",
            },
            {
              id: 2,
              name: "Michael Chen",
              assessmentTitle: "Algebraic Thinking · Checkpoint 02",
              score: 18,
              totalMarks: 25,
              percentage: 72,
              timeTaken: 2400,
              submittedAt: new Date(),
              status: "submitted",
            },
          ];
          setStudentResults(mockStudentResults);
          break;

        case "class":
          // Class results
          const mockClassResults: ClassResult[] = [
            {
              className: "Grade 9 · Horizon",
              totalStudents: 28,
              assessments: 5,
              averageScore: 76,
              passRate: 82,
              completionRate: 89,
            },
            {
              className: "Grade 8 · Cedar",
              totalStudents: 24,
              assessments: 3,
              averageScore: 88,
              passRate: 94,
              completionRate: 96,
            },
          ];
          setClassResults(mockClassResults);
          break;

        case "assessment":
          // Assessment-level analytics
          const mockQuestionAnalytics: QuestionAnalytics[] = [
            {
              id: 1,
              prompt: "What is 15 + 27?",
              type: "mcq",
              totalAttempts: 45,
              correctAnswers: 38,
              incorrectAnswers: 7,
              averageTimeTaken: 45,
            },
            {
              id: 2,
              prompt: "The mitochondria is the powerhouse of the cell. True or False?",
              type: "true_false",
              totalAttempts: 45,
              correctAnswers: 42,
              incorrectAnswers: 3,
              averageTimeTaken: 30,
            },
          ];
          setQuestionAnalytics(mockQuestionAnalytics);
          break;

        case "school":
          // School-wide report
          setStudentResults([]);
          setClassResults([
            {
              className: "School-wide",
              totalStudents: 304,
              assessments: 24,
              averageScore: 71,
              passRate: 78,
              completionRate: 72,
            },
          ]);
          setQuestionAnalytics([]);
          break;
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
      setStudentResults([]);
      setClassResults([]);
      setQuestionAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const handleExport = () => {
    toast.info(`Exporting report as ${exportFormat.toUpperCase()}...`);
    // In full implementation, would trigger actual export
  };

  if (!isAuthenticated || user?.role !== "teacher") {
    return null;
  }

  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" />Reports</div>
          <h1>Assessment Reports</h1>
          <p>View and export detailed assessment analytics.</p>
        </div>
      </div>

      <Card className="panel-card">
        <CardHeader className="panel-header">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />Report type</div>
            <CardTitle>Select report scope</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {([
            { label: "Individual student", value: "individual" },
            { label: "Class results", value: "class" },
            { label: "Assessment results", value: "assessment" },
            { label: "School-wide", value: "school" },
          ] as { label: string; value: ReportType }[]).map(opt => (
            <Button
              key={opt.value}
              variant={reportType === opt.value ? "default" : "outline"}
              onClick={() => setReportType(opt.value)}
              className="w-full justify-start px-4 py-2 mb-2"
            >
              {opt.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Class/Assessment selector */}
      {reportType !== "individual" && selectedClass && (
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Select class</div>
              <CardTitle>{selectedClass.name} reports</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              onValueChange={val => setSelectedClass(val ? classes.find(c => c.id === parseInt(val)) || null : null)}
              value={selectedClass?.id?.toString() || ""}
            >
              <SelectValue>
                <span>{selectedClass?.name || "Select a class"}</span>
              </SelectValue>
              <SelectContent>
                {/* Classes would be fetched here */}
                <SelectItem value="1">Grade 9 · Horizon</SelectItem>
                <SelectItem value="2">Grade 8 · Cedar</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Report content */}
      {reportType === "individual" && (
        <div className="space-y-6">
          {studentResults.length ? (
            <div className="results-table">
              <div className="table-header">
                <span>Student</span>
                <span>Assessment</span>
                <span>Score</span>
                <span>Percentage</span>
                <span>Time taken</span>
                <span>Status</span>
              </div>
              {studentResults.map((s: StudentResult) => (
                <div key={s.id} className="table-row">
                  <span>{s.name}</span>
                  <span>{s.assessmentTitle}</span>
                  <span>{s.score}/{s.totalMarks}</span>
                  <span>{s.percentage}%</span>
                  <span>{s.timeTaken ? `${s.timeTaken/60}s` : "N/A"}</span>
                  <Badge>{statusLabel(s.status)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon">
                <EyeOff size={48} className="text-muted-foreground" />
              </span>
              <p>{reportType === "individual" ? "No student results yet." : ""}</p>
            </div>
          )}

          <div className="export-actions">
            <Button
              variant="outline"
              onClick={handleExport}
            >
              <Download size={16} /> Export as PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
            >
              <Download size={16} /> Export as Excel
            </Button>
          </div>
        </div>
      )}

      {reportType === "class" && classResults.length && (
        <div className="space-y-6">
          <div className="results-table">
            <div className="table-header">
              <span>Class</span>
              <span>Students</span>
              <span>Assessments</span>
              <span>Avg. score</span>
              <span>Pass rate</span>
              <span>Completion</span>
            </div>
            {classResults.map((c: ClassResult) => (
              <div key={c.className} className="table-row">
                <span>{c.className}</span>
                <span>{c.totalStudents}</span>
                <span>{c.assessments}</span>
                <span>{c.averageScore}</span>
                <span>{c.passRate}%</span>
                <span>{c.completionRate}%</span>
              </div>
            ))}
          </div>

          <div className="export-actions">
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} /> Export as PDF
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} /> Export as Excel
            </Button>
          </div>
        </div>
      )}

      {reportType === "assessment" && questionAnalytics.length && (
        <div className="space-y-6">
          <div className="results-table">
            <div className="table-header">
              <span>Question</span>
              <span>Type</span>
              <span>Total attempts</span>
              <span>Correct</span>
              <span>Incorrect</span>
              <span>Accuracy</span>
              <span>Avg. time</span>
            </div>
            {questionAnalytics.map((q: QuestionAnalytics) => (
              <div key={q.id} className="table-row">
                <span>{q.prompt.substring(0, 50)}{q.prompt.length > 50 ? "..." : ""}</span>
                <span>{q.type}</span>
                <span>{q.totalAttempts}</span>
                <span>{q.correctAnswers}</span>
                <span>{q.incorrectAnswers}</span>
                <span>{Math.round(q.correctAnswers / q.totalAttempts * 100)}%</span>
                <span>{q.averageTimeTaken}s</span>
              </div>
            ))}
          </div>

          <div className="export-actions">
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} /> Export as PDF
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} /> Export as Excel
            </Button>
          </div>
        </div>
      )}

      {reportType === "school" && (
        <div className="space-y-6">
          {classResults.length && (
            <div className="results-table">
              <div className="table-header">
                <span>Overall</span>
                <span>Students</span>
                <span>Assessments</span>
                <span>Avg. score</span>
                <span>Pass rate</span>
                <span>Completion</span>
              </div>
              {classResults.map((c: ClassResult) => (
                <div key="school-wide" className="table-row">
                  <span>School-wide</span>
                  <span>{c.totalStudents}</span>
                  <span>{c.assessments}</span>
                  <span>{c.averageScore}</span>
                  <span>{c.passRate}%</span>
                  <span>{c.completionRate}%</span>
                </div>
              ))}
            </div>
          )}

          <div className="export-actions">
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} /> Export as PDF
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} /> Export as Excel
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Loader2 size={48} className="text-muted-foreground" />
          </span>
          <p>Generating report...</p>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}