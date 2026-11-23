import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function UserManagement() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "teacher" | "student">("teacher");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const accounts = trpc.admin.users.list.useQuery();
  const refresh = () => utils.admin.users.list.invalidate();
  const create = trpc.admin.users.create.useMutation({
    onSuccess: async () => {
      toast.success("Account created. The user must change the temporary password at first sign-in.");
      setName("");
      setEmail("");
      setPassword("");
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.admin.users.update.useMutation({
    onSuccess: () => { toast.success("Account updated"); void refresh(); },
    onError: error => toast.error(error.message),
  });
  const resetPassword = trpc.admin.users.resetPassword.useMutation({
    onSuccess: () => toast.success("Temporary password set; the user must change it at sign-in"),
    onError: error => toast.error(error.message),
  });
  const visibleAccounts = useMemo(() => (accounts.data ?? []).filter(account =>
    `${account.name ?? ""} ${account.email ?? ""} ${account.role}`.toLowerCase().includes(search.toLowerCase()),
  ), [accounts.data, search]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    create.mutate({ name, email, role, password });
  };

  const handleReset = (id: number) => {
    const temporaryPassword = window.prompt("Enter a temporary password of at least 10 characters. It will not be shown again.");
    if (temporaryPassword === null) return;
    if (temporaryPassword.length < 10) {
      toast.error("Temporary password must contain at least 10 characters");
      return;
    }
    resetPassword.mutate({ id, password: temporaryPassword });
  };

  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" />School administration</div><h1>User management</h1><p>Create and manage Admin, Teacher and optional Student accounts.</p></div>
      </div>
      <section className="studio-form-card" style={{ marginBottom: 24 }}>
        <h2>Create account</h2>
        <form onSubmit={submit} className="form-grid" style={{ marginTop: 20 }}>
          <div><Label htmlFor="account-name">Full name</Label><Input id="account-name" required minLength={2} value={name} onChange={event => setName(event.target.value)} /></div>
          <div><Label htmlFor="account-email">Email</Label><Input id="account-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>
          <div><Label htmlFor="account-role">Role</Label><select id="account-role" value={role} onChange={event => setRole(event.target.value as typeof role)}><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option></select></div>
          <div><Label htmlFor="account-password">Temporary password</Label><Input id="account-password" type="password" minLength={10} required value={password} onChange={event => setPassword(event.target.value)} /></div>
          <div className="field-span-2 form-actions"><Button type="submit" className="button-mustard" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create account"}</Button></div>
        </form>
      </section>
      <section className="studio-form-card">
        <div className="page-heading" style={{ marginBottom: 18 }}>
          <div><h2>Accounts</h2><p>{accounts.data?.length ?? 0} accounts</p></div>
          <Input aria-label="Search users" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} style={{ maxWidth: 280 }} />
        </div>
        {accounts.isLoading ? <p>Loading accounts...</p> : accounts.error ? <p role="alert">{accounts.error.message}</p> : visibleAccounts.length === 0 ? <p>No accounts match your search.</p> : (
          <div className="analytics-table">
            <div className="analytics-table-head"><span>User</span><span>Role</span><span>Status</span><span>Created</span><span>Last login</span><span>Actions</span></div>
            {visibleAccounts.map(account => (
              <div className="analytics-table-row" key={account.id}>
                <div><strong>{account.name ?? "Unnamed account"}</strong><span>{account.email}</span></div>
                <select aria-label={`Role for ${account.email}`} value={account.role} onChange={event => update.mutate({ id: account.id, role: event.target.value as typeof role, status: account.accountStatus === "suspended" ? "suspended" : account.accountStatus === "inactive" ? "inactive" : "active" })}>
                  <option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option>
                </select>
                <select aria-label={`Status for ${account.email}`} value={account.accountStatus === "pending_verification" ? "inactive" : account.accountStatus} onChange={event => update.mutate({ id: account.id, role: account.role, status: event.target.value as "active" | "inactive" | "suspended" })}>
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                </select>
                <span>{account.createdAt.toLocaleDateString()}</span>
                <span>{account.lastSignedIn ? account.lastSignedIn.toLocaleDateString() : "Never"}</span>
                <Button size="sm" variant="outline" onClick={() => handleReset(account.id)}>Reset password</Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
