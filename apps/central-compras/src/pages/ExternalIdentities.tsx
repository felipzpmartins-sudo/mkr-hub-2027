import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  ExternalIdentityMapping,
  createExternalIdentityMapping,
  IdentityUser,
  getExternalIdentityMappings,
  listIdentityUsers,
  revokeExternalIdentityMapping,
} from "@/services/externalIdentityMappings";


export default function ExternalIdentities() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<ExternalIdentityMapping[]>([]);
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [form, setForm] = useState({ auth_user_id: "", provider: "", issuer: "", subject: "", external_email: "", external_name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (!roles?.some((r) => r.role === "admin")) {
        toast.error("Acesso restrito a administradores.");
        return navigate("/");
      }
      setAllowed(true);
      listIdentityUsers().then(setUsers).catch((e) => toast.error(e.message));
      load();
    })();
  }, []);

  const load = async () => {
    try { setRows(await getExternalIdentityMappings()); }
    catch (e: any) { toast.error(e.message); }
  };

  const userOf = (id: string) => users.find((u) => u.auth_user_id === id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createExternalIdentityMapping(form);
      toast.success("Vínculo criado.");
      setForm({ auth_user_id: "", provider: "", issuer: "", subject: "", external_email: "", external_name: "" });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revogar este vínculo? (o registro não será apagado)")) return;
    try { await revokeExternalIdentityMapping(id); toast.success("Vínculo revogado."); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (!allowed) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        <h1 className="text-2xl font-bold">Integrações / Identidades Externas</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Vincular identidade manualmente</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1">
              <Label>Usuário da Central (o vínculo usa o auth.users.id) *</Label>
              <Select value={form.auth_user_id} onValueChange={(v) => setForm({ ...form, auth_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um usuário existente" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.auth_user_id} value={u.auth_user_id}>
                      {u.full_name ?? "Sem nome"} ({u.email ?? "sem e-mail"}) — {u.auth_user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(["provider", "issuer", "subject"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label>{k} *</Label>
                <Input required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>external_email (opcional)</Label>
              <Input type="email" value={form.external_email} onChange={(e) => setForm({ ...form, external_email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>external_name (opcional)</Label>
              <Input value={form.external_name} onChange={(e) => setForm({ ...form, external_name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving || !form.auth_user_id}>{saving ? "Salvando..." : "Criar vínculo"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>auth.users.id</TableHead>
                <TableHead>provider</TableHead><TableHead>issuer</TableHead><TableHead>subject</TableHead>
                <TableHead>external_email</TableHead><TableHead>status</TableHead><TableHead>linked_at</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Nenhum vínculo.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{userOf(r.auth_user_id)?.full_name ?? "—"}</TableCell>
                  <TableCell>{userOf(r.auth_user_id)?.email ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.auth_user_id}</TableCell>
                  <TableCell>{r.provider}</TableCell>
                  <TableCell className="text-xs">{r.issuer}</TableCell>
                  <TableCell className="font-mono text-xs">{r.subject}</TableCell>
                  <TableCell>{r.external_email ?? "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap">{new Date(r.linked_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    {r.status === "active" && <Button size="sm" variant="outline" onClick={() => revoke(r.id)}>Revogar</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
