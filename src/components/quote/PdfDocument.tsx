import { forwardRef } from "react";
import {
  brl,
  computeTotals,
  formatDateBR,
  addDaysISO,
  itemTotal,
  type Company,
  type Quote,
} from "@/lib/quote";

interface Props {
  company: Company;
  quote: Quote;
}

/**
 * PDF-ready A4 document. Uses inline styles + explicit colors so html2pdf/html2canvas
 * captures faithful colors (no dependency on Tailwind theme variables).
 */
export const PdfDocument = forwardRef<HTMLDivElement, Props>(function PdfDocument(
  { company, quote },
  ref,
) {
  const totals = computeTotals(quote);
  const validUntil = addDaysISO(quote.issueDate, quote.validityDays);
  const navy = "#0A192F";
  const sky = "#38BDF8";
  const skySoft = "#7DD3FC";
  const surface = "#F8FAFC";
  const slate = "#64748B";
  const border = "#E2E8F0";

  return (
    <div
      ref={ref}
      style={{
        width: "794px", // ~A4 at 96dpi
        minHeight: "1123px",
        background: "#FFFFFF",
        color: navy,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        fontSize: "12px",
        lineHeight: 1.45,
        boxSizing: "border-box",
      }}
    >
      {/* Top border */}
      <div style={{ height: "10px", background: navy }} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 32px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {company.logo ? (
            <img
              src={company.logo}
              alt="Logo"
              style={{ maxHeight: "64px", maxWidth: "180px", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "12px",
                background: navy,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "22px",
              }}
            >
              {(company.name || "NC").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>
              {company.name || "Sua Empresa"}
            </div>
            {company.document && (
              <div style={{ color: slate }}>{company.document}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", color: slate, fontSize: "11px" }}>
          {company.phone && <div>{company.phone}</div>}
          {company.email && <div>{company.email}</div>}
          {company.website && <div>{company.website}</div>}
          {company.address && (
            <div style={{ maxWidth: "260px" }}>{company.address}</div>
          )}
        </div>
      </div>

      {/* Highlight band */}
      <div
        style={{
          background: navy,
          color: "#fff",
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `4px solid ${sky}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "3px",
              color: skySoft,
              fontWeight: 600,
            }}
          >
            ORÇAMENTO
          </div>
          <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "2px" }}>
            #{quote.number}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px" }}>
          <div>
            <span style={{ color: skySoft }}>Emissão: </span>
            {formatDateBR(quote.issueDate)}
          </div>
          <div>
            <span style={{ color: skySoft }}>Validade: </span>
            {formatDateBR(validUntil)} ({quote.validityDays} dias)
          </div>
        </div>
      </div>

      {/* Client block */}
      <div style={{ padding: "20px 32px" }}>
        <div
          style={{
            background: surface,
            border: `1px solid ${border}`,
            borderLeft: `4px solid ${sky}`,
            borderRadius: "8px",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "2px",
              color: slate,
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            DADOS DO CLIENTE
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700 }}>
            {quote.client.name || "—"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 24px",
              marginTop: "6px",
              color: slate,
              fontSize: "11px",
            }}
          >
            {quote.client.document && <div>Documento: {quote.client.document}</div>}
            {quote.client.phone && <div>Telefone: {quote.client.phone}</div>}
            {quote.client.email && <div>E-mail: {quote.client.email}</div>}
            {quote.client.address && <div>Endereço: {quote.client.address}</div>}
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: "0 32px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr style={{ background: navy, color: "#fff" }}>
              <th style={th}>Tipo</th>
              <th style={{ ...th, textAlign: "left" }}>Descrição</th>
              <th style={th}>Qtd</th>
              <th style={th}>Unid.</th>
              <th style={{ ...th, textAlign: "right" }}>Val. Unit.</th>
              <th style={{ ...th, textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, idx) => (
              <tr
                key={it.id}
                style={{
                  background: idx % 2 ? surface : "#fff",
                  borderBottom: `1px solid ${border}`,
                }}
              >
                <td style={td}>
                  <span
                    style={{
                      display: "inline-block",
                      background: it.kind === "servico" ? skySoft : navy,
                      color: it.kind === "servico" ? navy : "#fff",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    {it.kind === "servico" ? "Serviço" : "Produto"}
                  </span>
                </td>
                <td style={{ ...td, textAlign: "left" }}>{it.description || "—"}</td>
                <td style={td}>{it.quantity}</td>
                <td style={td}>{it.unit}</td>
                <td style={{ ...td, textAlign: "right" }}>{brl(it.unitPrice)}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                  {brl(itemTotal(it))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div
        style={{
          padding: "18px 32px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div style={{ width: "320px", fontSize: "11px" }}>
          <Row label="Subtotal Produtos" value={brl(totals.subtotalProdutos)} />
          <Row label="Subtotal Serviços" value={brl(totals.subtotalServicos)} />
          {totals.generalDiscountValue > 0 && (
            <Row
              label={`Desconto${quote.generalDiscountMode === "percent" ? ` (${quote.generalDiscount}%)` : ""}`}
              value={`- ${brl(totals.generalDiscountValue)}`}
            />
          )}
          {totals.shipping > 0 && (
            <Row label="Frete / Deslocamento" value={brl(totals.shipping)} />
          )}
          <div
            style={{
              marginTop: "10px",
              background: skySoft,
              borderRadius: "10px",
              padding: "12px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: `1px solid ${sky}`,
            }}
          >
            <div style={{ color: navy, fontWeight: 700, fontSize: "12px" }}>
              VALOR TOTAL
            </div>
            <div style={{ color: navy, fontWeight: 800, fontSize: "20px" }}>
              {brl(totals.total)}
            </div>
          </div>
        </div>
      </div>

      {/* Payment / Bank block */}
      <div style={{ padding: "0 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div
            style={{
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: "8px",
              padding: "12px 14px",
            }}
          >
            <div style={labelStyle}>CONDIÇÕES DE PAGAMENTO</div>
            <div style={{ marginTop: "4px" }}>{quote.paymentMethods || "—"}</div>
            {quote.deliveryTerm && (
              <>
                <div style={{ ...labelStyle, marginTop: "8px" }}>PRAZO</div>
                <div style={{ marginTop: "4px" }}>{quote.deliveryTerm}</div>
              </>
            )}
          </div>
          <div
            style={{
              background: "#fff",
              border: `1px solid ${sky}`,
              borderRadius: "8px",
              padding: "12px 14px",
            }}
          >
            <div style={{ ...labelStyle, color: navy }}>PIX / DADOS BANCÁRIOS</div>
            {company.pix && (
              <div style={{ marginTop: "4px" }}>
                <strong>PIX:</strong> {company.pix}
              </div>
            )}
            {company.bank && (
              <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>
                {company.bank}
              </div>
            )}
            {!company.pix && !company.bank && (
              <div style={{ marginTop: "4px", color: slate }}>
                Configure PIX e dados bancários na aba Empresa.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div style={{ padding: "16px 32px 0" }}>
          <div style={labelStyle}>OBSERVAÇÕES</div>
          <div style={{ marginTop: "4px", whiteSpace: "pre-wrap", color: navy }}>
            {quote.notes}
          </div>
        </div>
      )}

      {/* Signature / footer */}
      <div style={{ padding: "40px 32px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            marginTop: "24px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: `1px solid ${navy}`, paddingTop: "6px" }}>
              {company.name || "Empresa Emissora"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: `1px solid ${navy}`, paddingTop: "6px" }}>
              Aceite do Cliente
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            color: slate,
            fontSize: "10px",
          }}
        >
          Proposta válida até {formatDateBR(validUntil)} • Documento gerado
          eletronicamente
        </div>
      </div>
    </div>
  );
});

const th: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  fontSize: "10px",
  letterSpacing: "1px",
  textTransform: "uppercase",
  fontWeight: 700,
};

const td: React.CSSProperties = {
  padding: "8px",
  textAlign: "center",
  verticalAlign: "middle",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "2px",
  color: "#64748B",
  fontWeight: 700,
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        borderBottom: "1px dashed #E2E8F0",
      }}
    >
      <span style={{ color: "#64748B" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}