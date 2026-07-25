import { supabase } from "@/integrations/supabase/client";

export type ItemKind = "produto" | "servico";
export type DiscountMode = "valor" | "percent";
export type QuoteStatus = "rascunho" | "enviado" | "aprovado" | "recusado";

export interface Company {
  logo: string; // base64
  name: string;
  document: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  pix: string;
  bank: string;
  themeColor: string; // cor principal do orçamento (hex), ex: "#0A192F"
}

export interface Client {
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
}

export interface QuoteItem {
  id: string;
  kind: ItemKind;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountMode: DiscountMode;
}

export interface Quote {
  id: string;
  number: string;
  issueDate: string; // ISO date
  validityDays: number;
  client: Client;
  items: QuoteItem[];
  generalDiscount: number;
  generalDiscountMode: DiscountMode;
  shipping: number;
  paymentMethods: string;
  deliveryTerm: string;
  notes: string;
  status: QuoteStatus;
  updatedAt: number;
}

export const emptyCompany = (): Company => ({
  logo: "",
  name: "",
  document: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  pix: "",
  bank: "",
  themeColor: "#0A192F",
});

export const emptyClient = (): Client => ({
  name: "",
  document: "",
  email: "",
  phone: "",
  address: "",
});

export const newItem = (kind: ItemKind = "produto"): QuoteItem => ({
  id: crypto.randomUUID(),
  kind,
  description: "",
  quantity: 1,
  unit: kind === "servico" ? "hrs" : "un",
  unitPrice: 0,
  discount: 0,
  discountMode: "valor",
});

export const nextQuoteNumber = (existing: Quote[]): string => {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const nums = existing
    .map((q) => q.number)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
};

export const emptyQuote = (existing: Quote[] = []): Quote => ({
  id: crypto.randomUUID(),
  number: nextQuoteNumber(existing),
  issueDate: new Date().toISOString().slice(0, 10),
  validityDays: 15,
  client: emptyClient(),
  items: [newItem("produto")],
  generalDiscount: 0,
  generalDiscountMode: "valor",
  shipping: 0,
  paymentMethods: "PIX, Cartão de Crédito, Boleto",
  deliveryTerm: "",
  notes: "",
  status: "rascunho",
  updatedAt: Date.now(),
});

// ── Format helpers ────────────────────────────────────────────
export const brl = (value: number): string =>
  (isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const formatDateBR = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + (days || 0));
  return d.toISOString().slice(0, 10);
};

// ── Color helpers ─────────────────────────────────────────────
// Clareia uma cor hex em `percent` (0-100). Usado para derivar tons
// de destaque (ex: "sky") a partir da cor principal escolhida pelo usuário.
export const lightenColor = (hex: string, percent: number): string => {
  const clean = (hex || "#0A192F").replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(normalized, 16) || 0x0a192f;
  const amt = Math.round((percent / 100) * 255);
  const r = Math.min(255, (num >> 16) + amt);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const b = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Escolhe branco ou o próprio navy como cor de texto sobre a cor principal,
// baseado no brilho aproximado da cor (para manter contraste legível).
export const contrastTextColor = (hex: string): string => {
  const clean = (hex || "#0A192F").replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(normalized, 16) || 0x0a192f;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#0A192F" : "#FFFFFF";
};

// ── Calculations ──────────────────────────────────────────────
export const itemTotal = (it: QuoteItem): number => {
  const gross = (it.quantity || 0) * (it.unitPrice || 0);
  const disc =
    it.discountMode === "percent"
      ? (gross * (it.discount || 0)) / 100
      : it.discount || 0;
  return Math.max(0, gross - disc);
};

export const computeTotals = (q: Quote) => {
  const subtotalProdutos = q.items
    .filter((i) => i.kind === "produto")
    .reduce((s, i) => s + itemTotal(i), 0);
  const subtotalServicos = q.items
    .filter((i) => i.kind === "servico")
    .reduce((s, i) => s + itemTotal(i), 0);
  const subtotal = subtotalProdutos + subtotalServicos;
  const generalDiscountValue =
    q.generalDiscountMode === "percent"
      ? (subtotal * (q.generalDiscount || 0)) / 100
      : q.generalDiscount || 0;
  const total = Math.max(0, subtotal - generalDiscountValue + (q.shipping || 0));
  return {
    subtotalProdutos,
    subtotalServicos,
    subtotal,
    generalDiscountValue,
    shipping: q.shipping || 0,
    total,
  };
};

// ── Supabase persistence ──────────────────────────────────────
async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function rowToCompany(row: Record<string, unknown> | null | undefined): Company {
  if (!row) return emptyCompany();
  return {
    logo: (row.logo as string) ?? "",
    name: (row.name as string) ?? "",
    document: (row.document as string) ?? "",
    phone: (row.phone as string) ?? "",
    email: (row.email as string) ?? "",
    website: (row.website as string) ?? "",
    address: (row.address as string) ?? "",
    pix: (row.pix as string) ?? "",
    bank: (row.bank as string) ?? "",
    themeColor: (row.theme_color as string) ?? "#0A192F",
  };
}

function rowToQuote(row: Record<string, unknown>): Quote {
  return {
    id: row.id as string,
    number: (row.number as string) ?? "",
    issueDate: (row.issue_date as string) ?? "",
    validityDays: (row.validity_days as number) ?? 15,
    client: { ...emptyClient(), ...((row.client as Client) ?? {}) },
    items: ((row.items as QuoteItem[]) ?? []),
    generalDiscount: Number(row.general_discount ?? 0),
    generalDiscountMode: ((row.general_discount_mode as DiscountMode) ?? "valor"),
    shipping: Number(row.shipping ?? 0),
    paymentMethods: (row.payment_methods as string) ?? "",
    deliveryTerm: (row.delivery_term as string) ?? "",
    notes: (row.notes as string) ?? "",
    status: ((row.status as QuoteStatus) ?? "rascunho"),
    updatedAt: row.updated_at
      ? new Date(row.updated_at as string).getTime()
      : Date.now(),
  };
}

export const loadCompany = async (): Promise<Company> => {
  const uid = await getUserId();
  if (!uid) return emptyCompany();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("[quote] loadCompany", error);
    return emptyCompany();
  }
  return rowToCompany(data);
};

export const saveCompany = async (c: Company): Promise<void> => {
  const uid = await getUserId();
  if (!uid) throw new Error("Usuário não autenticado");
  const payload = {
    user_id: uid,
    logo: c.logo ?? "",
    name: c.name ?? "",
    document: c.document ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    website: c.website ?? "",
    address: c.address ?? "",
    pix: c.pix ?? "",
    bank: c.bank ?? "",
    theme_color: c.themeColor ?? "#0A192F",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("companies")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
};

export const loadQuotes = async (): Promise<Quote[]> => {
  const uid = await getUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[quote] loadQuotes", error);
    return [];
  }
  return (data ?? []).map(rowToQuote);
};

function quoteToRow(q: Quote, uid: string) {
  return {
    id: q.id,
    user_id: uid,
    number: q.number,
    issue_date: q.issueDate,
    validity_days: q.validityDays,
    client: q.client as unknown as Record<string, unknown>,
    items: q.items as unknown as Record<string, unknown>[],
    general_discount: q.generalDiscount,
    general_discount_mode: q.generalDiscountMode,
    shipping: q.shipping,
    payment_methods: q.paymentMethods,
    delivery_term: q.deliveryTerm,
    notes: q.notes,
    status: q.status,
    updated_at: new Date().toISOString(),
  };
}

export const upsertQuote = async (q: Quote): Promise<Quote[]> => {
  const uid = await getUserId();
  if (!uid) throw new Error("Usuário não autenticado");
  const { error } = await supabase
    .from("quotes")
    .upsert(quoteToRow(q, uid), { onConflict: "id" });
  if (error) throw error;
  return loadQuotes();
};

export const deleteQuote = async (id: string): Promise<Quote[]> => {
  const uid = await getUserId();
  if (!uid) throw new Error("Usuário não autenticado");
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);
  if (error) throw error;
  return loadQuotes();
};

export const statusLabel: Record<QuoteStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export const sanitizeFileName = (s: string) =>
  s.replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "") || "Cliente";

export const buildWhatsappMessage = (
  q: Quote,
  company: Company,
  total: number,
): string => {
  const lines = [
    `*Orçamento #${q.number}* — ${company.name || "Minha Empresa"}`,
    `Cliente: ${q.client.name || "-"}`,
    `Emissão: ${formatDateBR(q.issueDate)} • Validade: ${q.validityDays} dias`,
    ``,
    `Itens:`,
    ...q.items.map(
      (i) =>
        `• ${i.kind === "servico" ? "[Serviço]" : "[Produto]"} ${i.description || "—"} — ${i.quantity} ${i.unit} × ${brl(i.unitPrice)} = ${brl(itemTotal(i))}`,
    ),
    ``,
    `*Valor Total: ${brl(total)}*`,
    ``,
    q.paymentMethods ? `Pagamento: ${q.paymentMethods}` : "",
    q.deliveryTerm ? `Prazo: ${q.deliveryTerm}` : "",
    company.pix ? `PIX: ${company.pix}` : "",
  ].filter(Boolean);
  return lines.join("\n");
};

export const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");

export const whatsappUrl = (phone: string, message: string) => {
  const digits = onlyDigits(phone);
  const withCountry = digits.length && !digits.startsWith("55") ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
};

