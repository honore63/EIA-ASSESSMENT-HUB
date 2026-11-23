import { useState, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { LayoutDashboard, Library, Plus, ClipboardCheck, Users } from "lucide-react";

const teacherNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/teacher" },
  { icon: Library, label: "Library", path: "/teacher/library" },
  { icon: Plus, label: "Create Assessment", path: "/assessments/new" },
  { icon: ClipboardCheck, label: "Assignments", path: "/teacher/assignments" },
  { icon: ClipboardCheck, label: "Reports", path: "/teacher/reports" },
  { icon: Users, label: "My Classes", path: "/teacher/classes" },
];

export default function TeacherSidebar({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full">
      <aside className={`${open ? "w-64" : "w-16"} shrink-0 border-r bg-sidebar p-3 transition-all`}>
        <button className="mb-4 h-9 w-9 rounded-lg border" onClick={() => setOpen(value => !value)} aria-label="Toggle navigation">
          <LayoutDashboard className="mx-auto h-4 w-4" />
        </button>
        <nav className="space-y-1">
          {teacherNavItems.map(item => (
            <button
              key={`${item.path}-${item.label}`}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${location === item.path ? "bg-accent" : "hover:bg-accent"}`}
              onClick={() => setLocation(item.path)}
              title={item.label}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {open && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        {open && <div className="mt-6 border-t px-3 pt-3 text-sm">{user?.name || "Teacher"}</div>}
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
