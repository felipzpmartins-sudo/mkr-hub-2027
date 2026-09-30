import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Crown, KeyRound, Trash2, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [action, setAction] = useState<"delete" | "reset" | null>(null);
  const [working, setWorking] = useState(false);
  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: roles } = await supabase
        .from('user_roles').select('role').eq('user_id', session.user.id);
      if (!roles?.some(r => r.role === 'super_admin')) {
        toast.error("Acesso restrito ao super administrador.");
        navigate("/admin");
        return;
      }
      loadUsers();
    })();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'list_users' },
      });
      if (error) throw error;
      setUsers(data?.users ?? []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const t = searchTerm.toLowerCase();
    return !t
      || (u.full_name?.toLowerCase().includes(t))
      || (u.email?.toLowerCase().includes(t));
  });

  const confirmAction = async () => {
    if (!target || !action) return;
    setWorking(true);
    try {
      if (action === "delete") {
        const { data, error } = await supabase.functions.invoke('admin-user-management', {
          body: { action: 'delete_user', user_id: target.id },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        toast.success("Usuário excluído.");
      } else if (action === "reset") {
        const { data, error } = await supabase.functions.invoke('admin-user-management', {
          body: { action: 'reset_password', user_id: target.id, new_password: '12345678' },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        setLastTempPassword(data.temp_password);
        toast.success(`Senha redefinida para 12345678. O usuário deverá trocar no próximo login.`);
      }
      loadUsers();
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar ação");
    } finally {
      setWorking(false);
      setTarget(null);
      setAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
          </Button>
          <h1 className="text-4xl font-bold mb-2">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground text-lg">
            Visualize, exclua contas e redefina senhas.
          </p>
        </div>

        {lastTempPassword && (
          <Card className="mb-4 border-primary/40 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">Senha temporária gerada:</p>
                <code className="text-lg">{lastTempPassword}</code>
                <p className="text-sm text-muted-foreground mt-1">
                  O usuário será obrigado a criar uma nova senha no próximo login.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(lastTempPassword);
                toast.success("Senha copiada");
              }}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card><CardHeader className="pb-3">
            <CardDescription>Total de Usuários</CardDescription>
            <CardTitle className="text-3xl">{users.length}</CardTitle>
          </CardHeader></Card>
          <Card><CardHeader className="pb-3">
            <CardDescription>Administradores</CardDescription>
            <CardTitle className="text-3xl text-primary">
              {users.filter(u => u.roles.includes('admin') || u.roles.includes('super_admin')).length}
            </CardTitle>
          </CardHeader></Card>
          <Card><CardHeader className="pb-3">
            <CardDescription>Aprovadores / Estoque</CardDescription>
            <CardTitle className="text-3xl">
              {users.filter(u => u.roles.includes('requisition_approver') || u.roles.includes('stock')).length}
            </CardTitle>
          </CardHeader></Card>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Carregando...
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>{format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>
                    {u.last_sign_in_at
                      ? format(new Date(u.last_sign_in_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <Badge variant="outline">Usuário</Badge>}
                      {u.roles.map(r => (
                        <Badge key={r} className={
                          r === 'super_admin' ? "bg-primary/20 text-primary" :
                          r === 'admin' ? "bg-primary/10 text-primary" : ""
                        } variant={r.includes('admin') ? "default" : "outline"}>
                          {r === 'super_admin' && <Crown className="mr-1 h-3 w-3" />}
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline"
                      onClick={() => { setTarget(u); setAction("reset"); }}>
                      <KeyRound className="mr-2 h-4 w-4" /> Resetar Senha
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => { setTarget(u); setAction("delete"); }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!target && !!action} onOpenChange={() => {
        if (!working) { setTarget(null); setAction(null); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "delete" ? "Excluir usuário" : "Resetar senha"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "delete" ? (
                <>Tem certeza que deseja <strong>excluir permanentemente</strong> a conta{" "}
                  <strong>{target?.email || target?.full_name}</strong>? Esta ação não pode ser desfeita.</>
              ) : (
                <>A senha de <strong>{target?.email || target?.full_name}</strong> será redefinida para{" "}
                  <code className="font-bold">12345678</code>. O usuário será obrigado a criar uma nova senha no próximo login.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmAction(); }} disabled={working}>
              {working && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
