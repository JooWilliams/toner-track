import * as React from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/spinner";
import type { AuthStatus } from "@/lib/types";

interface AuthContextValue {
  username: string;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthGate.");
  return context;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    let active = true;
    api.auth.status()
      .then((result) => {
        if (active) {
          setStatus(result);
          if (result.username) setUsername(result.username);
        }
      })
      .catch((err: Error) => {
        if (active) setError(`Não foi possível conectar à API: ${err.message}`);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (status?.configured) await api.auth.login({ username, password });
      else await api.auth.setup({ username, password });
      setUsername(username.trim());
      setPassword("");
      setStatus({ configured: true, authenticated: true });
      await queryClient.invalidateQueries();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api.auth.logout();
      queryClient.clear();
      setStatus({ configured: true, authenticated: false });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (!status && !error) return <LoadingBlock label="Conectando ao TonerTrack…" />;
  if (!status) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>API indisponível</CardTitle>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                setError("");
                api.auth.status()
                  .then((result) => {
                    setStatus(result);
                    if (result.username) setUsername(result.username);
                  })
                  .catch((err: Error) => setError(`Não foi possível conectar à API: ${err.message}`));
              }}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  if (status?.authenticated) {
    return <AuthContext.Provider value={{ username, logout }}>{children}</AuthContext.Provider>;
  }

  const setup = status ? !status.configured : false;
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{setup ? "Configurar conta administradora" : "Entrar no TonerTrack"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {setup
              ? "Crie a conta única que protegerá este sistema. Use uma senha forte com pelo menos 12 caracteres."
              : "Informe as credenciais da conta administradora para acessar o sistema."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="auth-username">Usuário</Label>
              <Input
                id="auth-username"
                autoComplete="username"
                minLength={3}
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Senha</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={setup ? "new-password" : "current-password"}
                minLength={setup ? 12 : undefined}
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Aguarde…" : setup ? "Criar conta e entrar" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
