import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const WHATSAPP_FROM = 'whatsapp:+14155238886';

// Novas solicitações -> Richard
const NEW_REQUEST_RECIPIENTS = ['whatsapp:+5519995922071', 'whatsapp:+551935736056'];
// Pedidos liberados para aprovação -> Priscila e Juliana
const APPROVAL_RECIPIENTS = ['whatsapp:+551935736057', 'whatsapp:+5519989618703'];

const TYPE_LABELS: Record<string, string> = {
  product: 'Produto',
  flight: 'Passagem Aérea',
  personalized_material: 'Material Personalizado',
  accommodation: 'Hospedagem',
  apostilas: 'Apostilas',
  internal_requisition: 'Requisição Interna',
  cleaning_product: 'Produto de Limpeza',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      throw new Error('Credenciais não configuradas');
    }

    const { solicitationId, requesterName, requestType, isUrgent, event } = await req.json();
    if (!solicitationId || !requesterName || !requestType) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const eventType = event === 'approval_ready' ? 'approval_ready' : 'new_request';
    const recipients = eventType === 'approval_ready' ? APPROVAL_RECIPIENTS : NEW_REQUEST_RECIPIENTS;

    const typeLabel = TYPE_LABELS[requestType] ?? requestType;
    const urgent = isUrgent ? ' 🚨 URGENTE' : '';
    const shortId = String(solicitationId).slice(0, 8);
    const title =
      eventType === 'approval_ready'
        ? `✅ *Pedido liberado para aprovação${urgent}*`
        : `🔔 *Nova solicitação${urgent}*`;
    const body = `${title}\n\n#${shortId} — ${typeLabel}\nSolicitante: ${requesterName}`;

    const results = [];
    for (const to of recipients) {
      const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TWILIO_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: WHATSAPP_FROM, Body: body }),
      });
      const text = await response.text();
      if (!response.ok) {
        console.error(`Twilio falhou [${response.status}] para ${to}: ${text}`);
        results.push({ to, ok: false, status: response.status, details: text });
      } else {
        results.push({ to, ok: true });
      }
    }

    const anyOk = results.some((r) => r.ok);
    return new Response(JSON.stringify({ event: eventType, results }), {
      status: anyOk ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-whatsapp error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
