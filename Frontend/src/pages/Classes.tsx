import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Folder,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type ClassInfo = {
  id: number;
  name: string;
  grade: string;
  section?: string;
  totalStudents: number;
  assessments: number;
};

type StudentInfo = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

export function TeacherClasses() {
  const [path, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const location = useLocation();

  // Fetch classes
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") return;
    
    // Mock classes data - in full implementation, fetch from API
    const mockClasses: ClassInfo[] = [
      {
        id: 1,
        name: "Grade 9 · Horizon",
        grade: "Grade 9",
        section: "Horizon",
        totalStudents: 28,
        assessments: 5,
      },
      {
        id: 2,
        name: "Grade 8 · Cedar",
        grade: "Grade 8",
        section: "Cedar",
        totalStudents: 24,
        assessments: 3,
      },
      {
        id: 3,
        name: "Grade 7 · Maple",
        grade: "Grade 7",
        section: "Maple",
        totalStudents: 22,
        assessments: 4,
      },
    ];
    setClasses(mockClasses);
    setSelectedClass(mockClasses[0]);
  }, [isAuthenticated, user]);

  // Fetch students in selected class
  const fetchStudents = (classId: number) => {
    // In full implementation, would fetch from API
    return [
      { id: 1, name: "Sarah Johnson", email: "sarah@school.edu", role: "student" },
      { id: 2, name: "Michael Chen", email: "mchen@school.edu", role: "student" },
      { id: 3, name: "Emma Wilson", email: "emw@school.edu", role: "student" },
      { id: 4, name: "David Rodriguez", email: "droDR@school.edu", role: "student" },
    ];
  };

  // Fetch class assessment history
  const fetchAssessmentHistory = (classId: number) => {
    // In full implementation, would fetch from API
    return [
      { id: 1, title: "Algebraic Thinking · Checkpoint 02", status: "published", date: "Nov 15" },
      { id: 2, title: "Forces & Motion · Exit Ticket", status: "available", date: "Nov 10" },
      { id: 3, title: "Digital Citizenship Starter", status: "draft", date: "Nov 5" },
    ];
  };

  if (!isAuthenticated || user?.role !== "teacher") {
    return null;
  }

  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" />My classes</div>
          <h1>My Classes</h1>
          <p>Browse your classes and view assessment history.</p>
        </div>
      </div>

      <Card className="panel-card">
        <CardHeader className="panel-header">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />Classes</div>
            <CardTitle>Your teaching classes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Select
              onValueChange={val => {
                const classId = parseInt(val || "0");
                setSelectedClass(classes.find(c => c.id === classId) || null);
              }}
              value={selectedClass?.id?.toString() || ""}
            >
              <SelectValue>
                <span>{selectedClass?.name || "Select a class"}</span>
              </SelectValue>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    <span>{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Plus size={14} /> Create class
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(c => (
              <Card
                key={c.id}
                className="class-card"
                onClick={() => setSelectedClass(c)}
                style={{ cursor: "pointer" }}
              >
                <div className="class-card-header">
                  <div className="class-name">{c.name}</div>
                  <span className="class-grade">{c.grade}{c.section ? ` · ${c.section}` : ""}</span>
                </div>
                <div className="class-card-body">
                  <div className="class-stats">
                    <span>
                      <Users size={14} /> {c.totalStudents} students
                    </span>
                    <span>
                      <Folder size={14} /> {c.assessments} assessments
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          </CardContent>
        </Card>

      {/* Selected class details */}
      {selectedClass && (
        <div className="mt-6">
          <Card className="panel-card">
            <CardHeader className="panel-header">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" />{selectedClass.name}</div>
                <CardTitle>Class details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="stat-item">
                    <div className="stat-value">{selectedClass.totalStudents}</div>
                    <div className="stat-label">Total students</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{selectedClass.assessments}</div>
                    <div className="stat-label">Assessments</div>
                  </div>
                </div>
                <div>
                  <div className="stat-item">
                    <div className="stat-value">{selectedClass.grade}</div>
                    <div className="stat-label">Grade level</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{selectedClass.section || "N/A"}</div>
                    <div className="stat-label">Section</div>
                  </div>
                </div>
              </div>

              {/* Class assessment history */}
              <div className="mt-4">
                <div className="eyebrow"><span className="eyebrow-line" />Assessment history</div>
                <p>Assessments assigned to {selectedClass.name}</p>
                <div className="assignment-history">
                  {fetchAssessmentHistory(selectedClass.id).map((a: any) => (
                    <div key={a.id} className="history-item">
                      <span>{a.title}</span>
                      <span>{a.date}</span>
                      <Badge>{statusLabel(a.status)}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Class students */}
              <div className="mt-4">
                <div className="eyebrow"><span className="eyebrow-line" />Students</div>
                <p>Students in {selectedClass.name}</p>
                <div className="students-grid">
                  {fetchStudents(selectedClass.id).map((s: StudentInfo) => (
                    <div key={s.id} className="student-item">
                      <span>{s.name}</span>
                      <span>{s.email || "No email"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No class selected */}
      {!selectedClass && (
        <div className="mt-6 empty-state">
          <span className="empty-state-icon">
            <Users size={48} className="text-muted-foreground" />
          </span>
          <p>Select a class above to view details.</p>
          <Button className="button-mustard mt-2" onClick={() => navigate("/teacher/classes/new")}>
            <Plus size={14} /> Create class
          </Button>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}