import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Download,
  MessageCircle,
  Save,
  Upload,
  Building2,
  User,
  ListChecks,
  Eye,
  History,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";

import {
  addDaysISO,
  brl,
  buildWhatsappMessage,
  computeTotals,
  deleteQuote,
  emptyCompany,
  emptyQuote,
  fileToBase64,
  formatDateBR,
  itemTotal,
  lightenColor,
  loadCompany,
  loadQuotes,
  newItem,
  sanitizeFileName,
  saveCompany,
  statusLabel,
  upsertQuote,
  whatsappUrl,
  type Company,
  type ItemKind,
  type Quote,
  type QuoteItem,
  type QuoteStatus,
} from "@/lib/quote";
import { PdfDocument } from "@/components/quote/PdfDocument";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  component: QuoteApp,
  head: () => ({
    meta: [
      { title: "Orçamentos • Nuvem Comunicação" },
      {
        name: "description",
        content:
          "Crie orçamentos profissionais de produtos e serviços com geração de PDF, envio por WhatsApp e histórico salvo no navegador.",
      },
      { property: "og:title", content: "Orçamentos • Nuvem Comunicação" },
      {
        property: "og:description",
        content:
          "Crie orçamentos profissionais de produtos e serviços com geração de PDF, envio por WhatsApp e histórico salvo no navegador.",
      },
    ],
  }),
});

function QuoteApp() {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company>(emptyCompany());
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quote, setQuote] = useState<Quote>(() => emptyQuote());
  const [tab, setTab] = useState("empresa");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = loadCompany();
    const list = loadQuotes();
    setCompany(c);
    setQuotes(list);
    setQuote(emptyQuote(list));
  }, []);

  // Título da aba do navegador dinâmico: usa o nome da empresa cadastrada
  // pelo próprio usuário, em vez de um nome fixo no código. Cai para
  // "Orçamentos" genérico enquanto a empresa não tiver nome definido.
  useEffect(() => {
    document.title = company.name ? `Orçamentos • ${company.name}` : "Orçamentos";
  }, [company.name]);

  // Propaga a cor escolhida na aba Empresa para as variáveis CSS globais
  // (--brand-navy / --brand-sky / --brand-sky-soft), usadas em todo o app
  // (cabeçalho, botões, badges) — inclusive dentro de Dialogs (que renderizam
  // via portal fora da árvore React, por isso setamos no <html>).
  useEffect(() => {
    const navy = company.themeColor || "#0A192F";
    const root = document.documentElement.style;
    root.setProperty("--brand-navy", navy);
    root.setProperty("--brand-navy-2", lightenColor(navy, 15));
    root.setProperty("--brand-sky", lightenColor(navy, 55));
    root.setProperty("--brand-sky-soft", lightenColor(navy, 65));
    root.setProperty("--brand-slate", "#64748B");
    root.setProperty("--brand-surface", "#F8FAFC");
  }, [company.themeColor]);

  const totals = useMemo(() => computeTotals(quote), [quote]);
  const validUntil = addDaysISO(quote.issueDate, quote.validityDays);

  const patchQuote = (patch: Partial<Quote>) =>
    setQuote((q) => ({ ...q, ...patch }));
  const patchClient = (patch: Partial<Quote["client"]>) =>
    setQuote((q) => ({ ...q, client: { ...q.client, ...patch } }));

  const updateItem = (id: string, patch: Partial<QuoteItem>) =>
    setQuote((q) => ({
      ...q,
      items: q.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  const addItem = (kind: ItemKind) =>
    setQuote((q) => ({ ...q, items: [...q.items, newItem(kind)] }));
  const removeItem = (id: string) =>
    setQuote((q) => ({ ...q, items: q.items.filter((i) => i.id !== id) }));
  const duplicateItem = (id: string) =>
    setQuote((q) => {
      const src = q.items.find((i) => i.id === id);
      if (!src) return q;
      return {
        ...q,
        items: [...q.items, { ...src, id: crypto.randomUUID() }],
      };
    });

  const handleLogo = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo muito grande. Máximo 2MB.");
      return;
    }
    const b64 = await fileToBase64(file);
    setCompany((c) => ({ ...c, logo: b64 }));
  };

  const handleSaveCompany = () => {
    saveCompany(company);
    toast.success("Dados da empresa salvos!");
  };

  const handleSaveDraft = (status: QuoteStatus = "rascunho") => {
    const updated = { ...quote, status };
    const list = upsertQuote(updated);
    setQuotes(list);
    setQuote(updated);
    toast.success(
      status === "rascunho"
        ? "Rascunho salvo!"
        : `Orçamento marcado como ${statusLabel[status]}`,
    );
  };

  const handleNewQuote = () => {
    setQuote(emptyQuote(quotes));
    setTab("cliente");
    toast.info("Novo orçamento iniciado");
  };

  const handleLoadQuote = (q: Quote) => {
    setQuote(q);
    setHistoryOpen(false);
    setTab("cliente");
  };

  const handleDeleteQuote = (id: string) => {
    const list = deleteQuote(id);
    setQuotes(list);
    toast.success("Orçamento removido");
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const fileName = `Orcamento_${quote.number}_${sanitizeFileName(quote.client.name)}.pdf`;
    toast.loading("Gerando PDF...", { id: "pdf" });
    try {
      // html2pdf.js embute uma versão antiga do html2canvas que não entende
      // cores oklch() (usadas pelo tema Tailwind do app). html2canvas-pro é
      // um fork atualizado com suporte a oklch/lab/color(), então geramos o
      // canvas com ele e montamos o PDF manualmente com jsPDF.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(fileName);
      toast.success("PDF baixado!", { id: "pdf" });
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      toast.error("Erro ao gerar PDF", { id: "pdf" });
    }
  };

  const handleWhatsapp = () => {
    const msg = buildWhatsappMessage(quote, company, totals.total);
    const url = whatsappUrl(quote.client.phone, msg);
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="min-h-screen bg-[color:var(--brand-surface)] text-foreground">
      <Toaster position="top-right" richColors />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-[color:var(--brand-navy)] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-sky)] text-[color:var(--brand-navy)]">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold sm:text-base">
                Orçamentos
              </div>
              <div className="truncate text-[11px] text-[color:var(--brand-sky-soft)]">
                {company.name || "Configure sua empresa na aba Empresa"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setHistoryOpen(true)}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              <History className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </Button>
            <Button
              size="sm"
              onClick={handleNewQuote}
              className="bg-[color:var(--brand-sky)] text-[color:var(--brand-navy)] hover:bg-[color:var(--brand-sky-soft)]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Novo</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
        {/* Summary strip */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Orçamento" value={`#${quote.number}`} />
          <StatCard label="Itens" value={String(quote.items.length)} />
          <StatCard label="Cliente" value={quote.client.name || "—"} />
          <StatCard
            label="Total"
            value={brl(totals.total)}
            highlight
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white">
            <TabsTrigger value="empresa" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="cliente" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Cliente</span>
            </TabsTrigger>
            <TabsTrigger value="itens" className="gap-1.5">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Itens</span>
            </TabsTrigger>
            <TabsTrigger value="totais" className="gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Totais</span>
            </TabsTrigger>
          </TabsList>

          {/* Empresa */}
          <TabsContent value="empresa" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-[color:var(--brand-navy)]">
                  Dados da Empresa Emissora
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <div>
                    <Label className="mb-2 block">Logo</Label>
                    <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[color:var(--brand-sky)] bg-[color:var(--brand-surface)] p-2 text-center text-xs text-muted-foreground hover:bg-white">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt="Logo"
                          className="max-h-28 max-w-full object-contain"
                        />
                      ) : (
                        <>
                          <Upload className="mb-1 h-5 w-5 text-[color:var(--brand-sky)]" />
                          <span>Enviar logo</span>
                          <span className="text-[10px]">PNG/JPG, até 2MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogo(e.target.files?.[0])}
                      />
                    </label>
                    {company.logo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 w-full text-xs"
                        onClick={() => setCompany((c) => ({ ...c, logo: "" }))}
                      >
                        Remover logo
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome / Razão Social">
                      <Input
                        value={company.name}
                        onChange={(e) =>
                          setCompany((c) => ({ ...c, name: e.target.value }))
                        }
                        placeholder="Nuvem Comunicação"
                      />
                    </Field>
                    <Field label="CNPJ / CPF">
                      <Input
                        value={company.document}
                        onChange={(e) =>
                          setCompany((c) => ({ ...c, document: e.target.value }))
                        }
                        placeholder="00.000.000/0000-00"
                      />
                    </Field>
                    <Field label="Telefone / WhatsApp">
                      <Input
                        value={company.phone}
                        onChange={(e) =>
                          setCompany((c) => ({ ...c, phone: e.target.value }))
                        }
                        placeholder="(11) 99999-9999"
                      />
                    </Field>
                    <Field label="E-mail">
                      <Input
                        type="email"
                        value={company.email}
                        onChange={(e) =>
                          setCompany((c) => ({ ...c, email: e.target.value }))
                        }
                        placeholder="contato@empresa.com"
                      />
                    </Field>
                    <Field label="Website / Redes">
                      <Input
                        value={company.website}
                        onChange={(e) =>
                          setCompany((c) => ({ ...c, website: e.target.value }))
                        }
                        placeholder="www.suaempresa.com"
                      />
                    </Field>
                    <Field label="Endereço completo">
                      <Input
                        value={company.address}
                        onChange={(e) =>
                          setCompany((c) => ({ ...c, address: e.target.value }))
                        }
                        placeholder="Rua, número, cidade — UF"
                      />
                    </Field>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Cor do orçamento">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={company.themeColor}
                        onChange={(e) =>
                          setCompany((c) => ({ ...c, themeColor: e.target.value }))
                        }
                        className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
                        aria-label="Selecionar cor do orçamento"
                      />
                      <span className="text-sm text-muted-foreground">
                        {company.themeColor}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() =>
                          setCompany((c) => ({ ...c, themeColor: "#0A192F" }))
                        }
                      >
                        Restaurar padrão
                      </Button>
                    </div>
                  </Field>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Chave PIX">
                    <Input
                      value={company.pix}
                      onChange={(e) =>
                        setCompany((c) => ({ ...c, pix: e.target.value }))
                      }
                      placeholder="email, CPF/CNPJ, telefone ou chave aleatória"
                    />
                  </Field>
                  <Field label="Dados Bancários">
                    <Textarea
                      rows={3}
                      value={company.bank}
                      onChange={(e) =>
                        setCompany((c) => ({ ...c, bank: e.target.value }))
                      }
                      placeholder="Banco 000 — Ag 0000 — CC 00000-0&#10;Titular: ..."
                    />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveCompany}
                    className="bg-[color:var(--brand-navy)] text-white hover:bg-[color:var(--brand-navy)]/90"
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    Salvar dados da empresa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cliente */}
          <TabsContent value="cliente" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-[color:var(--brand-navy)]">
                  Dados do Orçamento e Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Número">
                    <Input
                      value={quote.number}
                      onChange={(e) => patchQuote({ number: e.target.value })}
                    />
                  </Field>
                  <Field label="Data de emissão">
                    <Input
                      type="date"
                      value={quote.issueDate}
                      onChange={(e) => patchQuote({ issueDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Validade (dias)">
                    <Select
                      value={String(quote.validityDays)}
                      onValueChange={(v) =>
                        patchQuote({ validityDays: parseInt(v, 10) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[7, 15, 30, 45, 60].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} dias
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="text-xs text-muted-foreground">
                  Válido até <strong>{formatDateBR(validUntil)}</strong>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome / Razão Social">
                    <Input
                      value={quote.client.name}
                      onChange={(e) => patchClient({ name: e.target.value })}
                      placeholder="Cliente"
                    />
                  </Field>
                  <Field label="CPF / CNPJ">
                    <Input
                      value={quote.client.document}
                      onChange={(e) => patchClient({ document: e.target.value })}
                    />
                  </Field>
                  <Field label="E-mail">
                    <Input
                      type="email"
                      value={quote.client.email}
                      onChange={(e) => patchClient({ email: e.target.value })}
                    />
                  </Field>
                  <Field label="Telefone / WhatsApp">
                    <Input
                      value={quote.client.phone}
                      onChange={(e) => patchClient({ phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Endereço de entrega / prestação">
                      <Input
                        value={quote.client.address}
                        onChange={(e) => patchClient({ address: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setTab("itens")}>Continuar para itens</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Itens */}
          <TabsContent value="itens" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[color:var(--brand-navy)]">
                  Itens do Orçamento
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addItem("servico")}
                    className="border-[color:var(--brand-sky)] text-[color:var(--brand-navy)]"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Serviço
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addItem("produto")}
                    className="bg-[color:var(--brand-navy)] text-white hover:bg-[color:var(--brand-navy)]/90"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quote.items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhum item. Adicione um produto ou serviço acima.
                    </div>
                  )}
                  {quote.items.map((it, idx) => (
                    <ItemRow
                      key={it.id}
                      index={idx}
                      item={it}
                      onChange={(patch) => updateItem(it.id, patch)}
                      onRemove={() => removeItem(it.id)}
                      onDuplicate={() => duplicateItem(it.id)}
                    />
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <MiniStat
                    label="Subtotal Produtos"
                    value={brl(totals.subtotalProdutos)}
                  />
                  <MiniStat
                    label="Subtotal Serviços"
                    value={brl(totals.subtotalServicos)}
                  />
                  <MiniStat label="Total Bruto" value={brl(totals.subtotal)} highlight />
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setTab("totais")}>Continuar</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Totais */}
          <TabsContent value="totais" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[color:var(--brand-navy)]">
                    Condições Financeiras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Desconto geral">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={quote.generalDiscount}
                          onChange={(e) =>
                            patchQuote({
                              generalDiscount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <Select
                          value={quote.generalDiscountMode}
                          onValueChange={(v) =>
                            patchQuote({
                              generalDiscountMode: v as "valor" | "percent",
                            })
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valor">R$</SelectItem>
                            <SelectItem value="percent">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Field>
                    <Field label="Frete / Deslocamento (R$)">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={quote.shipping}
                        onChange={(e) =>
                          patchQuote({ shipping: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </Field>
                    <Field label="Formas de pagamento aceitas">
                      <Input
                        value={quote.paymentMethods}
                        onChange={(e) =>
                          patchQuote({ paymentMethods: e.target.value })
                        }
                        placeholder="PIX, Cartão, Boleto..."
                      />
                    </Field>
                    <Field label="Prazo de entrega / execução">
                      <Input
                        value={quote.deliveryTerm}
                        onChange={(e) =>
                          patchQuote({ deliveryTerm: e.target.value })
                        }
                        placeholder="Ex: 10 dias úteis"
                      />
                    </Field>
                  </div>
                  <Field label="Observações gerais / Garantia / Termos">
                    <Textarea
                      rows={4}
                      value={quote.notes}
                      onChange={(e) => patchQuote({ notes: e.target.value })}
                      placeholder="Termos, garantias, informações adicionais..."
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={quote.status}
                      onValueChange={(v) =>
                        patchQuote({ status: v as QuoteStatus })
                      }
                    >
                      <SelectTrigger className="max-w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusLabel) as QuoteStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </CardContent>
              </Card>

              <Card className="border-[color:var(--brand-sky)]/40">
                <CardHeader>
                  <CardTitle className="text-[color:var(--brand-navy)]">
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <SummaryRow label="Produtos" value={brl(totals.subtotalProdutos)} />
                  <SummaryRow label="Serviços" value={brl(totals.subtotalServicos)} />
                  <SummaryRow label="Subtotal" value={brl(totals.subtotal)} />
                  {totals.generalDiscountValue > 0 && (
                    <SummaryRow
                      label={`Desconto${quote.generalDiscountMode === "percent" ? ` (${quote.generalDiscount}%)` : ""}`}
                      value={`- ${brl(totals.generalDiscountValue)}`}
                    />
                  )}
                  {totals.shipping > 0 && (
                    <SummaryRow label="Frete" value={brl(totals.shipping)} />
                  )}
                  <div className="mt-3 rounded-xl bg-[color:var(--brand-sky-soft)]/50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-navy)]">
                      Valor Total
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-[color:var(--brand-navy)]">
                      {brl(totals.total)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <Button
                      onClick={() => setPreviewOpen(true)}
                      className="bg-[color:var(--brand-navy)] text-white hover:bg-[color:var(--brand-navy)]/90"
                    >
                      <Eye className="mr-1.5 h-4 w-4" /> Pré-visualizar PDF
                    </Button>
                    <Button
                      onClick={handleDownloadPdf}
                      variant="outline"
                      className="border-[color:var(--brand-sky)] text-[color:var(--brand-navy)]"
                    >
                      <Download className="mr-1.5 h-4 w-4" /> Baixar PDF
                    </Button>
                    <Button
                      onClick={handleWhatsapp}
                      variant="outline"
                      className="border-[color:var(--brand-sky)] text-[color:var(--brand-navy)]"
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar por WhatsApp
                    </Button>
                    <Button
                      onClick={() => handleSaveDraft(quote.status)}
                      variant="ghost"
                      className="text-[color:var(--brand-navy)]"
                    >
                      <Save className="mr-1.5 h-4 w-4" /> Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Hidden PDF source, rendered off-screen */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <PdfDocument ref={pdfRef} company={company} quote={quote} />
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-[860px] overflow-hidden p-0">
          <DialogHeader className="border-b bg-[color:var(--brand-navy)] px-4 py-3 text-white">
            <DialogTitle className="text-white">
              Pré-visualização — Orçamento #{quote.number}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto bg-[color:var(--brand-surface)] p-4">
            <div className="mx-auto origin-top scale-[0.88] shadow-xl sm:scale-100">
              <PdfDocument company={company} quote={quote} />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t p-3">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsapp}
              className="border-[color:var(--brand-sky)]"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
            </Button>
            <Button
              onClick={handleDownloadPdf}
              className="bg-[color:var(--brand-navy)] text-white hover:bg-[color:var(--brand-navy)]/90"
            >
              <Download className="mr-1.5 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[color:var(--brand-navy)]">
              Histórico de Orçamentos
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-auto">
            {quotes.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum orçamento salvo ainda.
              </div>
            )}
            {quotes.map((q) => {
              const t = computeTotals(q);
              return (
                <div
                  key={q.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-white p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[color:var(--brand-navy)]">
                        #{q.number}
                      </span>
                      <StatusBadge status={q.status} />
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {q.client.name || "Sem cliente"} •{" "}
                      {formatDateBR(q.issueDate)} • {brl(t.total)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadQuote(q)}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteQuote(q.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-3 " +
        (highlight
          ? "border-[color:var(--brand-sky)] bg-[color:var(--brand-sky-soft)]/40"
          : "border-border bg-white")
      }
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "mt-1 truncate text-lg font-bold " +
          (highlight
            ? "text-[color:var(--brand-navy)]"
            : "text-[color:var(--brand-navy)]")
        }
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (highlight
          ? "border-[color:var(--brand-sky)] bg-[color:var(--brand-sky-soft)]/30"
          : "border-border bg-[color:var(--brand-surface)]")
      }
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-bold text-[color:var(--brand-navy)]">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-[color:var(--brand-navy)]">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, string> = {
    rascunho: "bg-slate-100 text-slate-700 border-slate-300",
    enviado:
      "bg-[color:var(--brand-sky-soft)]/40 text-[color:var(--brand-navy)] border-[color:var(--brand-sky)]",
    aprovado: "bg-emerald-100 text-emerald-800 border-emerald-300",
    recusado: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <Badge variant="outline" className={"text-[10px] " + map[status]}>
      {statusLabel[status]}
    </Badge>
  );
}

function ItemRow({
  index,
  item,
  onChange,
  onRemove,
  onDuplicate,
}: {
  index: number;
  item: QuoteItem;
  onChange: (patch: Partial<QuoteItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const total = itemTotal(item);
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">
            #{index + 1}
          </span>
          <Select
            value={item.kind}
            onValueChange={(v) => onChange({ kind: v as ItemKind })}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="produto">Produto</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
            </SelectContent>
          </Select>
          <Badge
            variant="outline"
            className={
              "text-[10px] " +
              (item.kind === "servico"
                ? "border-[color:var(--brand-sky)] bg-[color:var(--brand-sky-soft)]/30 text-[color:var(--brand-navy)]"
                : "border-[color:var(--brand-navy)] bg-[color:var(--brand-navy)] text-white")
            }
          >
            {item.kind === "servico" ? "Serviço" : "Produto"}
          </Badge>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" onClick={onDuplicate} title="Duplicar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onRemove} title="Remover">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-12">
          <Field label="Descrição">
            <Input
              value={item.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder={
                item.kind === "servico"
                  ? "Ex: Consultoria em campanha digital"
                  : "Ex: Banner impresso 90x120cm"
              }
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Qtd">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.quantity}
              onChange={(e) =>
                onChange({ quantity: parseFloat(e.target.value) || 0 })
              }
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Unidade">
            <Input
              value={item.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              placeholder="un, hrs, m²"
            />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Valor Unitário (R$)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.unitPrice}
              onChange={(e) =>
                onChange({ unitPrice: parseFloat(e.target.value) || 0 })
              }
            />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Desconto">
            <div className="flex gap-1">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.discount}
                onChange={(e) =>
                  onChange({ discount: parseFloat(e.target.value) || 0 })
                }
              />
              <Select
                value={item.discountMode}
                onValueChange={(v) =>
                  onChange({ discountMode: v as "valor" | "percent" })
                }
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">R$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Total">
            <div className="flex h-9 items-center justify-end rounded-md border border-input bg-[color:var(--brand-surface)] px-3 font-bold text-[color:var(--brand-navy)]">
              {brl(total)}
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
