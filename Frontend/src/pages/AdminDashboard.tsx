import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { AdminHome } from "./AdminHome";

type AdminDashboardProps = {
  path: string;
  onNavigate: (path: string) => void;
  onLogin: () => void;
};

export function AdminDashboard({ onNavigate, onLogin }: AdminDashboardProps) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || user?.role !== "admin") {
    onNavigate("/login");
    return null;
  }
  return (
    <AdminSidebar>
      <AdminHome />
    </AdminSidebar>
  );
}
