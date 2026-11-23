import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Plus,
  ClipboardCheck,
  Calendar,
  Users,
  Folder,
  CheckCircle,
  AlertCircle,
  LogOut,
  PlayCircle,
  Sparkles,
  Clock3,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";

type Assignment = {
  id: number;
  title: string;
  classLabel: string;
  status: string;
  dueAt?: string;
  timeLimitMinutes?: number;
  attemptsAllowed?: number;
  submissions: number;
  totalLearners: number;
};

type AssignmentMode = "live_quiz" | "assignment" | "practice";

export function TeacherAssignments() {
  const [path, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<AssignmentMode>("assignment");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const overview = trpc.workspace.overview.useQuery(undefined, {
    enabled: isAuthenticated && user?.role !== "student",
  });

  const location = useLocation();

  const createAssignment = () => {
    toast.success("Assignment setup saved");
  };

  // Fetch classes
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") return;
    
    // In a full implementation, this would fetch from the API
    // For now, use mock data
    const mockClasses = [
      { id: 1, name: "Grade 9 · Horizon", grade: "Grade 9", section: "Horizon" },
      { id: 2, name: "Grade 8 · Cedar", grade: "Grade 8", section: "Cedar" },
      { id: 3, name: "Grade 7 · Maple", grade: "Grade 7", section: "Maple" },
    ];
    setClasses(mockClasses);
    setSelectedClass(mockClasses[0]);
    fetchAssignments(mockClasses[0].id);
  }, [isAuthenticated, user]);

  // Fetch assignments for a class
  const fetchAssignments = async (classId: number) => {
    setLoading(true);
    try {
      const classAssignments = (overview.data?.assignments ?? []).map((assignment): Assignment => ({
        id: assignment.id,
        title: assignment.title,
        classLabel: assignment.classLabel,
        status: assignment.status,
        dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : undefined,
        submissions: assignment.submissions,
        totalLearners: assignment.totalLearners,
      }));
      setAssignments(classAssignments);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast.error("Failed to load assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // Mode switching
  const modeOptions: { label: string; value: AssignmentMode }[] = [
    { label: "Assignment Mode", value: "assignment" },
    { label: "Live Quiz Mode", value: "live_quiz" },
    { label: "Practice Mode", value: "practice" },
  ];

  if (!isAuthenticated || user?.role !== "teacher") {
    return null;
  }

  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" />Class assignments</div>
          <h1>Assignments</h1>
          <p>Manage and track assigned assessments.</p>
        </div>
      </div>

      <Card className="panel-card">
        <CardHeader className="panel-header">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />Select mode</div>
            <CardTitle>Choose assignment mode</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {modeOptions.map(opt => (
            <Button
              key={opt.value}
              variant={mode === opt.value ? "default" : "outline"}
              onClick={() => setMode(opt.value)}
              className="w-full justify-start px-4 py-2 mb-2"
            >
              {opt.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Class Selection */}
      {classes.length > 0 && (
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Select class</div>
              <CardTitle>Choose a class</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              onValueChange={val => {
                const classId = parseInt(val || "0");
                setSelectedClass(classes.find(c => c.id === classId) || null);
                if (classId) fetchAssignments(classId);
              }}
              value={selectedClass?.id?.toString() || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    <span>{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Assignment Form */}
      {selectedClass && (
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Create assignment</div>
              <CardTitle>Assign assessment to {selectedClass.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={e => {
              e.preventDefault();
              createAssignment();
            }}>
              <Input
                placeholder="Assignment title"
                defaultValue={` ${selectedClass.name} Assessment`}
                readOnly
              />
              
              <Select
                onValueChange={val => setMode(val === "live_quiz" ? "live_quiz" : "assignment")}
                value={mode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment mode</SelectItem>
                  <SelectItem value="live_quiz">Live quiz mode</SelectItem>
                  <SelectItem value="practice">Practice mode</SelectItem>
                </SelectContent>
              </Select>

              {/* Live quiz specific fields */}
              {mode === "live_quiz" && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Input
                      placeholder="Time limit (minutes)"
                      type="number"
                      defaultValue="30"
                    />
                    <Input
                      placeholder="Max participants"
                      type="number"
                      defaultValue="50"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="button-mustard w-full"
                  >
                    <PlayCircle size={16} /> Start live quiz
                  </Button>
                </>
              )}

              {/* Assignment mode fields */}
              {mode === "assignment" && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Input
                      placeholder="Due date"
                      type="date"
                    />
                    <Input
                      placeholder="Time limit (minutes)"
                      type="number"
                      defaultValue="0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Input
                      placeholder="Attempts allowed"
                      type="number"
                      defaultValue="1"
                    />
                    <Select defaultValue="1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 attempt</SelectItem>
                        <SelectItem value="unlimited">Unlimited attempts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    className="button-mustard w-full"
                  >
                    <ClipboardCheck size={16} /> Publish assignment
                  </Button>
                </>
              )}

              {/* Practice mode fields */}
              {mode === "practice" && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Select defaultValue="unlimited">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                        <SelectItem value="1">1 attempt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select defaultValue="true">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Show feedback</SelectItem>
                      <SelectItem value="false">Hide feedback</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    className="button-mustard w-full"
                  >
                    <Sparkles size={16} /> Set up practice
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing assignments list */}
      {selectedClass && (
        <Card className="panel-card">
          <CardHeader className="panel-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Active assignments</div>
              <CardTitle>Assigned assessments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length ? (
              <div className="assignments-list">
                {assignments.map((a: Assignment) => (
                  <div key={a.id} className="assignment-item">
                    <div className="assignment-item-header">
                      <strong>{a.title}</strong>
                      <Badge>{statusLabel(a.status)}</Badge>
                    </div>
                    <div className="assignment-item-details">
                      <span>
                        <Users size={12} /> {a.totalLearners} students
                      </span>
                      <span>
                        <Clock3 size={12} /> {a.timeLimitMinutes || 0} min limit
                      </span>
                      <span>
                        <Target size={12} /> {a.attemptsAllowed} attempts
                      </span>
                    </div>
                    <div className="assignment-item-progress">
                      <Progress
                        value={a.totalLearners ? a.submissions / a.totalLearners * 100 : 0}
                      />
                      <span>{a.submissions}/{a.totalLearners} submitted</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No assignments yet. Create your first assignment above.</div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedClass && assignments.length === 0 && !selectedClass && (
        <div className="empty-state">
          <span className="empty-state-icon">
            <ClipboardCheck size={48} className="text-muted-foreground" />
          </span>
          <p>Select a class above to create and manage assignments.</p>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}