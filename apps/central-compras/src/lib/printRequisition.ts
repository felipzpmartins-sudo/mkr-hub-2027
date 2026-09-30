import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrintItem {
  name?: string;
  quantity?: number | string;
  observations?: string;
}

export interface PrintableRequisition {
  id: string;
  created_at?: string | null;
  requester_name?: string | null;
  contact_number?: string | null;
  contact_email?: string | null;
  requesting_sector?: string | null;
  requisition_date?: string | null;
  return_deadline?: string | null;
  usage_purpose?: string | null;
  items_list?: PrintItem[] | any;
  responsibility_accepted?: boolean | null;
  requester_signature_name?: string | null;
  requester_signature_data?: string | null;
  allocation_location?: string | null;
  allocation_location_other?: string | null;
}

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

const fmtDateTime = (d?: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return d;
  }
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function printRequisition(sol: PrintableRequisition) {
  const items: PrintItem[] = Array.isArray(sol.items_list) ? sol.items_list : [];
  const location =
    sol.allocation_location === "Outro"
      ? sol.allocation_location_other || "Outro"
      : sol.allocation_location || "—";

  const itemsHtml = items.length
    ? `<table class="items">
        <thead>
          <tr><th style="width:60%">Produto</th><th style="width:15%">Qtd</th><th>Observações</th></tr>
        </thead>
        <tbody>
          ${items
            .map(
              (it) => `
            <tr>
              <td>${escapeHtml(String(it.name ?? "—"))}</td>
              <td>${escapeHtml(String(it.quantity ?? "—"))}</td>
              <td>${escapeHtml(String(it.observations ?? ""))}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="muted">Nenhum item listado.</p>`;

  const signatureImg = sol.requester_signature_data
    ? `<img src="${sol.requester_signature_data}" alt="Assinatura digital" />`
    : `<div class="sig-placeholder">—</div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Requisição Interna - ${escapeHtml(sol.id.slice(0, 8))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #999; text-transform: uppercase; letter-spacing: 0.5px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; }
  .meta { text-align: right; font-size: 11px; color: #444; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 6px; }
  .field label { display: block; font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 0.4px; }
  .field .val { font-weight: 600; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.items th, table.items td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  table.items th { background: #f0f0f0; font-size: 11px; }
  .term { border: 1.5px solid #333; padding: 10px 12px; margin-top: 8px; background: #fafafa; }
  .term p { margin: 4px 0; }
  .accepted { color: #0a7d2c; font-weight: 700; }
  .not-accepted { color: #b40000; font-weight: 700; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; }
  .sig-box { text-align: center; }
  .sig-box .line { border-bottom: 1px solid #111; height: 70px; display: flex; align-items: flex-end; justify-content: center; padding: 4px; }
  .sig-box .line img { max-height: 66px; max-width: 100%; }
  .sig-box .caption { margin-top: 6px; font-size: 11px; }
  .sig-box .name { font-weight: 700; margin-top: 2px; }
  .sig-placeholder { color: #999; }
  .muted { color: #666; font-style: italic; }
  .footer { margin-top: 28px; padding-top: 8px; border-top: 1px dashed #999; font-size: 10px; color: #666; text-align: center; }
  @media print {
    body { margin: 16mm; }
    .no-print { display: none; }
  }
  .print-bar { position: fixed; top: 8px; right: 8px; }
  .print-bar button { padding: 8px 14px; background: #111; color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 12px; }
</style>
</head>
<body>
  <div class="print-bar no-print">
    <button onclick="window.print()">Imprimir</button>
  </div>

  <div class="header">
    <div>
      <h1>Requisição de Produtos Internos</h1>
      <div style="color:#555">Termo de Responsabilidade e Retirada</div>
    </div>
    <div class="meta">
      <div><strong>Protocolo:</strong> ${escapeHtml(sol.id.slice(0, 8).toUpperCase())}</div>
      <div><strong>Emitido em:</strong> ${fmtDateTime(sol.created_at)}</div>
    </div>
  </div>

  <h2>Dados do Solicitante</h2>
  <div class="grid">
    <div class="field"><label>Solicitante</label><div class="val">${escapeHtml(sol.requester_name || "—")}</div></div>
    <div class="field"><label>Setor</label><div class="val">${escapeHtml(sol.requesting_sector || "—")}</div></div>
    <div class="field"><label>Contato</label><div class="val">${escapeHtml(sol.contact_number || "—")}</div></div>
    <div class="field"><label>E-mail</label><div class="val">${escapeHtml(sol.contact_email || "—")}</div></div>
    <div class="field"><label>Data da Solicitação</label><div class="val">${fmtDate(sol.requisition_date || sol.created_at)}</div></div>
    <div class="field"><label>Prazo para Devolução</label><div class="val">${fmtDate(sol.return_deadline)}</div></div>
    <div class="field"><label>Local de Alocação</label><div class="val">${escapeHtml(location)}</div></div>
  </div>

  ${sol.usage_purpose ? `<h2>Finalidade de Uso</h2><p>${escapeHtml(sol.usage_purpose)}</p>` : ""}

  <h2>Produtos Requisitados</h2>
  ${itemsHtml}

  <h2>Termo de Responsabilidade</h2>
  <div class="term">
    <p>O solicitante declara estar ciente de sua responsabilidade pela utilização, conservação e devolução dos produtos requisitados, comprometendo-se a devolvê-los em perfeitas condições e dentro do prazo estabelecido acima. Após o vencimento do prazo de devolução, será gerado um alerta automático no sistema.</p>
    <p>${sol.responsibility_accepted ? '<span class="accepted">✔ Termo aceito digitalmente pelo solicitante no sistema</span>' : '<span class="not-accepted">✘ Termo não aceito digitalmente</span>'}</p>
  </div>

  <h2>Assinaturas</h2>
  <div class="signatures">
    <div class="sig-box">
      <div class="line">${signatureImg}</div>
      <div class="caption">Assinatura digital registrada no sistema</div>
      <div class="name">${escapeHtml(sol.requester_signature_name || sol.requester_name || "—")}</div>
      <div class="caption">Solicitante</div>
    </div>
    <div class="sig-box">
      <div class="line"></div>
      <div class="caption">Assinatura física no ato da retirada</div>
      <div class="name">${escapeHtml(sol.requester_signature_name || sol.requester_name || "—")}</div>
      <div class="caption">Solicitante — confirmação de recebimento</div>
    </div>
  </div>

  <div class="signatures" style="margin-top:24px">
    <div class="sig-box">
      <div class="line"></div>
      <div class="caption">Responsável pela entrega (Estoque)</div>
    </div>
    <div class="sig-box">
      <div class="line"></div>
      <div class="caption">Data / Hora da retirada</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado pelo sistema — Protocolo ${escapeHtml(sol.id)}
  </div>

  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 300); });</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
