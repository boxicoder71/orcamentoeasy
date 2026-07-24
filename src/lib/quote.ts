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

// ── LocalStorage ──────────────────────────────────────────────
const COMPANY_KEY = "nc.quote.company";
const QUOTES_KEY = "nc.quote.quotes";

export const loadCompany = (): Company => {
  if (typeof window === "undefined") return emptyCompany();
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    return raw ? { ...emptyCompany(), ...JSON.parse(raw) } : emptyCompany();
  } catch {
    return emptyCompany();
  }
};

export const saveCompany = (c: Company) => {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(c));
};

export const loadQuotes = (): Quote[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveQuotes = (list: Quote[]) => {
  localStorage.setItem(QUOTES_KEY, JSON.stringify(list));
};

export const upsertQuote = (q: Quote): Quote[] => {
  const list = loadQuotes();
  const idx = list.findIndex((x) => x.id === q.id);
  const updated = { ...q, updatedAt: Date.now() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  saveQuotes(list);
  return list;
};

export const deleteQuote = (id: string): Quote[] => {
  const list = loadQuotes().filter((q) => q.id !== id);
  saveQuotes(list);
  return list;
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
    `*Orçamento #${q.number}* — ${company.name || "Nuvem Comunicação"}`,
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