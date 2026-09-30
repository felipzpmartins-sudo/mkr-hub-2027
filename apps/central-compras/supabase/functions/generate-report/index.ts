import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  requestType?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get filters from request
    const { startDate, endDate, status, requestType }: ReportFilters = await req.json();

    console.log('Generating report with filters:', { startDate, endDate, status, requestType });

    // Build query
    let query = supabaseClient
      .from('solicitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (requestType && requestType !== 'all') {
      query = query.eq('request_type', requestType);
    }

    const { data: solicitations, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Found ${solicitations?.length || 0} solicitations`);

    // Generate CSV
    const csvHeaders = [
      'ID',
      'Data Criação',
      'Solicitante',
      'Email',
      'Tipo',
      'Descrição',
      'Status',
      'Previsão Entrega',
      'Data Entrega Real',
      'Observações Admin'
    ];

    const csvRows = solicitations?.map(s => {
      const type = s.request_type === 'product' ? 'Produto' :
                   s.request_type === 'flight' ? 'Passagem' : 'Material';
      
      const description = s.request_type === 'product' ? s.product_name :
                          s.request_type === 'flight' ? `${s.flight_origin} → ${s.flight_destination}` :
                          s.material_type;

      const statusMap: Record<string, string> = {
        pending: 'Pendente',
        approved: 'Aprovado',
        rejected: 'Reprovado',
        purchasing: 'Em Compra',
        delivered: 'Entregue'
      };

      return [
        s.id.slice(0, 8),
        new Date(s.created_at).toLocaleDateString('pt-BR'),
        s.requester_name,
        s.requester_email,
        type,
        description || '-',
        statusMap[s.status] || s.status,
        s.estimated_arrival_date ? new Date(s.estimated_arrival_date).toLocaleDateString('pt-BR') : '-',
        s.actual_delivery_date ? new Date(s.actual_delivery_date).toLocaleDateString('pt-BR') : '-',
        s.admin_justification || '-'
      ];
    }) || [];

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    console.log('CSV generated successfully');

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-compras-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});