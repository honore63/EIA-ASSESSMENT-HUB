import { useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import TeacherSidebar from "@/components/TeacherSidebar";
import { TeacherHome } from "./TeacherHome";
import { LibraryPage as TeacherLibrary } from "./Library";
import { TeacherAssignments } from "./Assignments";
import { TeacherReports } from "./Reports";
import { TeacherClasses } from "./Classes";
import { Badge } from "@/components/ui/badge";

type TeacherDashboardProps = {
  path: string;
  onNavigate: (path: string) => void;
  onLogin: () => void;
  isAdmin?: boolean;
};

export function TeacherDashboard({ path, onNavigate, onLogin, isAdmin }: TeacherDashboardProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== "teacher") {
    // Redirect non-teachers
    onNavigate("/");
    return null;
  }

  // Prevent auto-navigation on initial load
  const skipNav = useMemo(() => {
    const parts = path.split("/");
    return parts.length > 1 ? parts[1] : null;
  }, [path]);

  // Route mapping
  const routeMap: Record<string, string> = {
    "": "/teacher", // root -> home
    "/teacher": "/teacher",
    "/teacher/library": "/teacher/library",
    "/teacher/assignments": "/teacher/assignments",
    "/teacher/reports": "/teacher/reports",
    "/teacher/classes": "/teacher/classes",
  };

  const targetPath = routeMap[path] || "/teacher";

  // Handle navigation only if not skipping initial load
  const handleNavigate = (target: string) => {
    const currentParts = path.split("/");
    const targetParts = target.split("/");
    
    // Don't navigate if already at target
    if (currentParts[1] === targetParts[1] && currentParts[0] === "") {
      return;
    }
    
    onNavigate(target);
  };

  // Initial navigation on mount (if not skipping)
  useMemo(() => {
    if (!skipNav && targetPath) {
      handleNavigate(targetPath);
    }
  }, [skipNav, targetPath]);

  if (loading) {
    return null; // Scaffold will show skeleton
  }

  // Render the appropriate page based on target path
  let PageComponent: ReactNode;
  {
    switch (targetPath) {
      case "/teacher/library":
        PageComponent = <TeacherLibrary key="library" />;
        break;
      case "/teacher/assignments":
        PageComponent = <TeacherAssignments key="assignments" />;
        break;
      case "/teacher/reports":
        PageComponent = <TeacherReports key="reports" />;
        break;
      case "/teacher/classes":
        PageComponent = <TeacherClasses key="classes" />;
        break;
      case "/teacher":
      default:
        PageComponent = <TeacherHome key="home" />;
    }
  }

  return (
    <TeacherSidebar>
      <main className="flex-1 p-4">
        <PageComponent />
      </main>
    </TeacherSidebar>
  );
}