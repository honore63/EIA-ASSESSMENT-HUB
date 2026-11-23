import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Home,
  LayoutGrid,
  GraduationCap,
  Compass,
  Library as LibraryIcon,
  BarChart3,
  Users,
  Languages,
  Sparkles,
  HelpCircle,
  BookOpen,
  FileText,
  Layers,
  ShoppingBag,
  FolderOpen,
  Trash2,
  Search,
  Bell,
  Plus,
  Star,
  Share2,
  MoreVertical,
  Grid2X2,
  List,
  Clock3,
  Copy,
  Pencil,
  Eye,
  Send,
  Archive,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Assessment = {
  id: number;
  title: string;
  description?: string | null;
  subject: string;
  gradeLabel: string;
  topic?: string | null;
  status: "draft" | "published" | "archived";
  questionCount: number;
  totalMarks: number;
  completionRate?: number;
  averageScore?: number;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
  ownerId: number;
};

type TabKey = "recent" | "drafts" | "favorites" | "shared";

/**
 * LibraryPage - Kahoot-style assessment library.
 * Grid of reusable assessments with search, tabs, filters and actions.
 */
export function LibraryPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<TabKey>("recent");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);

  // Favorites stored locally
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("assessment-favorites") || "[]"); } catch { return []; }
  });
  const toggleFavorite = (id: number) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("assessment-favorites", JSON.stringify(next));
      return next;
    });
  };

  // Fetch assessments from database
  const { data, isLoading } = trpc.assessments.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role !== "student",
  });

  const assessments = (data ?? []) as unknown as Assessment[];

  // Delete mutation
  const deleteMutation = trpc.assessments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Assessment archived");
      setDeleteTarget(null);
      utils.assessments.list.invalidate();
    },
    onError: e => { toast.error(e.message); setDeleteTarget(null); },
  });

  // Duplicate mutation (creates new draft via saveFull with questions would need full data;
  // here we duplicate by creating a new draft with same title for simplicity)
  const duplicateMutation = trpc.assessments.create.useMutation({
    onSuccess: () => {
      toast.success("Assessment duplicated to your library");
      utils.assessments.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const publishMutation = trpc.assessments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Assessment status updated");
      utils.assessments.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  // Filter by tab + search
  const filtered = useMemo(() => {
    let list = [...assessments];
    if (activeTab === "drafts") list = list.filter(a => a.status === "draft");
    if (activeTab === "favorites") list = list.filter(a => favorites.includes(a.id));
    if (activeTab === "shared") list = list.filter(a => a.status === "published");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.subject?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [assessments, activeTab, favorites, search]);

  const counts = {
    recent: assessments.length,
    drafts: assessments.filter(a => a.status === "draft").length,
    favorites: favorites.length,
    shared: assessments.filter(a => a.status === "published").length,
  };

  if (!isAuthenticated) return null;
  if (user?.role === "student") return null;

  const thumbGradient = (subject: string) => {
    const colors: Record<string, string> = {
      Mathematics: "linear-gradient(135deg,#1368ce,#0f4fa8)",
      Science: "linear-gradient(135deg,#26890c,#1a6b08)",
      English: "linear-gradient(135deg,#d89e00,#a87a00)",
    };
    return colors[subject] || "linear-gradient(135deg,#5b2c8d,#3a1c71)";
  };

  return (
    <div className="qal-page">
      {/* ===== HEADER ===== */}
      <header className="qal-header">
        <button className="qal-brand" onClick={() => navigate("/teacher")}>
          <span>Kahoot</span><em>! GO</em>
        </button>
        <div className="qal-search-public">
          <Search size={18} /> <input placeholder="Search public content" />
        </div>
        <div className="qal-header-actions">
          <button className="qal-upgrade"><Sparkles size={16} /> Upgrade</button>
          <Button className="qal-create-btn" onClick={() => navigate("/assessments/new")}>
            <Plus size={18} /> Create
          </Button>
          <button className="qal-icon-btn" aria-label="Notifications"><Bell size={20} /></button>
          <button className="qal-avatar" aria-label="Profile">{user?.name?.charAt(0).toUpperCase() || "T"}</button>
        </div>
      </header>

      <div className="qal-body">
        {/* ===== PRIMARY NAV ===== */}
        <nav className="qal-nav">
          <button onClick={() => navigate("/teacher")}><Home size={19} /> Home</button>
          <button><LayoutGrid size={19} /> Features</button>
          <button><GraduationCap size={19} /> Your learning</button>
          <button><Compass size={19} /> Discover <ChevronDown size={14} /></button>
          <button className="active"><LibraryIcon size={19} /> Library</button>
          <button onClick={() => navigate("/teacher/reports")}><BarChart3 size={19} /> Reports</button>
          <button onClick={() => navigate("/teacher/classes")}><Users size={19} /> Classes</button>
          <button><Languages size={19} /> Language Learning</button>
          <div className="qal-nav-spacer" />
          <button><HelpCircle size={19} /> Help</button>
        </nav>

        {/* ===== SECONDARY NAV ===== */}
        <aside className="qal-subnav">
          <button className="active" onClick={() => setActiveTab("recent")}><BookOpen size={18} /> Assessments</button>
          <button><FileText size={18} /> Question Bank</button>
          <button><Layers size={18} /> Courses</button>
          <button><ShoppingBag size={18} /> Purchased content</button>
          <button><FolderOpen size={18} /> Your content</button>
          <div className="qal-subnav-divider" />
          <button onClick={() => setActiveTab("shared")}><Share2 size={18} /> Shared with you</button>
          <button onClick={() => setDeleteTarget(null)}><Trash2 size={18} /> Trash</button>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="qal-main">
          <div className="qal-tabs">
            {(["recent", "drafts", "favorites", "shared"] as TabKey[]).map(tab => (
              <button
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "recent" ? "Recent" : tab === "drafts" ? "Drafts" : tab === "favorites" ? "Favorites" : "Shared with you"}
                <span className="qal-tab-count">{counts[tab]}</span>
              </button>
            ))}
          </div>

          <div className="qal-toolbar">
            <div className="qal-search-local">
              <Search size={18} /> <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
            </div>
            <div className="qal-view-toggle">
              <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={18} /></button>
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List size={18} /></button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="qal-loading"><div className="qal-spinner" /> Loading your library...</div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="qal-empty">
              <div className="qal-empty-icon"><LibraryIcon size={48} /></div>
              <h3>No assessments found</h3>
              <p>{search ? "Try a different search term." : activeTab === "drafts" ? "You have no drafts." : "Create your first assessment to get started."}</p>
              <Button className="qal-create-btn" onClick={() => navigate("/assessments/new")}><Plus size={16} /> Create assessment</Button>
            </div>
          )}

          {/* Grid / List */}
          {!isLoading && filtered.length > 0 && (
            <div className={view === "grid" ? "qal-grid" : "qal-list"}>
              {filtered.map(a => (
                <div key={a.id} className="qal-card" onClick={() => navigate(`/assessments/${a.id}`)}>
                  <div className="qal-thumb" style={{ background: thumbGradient(a.subject) }}>
                    <div className="qal-thumb-label">Assessment</div>
                    <div className="qal-thumb-logo">EIA<span>Quiz</span></div>
                    <div className="qal-thumb-footer">
                      <span>{a.subject}</span>
                    </div>
                    <span className="qal-q-badge">{a.questionCount} questions</span>
                    {a.status === "draft" && <span className="qal-draft-badge">Draft</span>}
                  </div>
                  <div className="qal-card-body">
                    <div className="qal-card-title-row">
                      <h3>{a.title}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="qal-more" onClick={e => e.stopPropagation()} aria-label="More actions"><MoreVertical size={18} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/assessments/${a.id}/edit`); }}><Pencil size={15} /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/assessments/${a.id}/preview`); }}><Eye size={15} /> Preview</DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); duplicateMutation.mutate({ title: `${a.title} (Copy)`, subject: a.subject, gradeLabel: a.gradeLabel, questionType: "mcq", prompt: "Copied question", marks: 1, durationMinutes: a.durationMinutes }); }}><Copy size={15} /> Duplicate</DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); publishMutation.mutate({ id: a.id, status: a.status === "published" ? "draft" : "published" }); }}>
                            <Send size={15} /> {a.status === "published" ? "Unpublish" : "Publish"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); toggleFavorite(a.id); }}>
                            <Star size={15} /> {favorites.includes(a.id) ? "Remove favorite" : "Add favorite"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(a); }}>
                            <Archive size={15} /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="qal-card-meta">{a.subject} · {a.gradeLabel}</p>
                    <div className="qal-card-footer">
                      <span><Clock3 size={13} /> {a.durationMinutes} min</span>
                      <span><FileText size={13} /> {a.totalMarks} marks</span>
                      {typeof a.completionRate === "number" && a.completionRate > 0 && (
                        <span><Star size={13} /> {a.completionRate}% done</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Delete/Archive confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be moved to archives. This action can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, status: "archived" })}
              className="bg-destructive text-destructive-foreground"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default LibraryPage;
