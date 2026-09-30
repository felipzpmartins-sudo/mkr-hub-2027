import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const testUsers = [
  {
    email: 'aprovador.teste@central-compras.test.invalid',
    password: '123456',
    full_name: 'Aprovador Teste',
    role: 'requisition_approver',
  },
  {
    email: 'estoque.teste@central-compras.test.invalid',
    password: '123456',
    full_name: 'Estoque Teste',
    role: 'stock',
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Require caller to be admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const isAdmin = callerRoles?.some((r: any) => r.role === 'admin' || r.role === 'super_admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];
    for (const u of testUsers) {
      // Try to create; if exists, fetch
      let userId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (createErr) {
        // Probably already exists — find by listing
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users.find((x: any) => x.email?.toLowerCase() === u.email.toLowerCase());
        if (existing) {
          userId = existing.id;
          // Reset password to ensure known credentials
          await admin.auth.admin.updateUserById(existing.id, { password: u.password });
        } else {
          results.push({ email: u.email, ok: false, error: createErr.message });
          continue;
        }
      } else {
        userId = created.user!.id;
      }

      // Ensure profile exists
      await admin.from('profiles').upsert(
        { user_id: userId, full_name: u.full_name },
        { onConflict: 'user_id' }
      );

      // Remove other roles for this test user and set only the intended one
      await admin.from('user_roles').delete().eq('user_id', userId);
      await admin.from('user_roles').insert({ user_id: userId, role: u.role });

      results.push({ email: u.email, ok: true, user_id: userId, role: u.role });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
