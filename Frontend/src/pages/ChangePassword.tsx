import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function ChangePassword() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const updatePassword = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Password changed");
      navigate("/");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match");
      return;
    }
    updatePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <main className="page-wrap inner-page" style={{ maxWidth: 520, margin: "8vh auto" }}>
      <section className="studio-form-card">
        <div className="eyebrow"><span className="eyebrow-line" />Account security</div>
        <h1>Choose a new password</h1>
        <p>Your temporary password must be changed before you can continue. Use at least 12 characters.</p>
        <form onSubmit={submit} className="form-grid" style={{ marginTop: 28 }}>
          <div className="field-span-2">
            <Label htmlFor="current-password">Temporary password</Label>
            <Input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
          </div>
          <div className="field-span-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={event => setNewPassword(event.target.value)} />
          </div>
          <div className="field-span-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
          </div>
          <div className="field-span-2 form-actions">
            <Button className="button-mustard" type="submit" disabled={updatePassword.isPending}>
              {updatePassword.isPending ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
