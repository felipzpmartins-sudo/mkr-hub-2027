import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Missing token' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Invalid token' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Only super_admin allowed
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isSuper = roles?.some((r: any) => r.role === 'super_admin');
    if (!isSuper) return json({ error: 'Forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list_users') {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const { data: allRoles } = await admin.from('user_roles').select('user_id, role');
      const { data: profiles } = await admin.from('profiles').select('user_id, full_name');
      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: profiles?.find((p: any) => p.user_id === u.id)?.full_name ?? null,
        roles: allRoles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) ?? [],
      }));
      return json({ users });
    }

    if (action === 'delete_user') {
      const targetId = body.user_id as string;
      if (!targetId) return json({ error: 'user_id required' }, 400);
      if (targetId === user.id) return json({ error: 'Não pode excluir a si mesmo' }, 400);
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'reset_password') {
      const targetId = body.user_id as string;
      const newPassword = (body.new_password as string) || '12345678';
      if (!targetId) return json({ error: 'user_id required' }, 400);
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        password: newPassword,
        user_metadata: { must_reset_password: true },
      });
      if (error) throw error;
      return json({ success: true, temp_password: newPassword });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message ?? 'Error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
