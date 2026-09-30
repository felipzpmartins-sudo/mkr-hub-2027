import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ExternalLink, FileText, Package, DollarSign, Loader2, FileSpreadsheet, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PurchaseReport {
  id: string;
  created_at: string;
  requester_name: string;
  requester_phone: string;
  request_type: string;
  product_name: string | null;
  flight_origin: string | null;
  flight_destination: string | null;
  material_type: string | null;
  general_description: string | null;
  approval_status: string;
  status: string;
  estimated_arrival_date: string | null;
  actual_delivery_date: string | null;
  delivery_observations: string | null;
  invoice_number: string | null;
  invoice_file_path: string | null;
  invoice_file_name: string | null;
  released_at: string | null;
  approved_quote_value: number | null;
  approved_quote_supplier: string | null;
  approved_quote_link: string | null;
}

const requestTypeLabels: Record<string, string> = {
  product: "Produto",
  flight: "Passagem Aérea",
  personalized_material: "Material Personalizado",
  accommodation: "Hospedagem",
  apostilas: "Apostilas",
  cleaning_product: "Produto de Limpeza",
};

export const PurchasesReport = () => {
  const [purchases, setPurchases] = useState<PurchaseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      // Get all solicitations that are purchased or delivered
      const { data: solData, error } = await supabase
        .from('solicitations')
        .select('*')
        .in('approval_status', ['approved_released', 'delivered'])
        .order('released_at', { ascending: false });

      if (error) throw error;

      // For each solicitation, find the approved quote
      const purchasesWithQuotes = await Promise.all(
        (solData || []).map(async (sol) => {
          let approvedQuoteValue: number | null = null;
          let approvedQuoteSupplier: string | null = null;
          let approvedQuoteLink: string | null = null;

          // Get approved quote from approvals
          const { data: approvals } = await supabase
            .from('approvals')
            .select('selected_quote_id')
            .eq('solicitation_id', sol.id)
            .eq('status', 'approved')
            .not('selected_quote_id', 'is', null);

          if (approvals && approvals.length > 0) {
            const voteCounts: Record<string, number> = {};
            approvals.forEach(a => {
              if (a.selected_quote_id) {
                voteCounts[a.selected_quote_id] = (voteCounts[a.selected_quote_id] || 0) + 1;
              }
            });
            const topQuoteId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

            if (topQuoteId) {
              const { data: quote } = await supabase
                .from('quotes')
                .select('value, supplier_name, file_path')
                .eq('id', topQuoteId)
                .single();
              if (quote) {
                approvedQuoteValue = quote.value;
                approvedQuoteSupplier = quote.supplier_name;
                approvedQuoteLink = quote.file_path?.startsWith('http') ? quote.file_path : null;
              }
            }
          }

          return {
            ...sol,
            approved_quote_value: approvedQuoteValue,
            approved_quote_supplier: approvedQuoteSupplier,
            approved_quote_link: approvedQuoteLink,
          } as PurchaseReport;
        })
      );

      setPurchases(purchasesWithQuotes);
    } catch (error) {
      console.error("Erro ao carregar compras:", error);
      toast.error("Erro ao carregar relatório de compras");
    } finally {
      setLoading(false);
    }
  };

  const getItemTitle = (p: PurchaseReport) => {
    if (p.request_type === "product") return p.product_name || "Produto";
    if (p.request_type === "flight") return `${p.flight_origin} → ${p.flight_destination}`;
    if (p.request_type === "personalized_material") return p.material_type || "Material";
    if (p.request_type === "accommodation") return "Hospedagem";
    return "—";
  };

  const downloadInvoice = async (p: PurchaseReport) => {
    if (!p.invoice_file_path) return;
    try {
      const { data, error } = await supabase.storage
        .from('solicitation-attachments')
        .download(p.invoice_file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = p.invoice_file_name || 'nota-fiscal';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar nota fiscal:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const filtered = purchases.filter((p) =>
    p.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.product_name && p.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.invoice_number && p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalValue = filtered.reduce((sum, p) => sum + (p.approved_quote_value || 0), 0);

  const statusLabel = (p: PurchaseReport) =>
    p.approval_status === "delivered" || p.status === "delivered" ? "Entregue" : "Em andamento";

  const buildRows = () =>
    filtered.map((p) => ({
      "Data Liberação": p.released_at ? format(new Date(p.released_at), "dd/MM/yyyy", { locale: ptBR }) : "—",
      Solicitante: p.requester_name,
      Tipo: requestTypeLabels[p.request_type] || p.request_type,
      Item: getItemTitle(p),
      Fornecedor: p.approved_quote_supplier || "—",
      "Valor Aprovado (R$)": p.approved_quote_value ?? 0,
      "Nota Fiscal": p.invoice_number || "—",
      "Previsão Entrega": p.estimated_arrival_date ? formatDateOnly(p.estimated_arrival_date) : "—",
      "Data Entrega": p.actual_delivery_date ? formatDateOnly(p.actual_delivery_date) : "—",
      Observações: p.delivery_observations || "—",
      Status: statusLabel(p),
    }));

  const exportExcel = () => {
    const rows = buildRows();
    if (rows.length === 0) {
      toast.error("Nenhuma compra para exportar");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 30 }, { wch: 24 },
      { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 14 },
    ];
    // Total row
    XLSX.utils.sheet_add_aoa(
      ws,
      [[], ["", "", "", "", "TOTAL", totalValue]],
      { origin: -1 }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    XLSX.writeFile(wb, `relatorio-compras-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Relatório Excel gerado!");
  };

  const exportPDF = () => {
    const rows = buildRows();
    if (rows.length === 0) {
      toast.error("Nenhuma compra para exportar");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Central de Compras — Relatório de Compras", 40, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}  •  ${rows.length} compra(s)  •  Total: R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      40,
      50
    );

    autoTable(doc, {
      startY: 84,
      head: [[
        "Data Lib.", "Solicitante", "Tipo", "Item", "Fornecedor",
        "Valor (R$)", "NF", "Entrega", "Status",
      ]],
      body: rows.map((r) => [
        r["Data Liberação"],
        r.Solicitante,
        r.Tipo,
        r.Item,
        r.Fornecedor,
        (r["Valor Aprovado (R$)"] as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        r["Nota Fiscal"],
        r["Data Entrega"] !== "—" ? r["Data Entrega"] : r["Previsão Entrega"],
        r.Status,
      ]),
      foot: [[
        "", "", "", "", "TOTAL",
        totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        "", "", "",
      ]],
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 60 },
        3: { cellWidth: 140 },
        5: { halign: "right", cellWidth: 70 },
        8: { cellWidth: 70 },
      },
      margin: { left: 24, right: 24 },
      didDrawPage: () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Página ${pageNum} de ${pageCount}`, pageWidth - 40, pageHeight - 16, { align: "right" });
      },
    });

    doc.save(`relatorio-compras-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Relatório PDF gerado!");
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entregues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {purchases.filter(p => p.approval_status === 'delivered' || p.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Aprovado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Export */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, item ou nota fiscal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar relatório
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Liberação</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Valor Aprovado</TableHead>
              <TableHead>Nota Fiscal</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Nenhuma compra encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    {p.released_at
                      ? format(new Date(p.released_at), "dd/MM/yy", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {p.requester_name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {requestTypeLabels[p.request_type] || p.request_type}
                  </TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">
                    {getItemTitle(p)}
                  </TableCell>
                  <TableCell>
                    {p.approved_quote_value ? (
                      <span className="font-semibold text-green-600 text-sm">
                        R$ {p.approved_quote_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.invoice_number ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{p.invoice_number}</span>
                        {p.invoice_file_path && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => downloadInvoice(p)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.actual_delivery_date
                      ? formatDateOnly(p.actual_delivery_date, "dd/MM/yy")
                      : p.estimated_arrival_date
                        ? <span className="text-muted-foreground">Prev: {formatDateOnly(p.estimated_arrival_date, "dd/MM/yy")}</span>
                        : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.approval_status === 'delivered' || p.status === 'delivered' ? "default" : "secondary"}
                      className={
                        p.approval_status === 'delivered' || p.status === 'delivered'
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }
                    >
                      {p.approval_status === 'delivered' || p.status === 'delivered' ? "Entregue" : "Em andamento"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Observations */}
      {filtered.some(p => p.delivery_observations) && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">Observações de Entrega</h3>
          {filtered.filter(p => p.delivery_observations).map(p => (
            <Card key={p.id} className="border-muted">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{getItemTitle(p)} — {p.requester_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{p.delivery_observations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
