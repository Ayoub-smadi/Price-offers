import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowRight, FileText, Loader2 } from "lucide-react";
import { useQuotation } from "@/hooks/use-quotations";
import { exportNoHeaderToPDF } from "@/lib/export-utils";
import { format } from "date-fns";

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
function isDark(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
function darken(hex: string, amount = 30) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `#${[r, g, b].map(c => clamp(c - amount).toString(16).padStart(2, '0')).join('')}`;
}
function tint(hex: string, opacity = 0.08) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${opacity})`;
}

export default function ViewQuotationNoHeader() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const quotationId = Number(id);
  const { data: quotation, isLoading, error } = useQuotation(quotationId);
  const [accentColor] = useState("#16a34a");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="p-12 text-center text-destructive">
        <h2 className="text-xl font-bold">لم يتم العثور على العرض</h2>
        <button onClick={() => navigate("/history")} className="mt-4 text-primary underline">
          العودة للسجل
        </button>
      </div>
    );
  }

  const items = quotation.items || [];
  const headerBg = accentColor;
  const headerText = isDark(accentColor) ? "#ffffff" : "#1a1a1a";
  const rowAlt = tint(accentColor, 0.06);
  const totalBg = darken(accentColor, 40);
  const grandTotal = Number(quotation.grandTotal);
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const dateStr = (() => {
    try { return format(new Date(quotation.date), "yyyy-MM-dd"); }
    catch { return String(quotation.date ?? ""); }
  })();

  return (
    <div className="max-w-5xl mx-auto p-2 sm:p-4 space-y-3 pb-20 min-h-screen" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-sm sticky top-2 z-50 no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/history")}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all dark:bg-slate-800"
            title="رجوع"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">عرض سعر مخصص</h1>
            <p className="text-slate-400 text-xs">عرض رقم {quotation.quotationNumber}</p>
          </div>
        </div>
        <button
          onClick={() => exportNoHeaderToPDF("nh-view-document", `Quote-${quotation.quotationNumber}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all text-sm font-semibold"
        >
          <FileText className="w-4 h-4" /> تصدير PDF
        </button>
      </div>

      {/* Document */}
      <div
        id="nh-view-document"
        className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100"
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        <div className="h-2" style={{ backgroundColor: accentColor }} />

        {/* Header */}
        <div className="px-8 pt-6 pb-4 flex items-center gap-6 border-b border-slate-100">
          <div className="flex-1 text-right">
            <p className="text-3xl font-black text-slate-900">عرض سعر</p>
            <div className="mt-1 h-0.5 w-16 rounded-full" style={{ backgroundColor: accentColor }} />
          </div>
        </div>

        {/* Meta Row */}
        <div className="px-8 py-4 grid grid-cols-3 gap-4 border-b border-slate-100"
          style={{ backgroundColor: tint(accentColor, 0.04) }}>
          {[
            { label: "إلى السادة", value: quotation.customerName },
            { label: "رقم العرض", value: quotation.quotationNumber },
            { label: "التاريخ", value: dateStr },
          ].map(f => (
            <div key={f.label} className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: accentColor }}>{f.label}</div>
              <p className="text-sm font-semibold text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Items Table */}
        <div className="px-8 py-4">
          <table className="w-full text-right text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: headerBg, color: headerText }}>
                <th className="py-2.5 px-3 text-center font-bold text-xs w-8 rounded-r-lg">#</th>
                <th className="py-2.5 px-3 text-right font-bold text-xs">البيان</th>
                <th className="py-2.5 px-3 text-center font-bold text-xs w-20">الكمية</th>
                <th className="py-2.5 px-3 text-center font-bold text-xs w-24">سعر الوحدة</th>
                <th className="py-2.5 px-3 text-center font-bold text-xs w-24 rounded-l-lg">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}
                  className="border-b border-slate-100"
                  style={{ backgroundColor: index % 2 === 1 ? rowAlt : "transparent" }}>
                  <td className="py-2 px-3 text-center text-slate-400 text-xs font-semibold">{index + 1}</td>
                  <td className="py-2 px-3">
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-sm font-bold text-slate-700">{item.quantity}</td>
                  <td className="py-2 px-3 text-center text-sm font-bold text-slate-700">
                    {fmt(Number(item.price))}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-sm font-bold text-slate-800">{fmt(Number(item.total))}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 pb-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-center rounded-xl px-3 py-2.5 text-white font-black"
                style={{ backgroundColor: totalBg }}>
                <span className="text-lg">{fmt(grandTotal)}</span>
                <span className="text-sm">الإجمالي الكلي</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {quotation.notes && (
          <div className="px-8 pb-6 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: accentColor }}>ملاحظات</div>
            <p className="text-xs text-slate-600 leading-relaxed">{quotation.notes}</p>
          </div>
        )}

        <div className="h-1.5" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}
