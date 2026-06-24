import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Plus, FileText, Save, Wand2, Trash2, CheckCircle2,
  MessageCircle, RotateCcw, Upload, Eye, EyeOff, X, ArrowRight
} from "lucide-react";
import { useCreateQuotation as useCreateQuote, useUpdateQuotation, useParseText as useParseTextAPI } from "@/hooks/use-quotations";
import { useToast } from "@/hooks/use-toast";
import { exportNoHeaderToPDF } from "@/lib/export-utils";
import { format } from "date-fns";

type Item = {
  id: string; name: string; description: string; category: string;
  quantity: number; unit: string; price: number; total: number; imageUrl?: string;
};

type Details = {
  quotationNumber: string; customerName: string; date: string;
  notes: string; closingText: string; signerTitle: string; titleText: string;
};

const DRAFT_KEY = "aq_draft_no_header";

type InitialFormData = {
  items: Item[];
  details: Partial<Details>;
  accentColor?: string;
  showDesc?: boolean;
  showCategory?: boolean;
  discountValue?: number;
  taxRate?: number;
  stampSrc?: string | null;
  logoBase64?: string | null;
};

type Props = {
  initialData?: InitialFormData;
  editId?: number;
};

const defaultDetails = (): Details => ({
  quotationNumber: `${format(new Date(), "yyyyMMdd")}`,
  customerName: "",
  date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
  closingText: "واقبلوا فائق الاحترام....",
  signerTitle: "المدير العام/ ثامر احمد القادري",
  titleText: "عرض سعر",
});

const defaultItems = (): Item[] => [
  { id: "1", name: "", description: "", category: "", quantity: 1, unit: "وحدة", price: 0, total: 0 }
];

/** Derive a faint tint from a hex color */
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

export function QuotationFormNoHeader({ initialData, editId }: Props = {}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuotation(editId ?? 0);
  const parseMutation = useParseTextAPI();

  const loadDraft = () => {
    if (editId) return null; // don't use draft when editing a saved quotation
    try { const raw = sessionStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  };
  const draft = loadDraft();
  const source = initialData ?? draft;

  const [items, setItems] = useState<Item[]>(source?.items ?? defaultItems());
  const [details, setDetails] = useState<Details>(source?.details ? { ...defaultDetails(), ...source.details } : defaultDetails());
  const [accentColor, setAccentColor] = useState<string>(source?.accentColor ?? "#16a34a");
  const [showDesc, setShowDesc] = useState<boolean>(source?.showDesc ?? true);
  const [showCategory, setShowCategory] = useState<boolean>(source?.showCategory ?? false);
  const [discountValue, setDiscountValue] = useState<number>(source?.discountValue ?? 0);
  const [taxRate, setTaxRate] = useState<number>(source?.taxRate ?? 0);
  const [stampSrc, setStampSrc] = useState<string | null>(source?.stampSrc ?? null);
  const [logoBase64, setLogoBase64] = useState<string | null>(source?.logoBase64 ?? null);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        items, details, accentColor, showDesc, showCategory,
        discountValue, taxRate, stampSrc, logoBase64
      }));
    } catch {}
  }, [items, details, accentColor, showDesc, showCategory, discountValue, taxRate, stampSrc, logoBase64]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setItems(defaultItems());
    setDetails(defaultDetails());
    setAccentColor("#16a34a");
    setShowDesc(true);
    setShowCategory(false);
    setDiscountValue(0);
    setTaxRate(0);
    setStampSrc(null);
    setLogoBase64(null);
    setPasteText("");
  };

  const subtotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
  const discountAmount = (subtotal * discountValue) / 100;
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100;
  const grandTotal = subtotal - discountAmount + taxAmount;
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const headerBg = accentColor;
  const headerText = isDark(accentColor) ? "#ffffff" : "#1a1a1a";
  const rowAlt = tint(accentColor, 0.06);
  const totalBg = darken(accentColor, 40);
  const accentBorder = accentColor;

  const addItem = () => setItems(prev => [...prev, {
    id: Date.now().toString(), name: "", description: "", category: "", quantity: 1, unit: "وحدة", price: 0, total: 0
  }]);

  const removeItem = (id: string) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price') updated.total = Number(updated.quantity) * Number(updated.price);
      return updated;
    }));
  };

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    parseMutation.mutate({ text: pasteText }, {
      onSuccess: (data) => {
        const newItems = data.items.map(i => ({
          id: Date.now().toString() + Math.random(),
          name: i.name || "عنصر غير معروف", description: i.description || "",
          category: i.category || "", quantity: i.quantity || 1,
          unit: "وحدة", price: i.price || 0, total: (i.quantity || 1) * (i.price || 0)
        }));
        setItems([...items.filter(i => i.name.trim() !== "" || i.price > 0), ...newItems]);
        setPasteText(""); setShowPaste(false);
        toast({ title: "تم التحليل بنجاح", description: `تمت إضافة ${newItems.length} عناصر.` });
      },
      onError: () => toast({ title: "خطأ في التحليل", variant: "destructive" })
    });
  };

  const handleWhatsApp = () => {
    const validItems = items.filter(i => i.name.trim());
    const lines = validItems.map((i, idx) => `${idx + 1}. ${i.name} × ${i.quantity} = ${i.total.toLocaleString()} د`).join('\n');
    const msg = `*${details.titleText || 'عرض سعر'} رقم: ${details.quotationNumber}*\nإلى: ${details.customerName || '—'}\nالتاريخ: ${details.date}\n\n${lines}\n${discountAmount > 0 ? `خصم: -${discountAmount.toLocaleString()} د\n` : ''}${taxAmount > 0 ? `ضريبة: +${taxAmount.toLocaleString()} د\n` : ''}──────────────────\n*الإجمالي: ${grandTotal.toLocaleString()} دينار*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSave = () => {
    if (!details.customerName.trim()) { toast({ title: "مطلوب اسم العميل", variant: "destructive" }); return; }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) { toast({ title: "مطلوب إضافة عناصر", variant: "destructive" }); return; }
    const payload = {
      quotationNumber: details.quotationNumber, customerName: details.customerName,
      date: new Date(details.date), notes: details.notes,
      grandTotal: grandTotal.toString(), quotationType: 'no-header',
      items: validItems.map(i => ({
        name: i.name.trim(), description: i.description.trim(),
        category: i.category?.trim() || null, quantity: Math.max(1, i.quantity),
        price: String(Math.max(0, i.price)), total: String(Math.max(0, i.total)), imageUrl: i.imageUrl || null,
      }))
    };
    if (editId) {
      updateMutation.mutate(payload, {
        onSuccess: () => { toast({ title: "✅ تم تحديث عرض السعر" }); navigate("/history"); },
        onError: (e) => toast({ title: "خطأ في التحديث", description: e.message, variant: "destructive" })
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast({ title: "✅ تم حفظ عرض السعر" }); clearDraft(); navigate("/history"); },
        onError: (e) => toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" })
      });
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setStampSrc(r.result as string); r.readAsDataURL(file); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setLogoBase64(r.result as string); r.readAsDataURL(file); }
  };

  return (
    <div className="max-w-5xl mx-auto p-2 sm:p-4 space-y-3 pb-20 min-h-screen" dir="rtl">

      {/* ── Top Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-sm sticky top-2 z-50 no-print">
        <div className="flex items-center gap-2">
          {editId && (
            <button onClick={() => navigate("/history")}
              className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all dark:bg-slate-800" title="رجوع">
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">عرض سعر مخصص</h1>
            <p className="text-slate-400 text-xs">{editId ? `تعديل عرض رقم ${details.quotationNumber}` : "بدون ترويسة شركة"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setShowPaste(v => !v)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 text-xs font-semibold transition-all no-print">
            <Wand2 className="w-3.5 h-3.5" /> تحليل نص
          </button>
          {!editId && (
            <button onClick={clearDraft}
              className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-all dark:bg-slate-800 no-print" title="مسح">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleWhatsApp}
            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all dark:bg-green-900/20 dark:text-green-400 no-print" title="واتساب">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button onClick={() => exportNoHeaderToPDF("nh-quotation-document", `Quote-${details.quotationNumber}`)}
            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:text-red-400 no-print" title="PDF">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-sm no-print"
            style={{ backgroundColor: accentColor }}>
            {(createMutation.isPending || updateMutation.isPending) ? "جاري..." : editId ? "تحديث" : "حفظ"} <Save className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Smart Paste (collapsible) ── */}
      {showPaste && (
        <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-xl p-3 space-y-2 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
              <Wand2 className="w-4 h-4" />
              <span className="text-sm font-bold">التحليل الذكي للنصوص</span>
            </div>
            <button onClick={() => setShowPaste(false)} className="text-violet-400 hover:text-violet-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-violet-600 dark:text-violet-400 text-xs">الصق النص هنا: <b>الكمية / الاسم / الوصف / السعر</b></p>
          <div className="flex gap-2">
            <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
              placeholder="شاشة سامسونج 5 حبات بسعر 1500&#10;كيبورد لوجيتك 2 قطعة سعر 300"
              className="flex-1 h-20 p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-900 resize-none text-xs" />
            <button onClick={handleParseText} disabled={parseMutation.isPending || !pasteText.trim()}
              className="px-3 py-2 rounded-lg bg-violet-600 text-white font-bold text-xs disabled:opacity-50 hover:bg-violet-700 transition-all self-end">
              {parseMutation.isPending ? "..." : "حلل"}
            </button>
          </div>
        </div>
      )}

      {/* ── Customization Bar ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 no-print">
        <div className="flex flex-wrap items-center gap-4">
          {/* Single color picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">لون السمة</label>
            <div className="relative">
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border-2 border-slate-200 dark:border-slate-700 p-0.5" />
            </div>
            {/* Preset colors */}
            <div className="flex gap-1.5">
              {["#16a34a","#2563eb","#9333ea","#dc2626","#d97706","#0f172a"].map(c => (
                <button key={c} onClick={() => setAccentColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${accentColor === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Column toggles */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">الأعمدة</span>
            <button onClick={() => setShowDesc(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${showDesc ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-800' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
              {showDesc ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} الوصف
            </button>
            <button onClick={() => setShowCategory(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${showCategory ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-800' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
              {showCategory ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} القسم
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Discount / Tax */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">خصم %</label>
              <input type="number" min="0" max="100" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0" className="w-14 text-center text-xs border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1 bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">ضريبة %</label>
              <input type="number" min="0" max="100" value={taxRate || ''} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="0" className="w-14 text-center text-xs border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1 bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          DOCUMENT AREA
      ══════════════════════════════════════════════ */}
      <div id="nh-quotation-document"
        className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100"
        style={{ fontFamily: 'Cairo, sans-serif' }}>

        {/* ── Accent top bar ── */}
        <div className="h-2" style={{ backgroundColor: accentColor }} />

        {/* ── Header: Logo + Title ── */}
        <div className="px-8 pt-6 pb-4 flex items-center gap-6 border-b border-slate-100">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logoBase64 ? (
              <div className="relative">
                <img src={logoBase64} alt="شعار" className="h-16 w-auto object-contain" />
                <button onClick={() => setLogoBase64(null)}
                  className="no-print absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">×</button>
              </div>
            ) : (
              <label className="no-print cursor-pointer flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded-xl w-16 h-16 hover:border-slate-400 transition-all">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Upload className="w-4 h-4 text-slate-300" />
                <span className="text-[9px] text-slate-400">شعار</span>
              </label>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 text-right">
            <input value={details.titleText}
              onChange={e => setDetails({ ...details, titleText: e.target.value })}
              className="text-3xl font-black text-slate-900 bg-transparent border-none outline-none w-full text-right"
              placeholder="عرض سعر"
              style={{ caretColor: accentColor }} />
            <div className="mt-1 h-0.5 w-16 rounded-full" style={{ backgroundColor: accentColor, marginRight: 0 }} />
          </div>
        </div>


        {/* ── Meta Row ── */}
        <div className="px-8 py-4 grid grid-cols-3 gap-4 border-b border-slate-100"
          style={{ backgroundColor: tint(accentColor, 0.04) }}>
          {[
            { label: "العميل", value: details.customerName, key: "customerName", type: "text", placeholder: "اسم العميل" },
            { label: "رقم عرض السعر", value: details.quotationNumber, key: "quotationNumber", type: "text", placeholder: "" },
            { label: "التاريخ", value: details.date, key: "date", type: "date", placeholder: "" },
          ].map(f => (
            <div key={f.key} className="text-right">
              <div className="text-xs font-bold mb-1 leading-tight" style={{ color: accentColor }}>{f.label}</div>
              <input type={f.type} value={f.value}
                onChange={e => setDetails({ ...details, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full text-sm font-semibold text-slate-800 bg-transparent border-b border-slate-200 focus:border-slate-500 outline-none py-0.5 text-right"
                style={{ direction: 'rtl' }} />
            </div>
          ))}
        </div>

        {/* ── Items Table ── */}
        <div className="px-8 py-4">
          <table className="w-full text-right text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: headerBg, color: headerText }}>
                <th className="py-2.5 px-3 text-center font-bold text-xs w-8 rounded-r-lg">#</th>
                <th className="py-2.5 px-3 text-right font-bold text-xs">البيان</th>
                {showCategory && <th className="py-2.5 px-3 text-center font-bold text-xs w-24">القسم</th>}
                <th className="py-2.5 px-3 text-center font-bold text-xs w-20">الكمية</th>
                <th className="py-2.5 px-3 text-center font-bold text-xs w-24">سعر الوحدة</th>
                <th className="py-2.5 px-3 text-center font-bold text-xs w-24 rounded-l-lg">الإجمالي</th>
                <th className="w-8 no-print" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}
                  className="border-b border-slate-100 group transition-colors"
                  style={{ backgroundColor: index % 2 === 1 ? rowAlt : 'transparent' }}>
                  <td className="py-2 px-3 text-center text-slate-400 text-xs font-semibold">{index + 1}</td>
                  <td className="py-2 px-3">
                    <input value={item.name}
                      onChange={e => updateItem(item.id, 'name', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 outline-none text-sm font-semibold text-slate-800 py-0.5 text-right"
                      placeholder="اسم البيان"
                      style={{ direction: 'rtl' }} />
                    {showDesc && (
                      <input value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 outline-none text-xs text-slate-400 mt-0.5 py-0.5 text-right"
                        placeholder="وصف إضافي..."
                        style={{ direction: 'rtl' }} />
                    )}
                  </td>
                  {showCategory && (
                    <td className="py-2 px-3">
                      <input value={item.category}
                        onChange={e => updateItem(item.id, 'category', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 outline-none text-xs text-slate-600 text-center py-0.5"
                        placeholder="—" />
                    </td>
                  )}
                  <td className="py-2 px-3 text-center">
                    <input type="number" min="1" dir="ltr"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="1"
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 outline-none text-sm font-bold text-slate-700 text-center py-0.5" />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input type="number" min="0" step="0.01" dir="ltr"
                      value={item.price === 0 ? '' : item.price}
                      onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 outline-none text-sm font-bold text-slate-700 text-center py-0.5" />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-sm font-bold text-slate-800">{fmt(item.total)}</span>
                  </td>
                  <td className="py-2 px-1 text-center no-print">
                    <button onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add row button */}
          <button onClick={addItem}
            className="no-print mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-1.5 px-2 rounded-lg hover:bg-slate-50">
            <Plus className="w-3.5 h-3.5" /> إضافة صف
          </button>
        </div>

        {/* ── Totals ── */}
        <div className="px-8 pb-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span className="font-semibold">{fmt(subtotal)}</span>
                <span>المجموع الفرعي</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span className="font-semibold">-{fmt(discountAmount)}</span>
                  <span>خصم ({discountValue}%)</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span className="font-semibold">+{fmt(taxAmount)}</span>
                  <span>ضريبة ({taxRate}%)</span>
                </div>
              )}
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-center rounded-xl px-3 py-2.5 text-white font-black"
                style={{ backgroundColor: totalBg }}>
                <span className="text-lg">{fmt(grandTotal)}</span>
                <span className="text-sm">الإجمالي الكلي</span>
              </div>
            </div>
          </div>
        </div>


        {/* ── Footer: Notes + Stamp ── */}
        <div className="px-8 pb-6 pt-2 border-t border-slate-100 grid grid-cols-2 gap-8">
          {/* Notes */}
          <div>
            <div className="text-xs font-bold mb-1 leading-tight" style={{ color: accentColor }}>ملاحظات</div>
            <textarea value={details.notes}
              onChange={e => setDetails({ ...details, notes: e.target.value })}
              className="w-full text-xs text-slate-600 bg-transparent border-none outline-none resize-none leading-relaxed"
              rows={3} placeholder="أي ملاحظات إضافية..." style={{ direction: 'rtl' }} />
          </div>

          {/* Stamp only — no title/text */}
          <div className="flex flex-col items-center justify-center">
            {stampSrc ? (
              <div className="relative">
                <img src={stampSrc} alt="الختم" className="w-24 h-24 object-contain opacity-90" />
                <button onClick={() => setStampSrc(null)}
                  className="no-print absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600">×</button>
              </div>
            ) : (
              <label className="no-print cursor-pointer flex flex-col items-center gap-1 border-2 border-dashed border-slate-200 rounded-xl w-24 h-24 justify-center hover:border-slate-400 transition-all">
                <input type="file" accept="image/*" className="hidden" onChange={handleStampUpload} />
                <Upload className="w-4 h-4 text-slate-300" />
                <span className="text-[9px] text-slate-400">ختم / توقيع</span>
              </label>
            )}
          </div>
        </div>

        {/* ── Bottom accent bar ── */}
        <div className="h-1.5" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}
