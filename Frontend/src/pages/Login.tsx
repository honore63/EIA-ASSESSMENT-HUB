import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: result => {
      window.location.assign(result.mustChangePassword ? "/change-password" : "/");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <main className="page-wrap inner-page" style={{ maxWidth: 520, margin: "8vh auto" }}>
      <section className="studio-form-card">
        <div className="eyebrow"><span className="eyebrow-line" />Excel International Academy</div>
        <h1>Sign in</h1>
        <p>Use your school account to access your assessment workspace.</p>
        <form onSubmit={submit} className="form-grid" style={{ marginTop: 28 }}>
          <div className="field-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
          </div>
          <div className="field-span-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
          </div>
          <div className="field-span-2 form-actions">
            <Button className="button-mustard" type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 12 }}>
            Joining a live quiz from your teacher?
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.assign("/quiz/join")}
            style={{ width: "100%" }}
          >
            <Gamepad2 size={16} style={{ marginRight: 8 }} />
            Join Live Quiz with PIN
          </Button>
        </div>
      </section>
    </main>
  );
}
