import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Plus, FileText, Save, Wand2, Trash2, CheckCircle2,
  MessageCircle, RotateCcw, Palette, ChevronDown, ChevronUp, Upload
} from "lucide-react";
import { useCreateQuotation as useCreateQuote, useParseText as useParseTextAPI } from "@/hooks/use-quotations";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/export-utils";
import { format } from "date-fns";

type Item = {
  id: string; name: string; description: string; category: string;
  quantity: number; unit: string; price: number; total: number; imageUrl?: string;
};

type Headers = {
  index: string; name: string; description: string;
  category: string; quantity: string; price: string; total: string;
};

type Details = {
  quotationNumber: string; customerName: string; date: string;
  notes: string; closingText: string; signerTitle: string;
};

type CustomColors = {
  headerBg: string;
  headerText: string;
  nameColBg: string;
  descColBg: string;
  totalColBg: string;
  grandTotalBg: string;
  grandTotalText: string;
  rowAltBg: string;
};

const defaultDetails = (): Details => ({
  quotationNumber: `${format(new Date(), "yyyyMMdd")}`,
  customerName: "",
  date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
  closingText: "واقبلوا فائق الاحترام....",
  signerTitle: "المدير العام/ ثامر احمد القادري",
});

const defaultItems = (): Item[] => [
  { id: "1", name: "", description: "", category: "", quantity: 1, unit: "وحدة", price: 0, total: 0 }
];

const defaultHeaders = (): Headers => ({
  index: "#", name: "الاسم", description: "الوصف",
  category: "القسم", quantity: "الكمية", price: "السعر", total: "الإجمالي",
});

const defaultColors = (): CustomColors => ({
  headerBg: "#1e293b",
  headerText: "#ffffff",
  nameColBg: "#ffffff",
  descColBg: "#ffffff",
  totalColBg: "#f1f5f9",
  grandTotalBg: "#1e293b",
  grandTotalText: "#ffffff",
  rowAltBg: "#f8fafc",
});

const DRAFT_KEY = "aq_draft_no_header";

export function QuotationFormNoHeader() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const createMutation = useCreateQuote();
  const parseMutation = useParseTextAPI();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [stampBase64, setStampBase64] = useState<string | null>(null);

  const loadDraft = () => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const draft = loadDraft();

  const [items, setItems] = useState<Item[]>(draft?.items ?? defaultItems());
  const [details, setDetails] = useState<Details>(draft?.details ?? defaultDetails());
  const [headers, setHeaders] = useState<Headers>(draft?.headers ?? defaultHeaders());
  const [colors, setColors] = useState<CustomColors>(draft?.colors ?? defaultColors());
  const [pasteText, setPasteText] = useState("");
  const [discountValue, setDiscountValue] = useState<number>(draft?.discountValue ?? 0);
  const [taxRate, setTaxRate] = useState<number>(draft?.taxRate ?? 0);
  const [stampSrc, setStampSrc] = useState<string | null>(draft?.stampSrc ?? null);

  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ items, details, headers, colors, discountValue, taxRate, stampSrc }));
    } catch {}
  }, [items, details, headers, colors, discountValue, taxRate, stampSrc]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setItems(defaultItems());
    setDetails(defaultDetails());
    setHeaders(defaultHeaders());
    setColors(defaultColors());
    setDiscountValue(0);
    setTaxRate(0);
    setStampSrc(null);
    setStampBase64(null);
  };

  const subtotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
  const discountAmount = (subtotal * discountValue) / 100;
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100;
  const grandTotal = subtotal - discountAmount + taxAmount;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const setColor = (key: keyof CustomColors, val: string) =>
    setColors(prev => ({ ...prev, [key]: val }));

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setStampBase64(result);
        setStampSrc(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemImageUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateItem(itemId, 'imageUrl', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => setItems(prev => [...prev, {
    id: Date.now().toString(), name: "", description: "", category: "", quantity: 1, unit: "وحدة", price: 0, total: 0
  }]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price') {
        updated.total = Number(updated.quantity) * Number(updated.price);
      }
      return updated;
    }));
  };

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    parseMutation.mutate({ text: pasteText }, {
      onSuccess: (data) => {
        const newItems = data.items.map(i => ({
          id: Date.now().toString() + Math.random(),
          name: i.name || "عنصر غير معروف",
          description: i.description || "",
          category: i.category || "",
          quantity: i.quantity || 1,
          unit: "وحدة",
          price: i.price || 0,
          total: (i.quantity || 1) * (i.price || 0)
        }));
        const filteredItems = items.filter(i => i.name.trim() !== "" || i.price > 0);
        setItems([...filteredItems, ...newItems]);
        setPasteText("");
        toast({ title: "تم التحليل بنجاح", description: `تمت إضافة ${newItems.length} عناصر.` });
      },
      onError: () => toast({ title: "خطأ في التحليل", variant: "destructive" })
    });
  };

  const handleWhatsApp = () => {
    const validItems = items.filter(i => i.name.trim());
    const itemLines = validItems.map((i, idx) => `${idx + 1}. ${i.name} × ${i.quantity} = ${i.total.toLocaleString()} د`).join('\n');
    const discLine = discountAmount > 0 ? `\nخصم: -${discountAmount.toLocaleString()} د` : '';
    const taxLine = taxAmount > 0 ? `\nضريبة (${taxRate}%): +${taxAmount.toLocaleString()} د` : '';
    const msg = `*عرض سعر رقم: ${details.quotationNumber}*\nالعميل: ${details.customerName || '—'}\nالتاريخ: ${details.date}\n\n${itemLines}${discLine}${taxLine}\n──────────────────\n*المجموع الكلي: ${grandTotal.toLocaleString()} دينار*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSave = () => {
    if (!details.customerName.trim()) {
      toast({ title: "مطلوب اسم العميل", variant: "destructive" });
      return;
    }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast({ title: "مطلوب إضافة عناصر", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      quotationNumber: details.quotationNumber,
      customerName: details.customerName,
      date: new Date(details.date),
      notes: details.notes,
      grandTotal: grandTotal.toString(),
      items: validItems.map(i => ({
        name: i.name.trim(), description: i.description.trim(),
        category: i.category?.trim() || null,
        quantity: Math.max(1, i.quantity), price: String(Math.max(0, i.price)),
        total: String(Math.max(0, i.total)), imageUrl: i.imageUrl || null,
      }))
    }, {
      onSuccess: () => {
        toast({ title: "✅ تم حفظ عرض السعر بنجاح" });
        clearDraft();
        navigate("/history");
      },
      onError: (error) => toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" })
    });
  };

  const hdrCls = "bg-transparent border-none focus:outline-none focus:bg-white/10 rounded px-1 text-center text-xs font-bold w-full";

  const ColorPicker = ({ label, colorKey }: { label: string; colorKey: keyof CustomColors }) => (
    <div className="flex flex-col items-center gap-1">
      <label className="text-xs text-muted-foreground font-medium text-center">{label}</label>
      <div className="relative">
        <input
          type="color"
          value={colors[colorKey]}
          onChange={e => setColor(colorKey, e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border p-0.5"
          title={label}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">{colors[colorKey]}</span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-2 pb-20 min-h-screen flex flex-col">

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 glass-panel p-2 rounded-xl sticky top-2 z-50 no-print">
        <div>
          <h1 className="text-lg font-bold text-foreground">إنشاء عرض سعر دون ترويسة</h1>
          <p className="text-muted-foreground text-xs hidden sm:block">نموذج قابل للتخصيص الكامل</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCustomizer(v => !v)}
            className={`flex items-center gap-1 p-1.5 rounded-lg transition-all text-xs font-semibold ${showCustomizer ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
            title="تخصيص الألوان"
          >
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">تخصيص</span>
            {showCustomizer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={clearDraft} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-red-500 transition-all dark:bg-slate-800 dark:text-slate-400" title="مسح وبدء من جديد">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleWhatsApp} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all dark:bg-green-900/20 dark:text-green-400" title="إرسال واتساب">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportToPDF("nh-quotation-document", `Quote-${details.quotationNumber}`, items, { ...details, companyNameAr: '', companyLocationAr: '', companyNameEn: '', companyLocationEn: '', phone: '', email: '', website: '', footerCompany: '', signerTitle: details.signerTitle, closingText: details.closingText }, null)}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:text-red-400"
            title="تصدير PDF"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 text-sm"
          >
            {createMutation.isPending ? "جاري الحفظ..." : "حفظ العرض"}
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customizer Panel */}
      {showCustomizer && (
        <div className="glass-panel p-4 rounded-xl no-print border-primary/20 space-y-4">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Palette className="w-5 h-5" />
            <h2 className="text-sm font-bold">تخصيص المظهر</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Colors */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 border-b pb-1">ألوان رأس الجدول</h3>
              <div className="flex flex-wrap gap-4">
                <ColorPicker label="خلفية الرأس" colorKey="headerBg" />
                <ColorPicker label="نص الرأس" colorKey="headerText" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 border-b pb-1">ألوان خانات الصفوف</h3>
              <div className="flex flex-wrap gap-4">
                <ColorPicker label="خانة الاسم" colorKey="nameColBg" />
                <ColorPicker label="خانة الوصف" colorKey="descColBg" />
                <ColorPicker label="خانة الإجمالي" colorKey="totalColBg" />
                <ColorPicker label="خلفية صف بديل" colorKey="rowAltBg" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 border-b pb-1">ألوان المجموع الكلي</h3>
              <div className="flex flex-wrap gap-4">
                <ColorPicker label="خلفية المجموع" colorKey="grandTotalBg" />
                <ColorPicker label="نص المجموع" colorKey="grandTotalText" />
              </div>
            </div>

            {/* Stamp Upload */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 border-b pb-1">الختم / التوقيع</h3>
              <label className="relative cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleStampUpload} />
                {stampSrc ? (
                  <img src={stampSrc} alt="الختم" className="w-24 h-24 object-contain" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">انقر لرفع الختم</span>
                  </>
                )}
              </label>
              {stampSrc && (
                <button onClick={() => { setStampSrc(null); setStampBase64(null); }} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  حذف الختم
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setColors(defaultColors())}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            إعادة تعيين الألوان الافتراضية
          </button>
        </div>
      )}

      {/* Smart Paste Area */}
      <div className="glass-panel p-3 rounded-lg space-y-2 no-print border-primary/20">
        <div className="flex items-center gap-2 text-primary">
          <Wand2 className="w-5 h-5" />
          <h2 className="text-sm font-bold">التحليل الذكي للنصوص</h2>
        </div>
        <p className="text-muted-foreground text-xs">
          الصق النص على هذا النمط: <span className="font-bold text-foreground">الكمية / الاسم / الوصف / القسم / السعر</span>
        </p>
        <div className="relative">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="مثال:&#10;شاشة سامسونج 5 حبات بسعر 1500&#10;كيبورد لوجيتك 2 قطعة سعر 300"
            className="w-full h-20 p-2 rounded-lg input-soft resize-none text-xs"
          />
          <button
            onClick={handleParseText}
            disabled={parseMutation.isPending || !pasteText.trim()}
            className="absolute bottom-2 left-2 flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all disabled:opacity-50 text-xs"
          >
            {parseMutation.isPending ? "جاري التحليل..." : "حلل النص"}
            <CheckCircle2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* DOCUMENT AREA — No Header */}
      <div id="nh-quotation-document" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl p-5 sm:p-6 space-y-3 flex-1 flex flex-col print:shadow-none print:border-slate-300 print:p-4 print:rounded-none">

        {/* Minimal Meta Row */}
        <div className="flex gap-3 pb-4 border-b-2 border-slate-200 dark:border-slate-700">
          <div className="flex-1 text-center space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">التاريخ</label>
            <input type="date" value={details.date} onChange={(e) => setDetails({...details, date: e.target.value})} className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary outline-none py-1 px-0 w-full text-center" />
          </div>
          <div className="flex-1 text-center space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">عرض سعر رقم</label>
            <input value={details.quotationNumber} onChange={(e) => setDetails({...details, quotationNumber: e.target.value})} className="text-lg font-black text-slate-900 dark:text-slate-50 bg-transparent border-none p-0 focus:ring-2 focus:ring-primary/30 w-full text-center focus:outline-none rounded" />
          </div>
          <div className="flex-1 text-center space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">العميل</label>
            <input value={details.customerName} onChange={(e) => setDetails({...details, customerName: e.target.value})} className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary outline-none py-1 px-0 w-full text-center" placeholder="اسم العميل" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: colors.headerBg, color: colors.headerText }}>
                <th className="p-2 text-center w-6">
                  <input value={headers.index} onChange={e => setHeaders({...headers, index: e.target.value})} className="bg-transparent border-none focus:outline-none focus:bg-white/10 rounded px-1 text-center text-xs font-bold w-8" style={{ color: colors.headerText }} />
                </th>
                <th className="p-2 text-right">
                  <input value={headers.name} onChange={e => setHeaders({...headers, name: e.target.value})} className={hdrCls} style={{ color: colors.headerText }} />
                </th>
                <th className="p-2 text-right">
                  <input value={headers.description} onChange={e => setHeaders({...headers, description: e.target.value})} className={hdrCls} style={{ color: colors.headerText }} />
                </th>
                <th className="p-2 text-right">
                  <input value={headers.category} onChange={e => setHeaders({...headers, category: e.target.value})} className={hdrCls} style={{ color: colors.headerText }} />
                </th>
                <th className="p-2 text-center w-24">
                  <input value={headers.quantity} onChange={e => setHeaders({...headers, quantity: e.target.value})} className={hdrCls} style={{ color: colors.headerText }} />
                </th>
                <th className="p-2 text-center w-24">
                  <input value={headers.price} onChange={e => setHeaders({...headers, price: e.target.value})} className={hdrCls} style={{ color: colors.headerText }} />
                </th>
                <th className="p-2 text-center w-24">
                  <input value={headers.total} onChange={e => setHeaders({...headers, total: e.target.value})} className={hdrCls} style={{ color: colors.headerText }} />
                </th>
                <th className="p-2 w-10 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-200 dark:border-slate-800 group transition-colors"
                  style={{ backgroundColor: index % 2 === 1 ? colors.rowAltBg : '#ffffff' }}
                >
                  <td className="p-1.5 text-center text-slate-600 dark:text-slate-400 font-semibold text-xs">{index + 1}</td>
                  <td className="p-1.5" style={{ backgroundColor: colors.nameColBg === '#ffffff' ? 'transparent' : colors.nameColBg }}>
                    <input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 px-1.5 py-1 rounded text-xs font-medium transition-colors" placeholder="الاسم" />
                  </td>
                  <td className="p-1.5" style={{ backgroundColor: colors.descColBg === '#ffffff' ? 'transparent' : colors.descColBg }}>
                    <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} dir="rtl" className="w-full bg-transparent border border-transparent hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 px-1.5 py-1 rounded text-xs text-slate-600 transition-colors" placeholder="الوصف" />
                  </td>
                  <td className="p-1.5">
                    <input value={item.category} onChange={(e) => updateItem(item.id, 'category', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 px-1.5 py-1 rounded text-xs text-slate-600 transition-colors" placeholder="القسم" />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min="1" dir="ltr" value={item.quantity === 0 ? '' : item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} placeholder="0" style={{ textAlign: 'center' }} className="w-full bg-transparent border border-transparent hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 px-1.5 py-1 rounded text-xs font-bold text-slate-800 transition-colors" />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min="0" step="0.01" dir="ltr" value={item.price === 0 ? '' : item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} placeholder="0.00" style={{ textAlign: 'center' }} className="w-full bg-transparent border border-transparent hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 px-1.5 py-1 rounded text-xs font-bold text-slate-800 transition-colors" />
                  </td>
                  <td className="p-1.5 text-center font-bold text-xs rounded" style={{ backgroundColor: colors.totalColBg }}>
                    {fmt(item.total)}
                  </td>
                  <td className="p-1.5 text-center no-print">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                      <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {(discountAmount > 0 || taxAmount > 0) && (
                <>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td colSpan={6} className="p-2 text-right text-xs pr-4 text-slate-600">المجموع الفرعي</td>
                    <td className="p-1.5 text-center text-xs text-slate-700 font-semibold">{fmt(subtotal)}</td>
                    <td className="no-print"></td>
                  </tr>
                  {discountAmount > 0 && (
                    <tr className="bg-green-50">
                      <td colSpan={6} className="p-2 text-right text-xs pr-4 text-green-700">خصم ({discountValue}%)</td>
                      <td className="p-1.5 text-center text-xs text-green-700 font-semibold">- {fmt(discountAmount)}</td>
                      <td className="no-print"></td>
                    </tr>
                  )}
                  {taxAmount > 0 && (
                    <tr className="bg-orange-50">
                      <td colSpan={6} className="p-2 text-right text-xs pr-4 text-orange-700">ضريبة ({taxRate}%)</td>
                      <td className="p-1.5 text-center text-xs text-orange-700 font-semibold">+ {fmt(taxAmount)}</td>
                      <td className="no-print"></td>
                    </tr>
                  )}
                </>
              )}
              <tr className="border-t-2" style={{ backgroundColor: colors.grandTotalBg, color: colors.grandTotalText }}>
                <td colSpan={6} className="p-2 text-right font-black text-xs pr-4">المجموع الكلي</td>
                <td className="p-1.5 text-center font-black text-sm">{fmt(grandTotal)} <span className="text-xs font-bold opacity-80">د.أ</span></td>
                <td className="no-print" style={{ backgroundColor: colors.grandTotalBg }}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add Item */}
        <div className="flex items-center gap-3 no-print">
          <button onClick={addItem} className="flex items-center gap-1 text-primary font-bold hover:bg-primary/10 px-2 py-1 rounded text-xs transition-colors">
            <Plus className="w-3 h-3" />إضافة صنف
          </button>
        </div>

        {/* Discount & Tax */}
        <div className="no-print bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">الخصم والضريبة</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">نسبة الخصم (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={discountValue || ""} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary" placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">نسبة الضريبة (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={taxRate || ""} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary" placeholder="0" />
            </div>
          </div>
          {(discountAmount > 0 || taxAmount > 0) && (
            <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>المجموع الفرعي: <strong>{fmt(subtotal)} د.أ</strong></span>
              {discountAmount > 0 && <span className="text-green-600">خصم: <strong>-{fmt(discountAmount)} د.أ</strong></span>}
              {taxAmount > 0 && <span className="text-orange-600">ضريبة: <strong>+{fmt(taxAmount)} د.أ</strong></span>}
              <span className="font-black text-foreground">الإجمالي: <strong>{fmt(grandTotal)} د.أ</strong></span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1 no-print">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ملاحظات:</label>
          <textarea value={details.notes} onChange={(e) => setDetails({...details, notes: e.target.value})} className="w-full h-12 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all resize-none text-slate-700 dark:text-slate-300 text-xs" placeholder="شروط الدفع، مدة التوريد، إلخ..." />
        </div>
        {details.notes.trim() && (
          <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap">{details.notes}</div>
        )}

        {/* Closing Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
          <input value={details.closingText} onChange={e => setDetails({...details, closingText: e.target.value})} className="text-center text-base font-bold text-slate-900 dark:text-slate-50 bg-transparent border-b border-slate-300 focus:border-primary outline-none w-full max-w-xs focus:bg-slate-50 px-2 py-1 rounded-sm" placeholder="نص الختام" />
          <div className="w-full flex justify-end">
            <div className="flex flex-col items-center gap-2">
              <input value={details.signerTitle} onChange={e => setDetails({...details, signerTitle: e.target.value})} className="text-center text-sm font-bold text-slate-900 dark:text-slate-50 bg-transparent border-b border-slate-300 focus:border-primary outline-none focus:bg-slate-50 px-2 py-1 rounded-sm" placeholder="المدير العام / الاسم" />
              {stampSrc ? (
                <img src={stampSrc} alt="الختم" className="w-32 h-auto mt-2" />
              ) : (
                <label className="mt-2 cursor-pointer flex flex-col items-center gap-1 border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all no-print">
                  <input type="file" accept="image/*" className="hidden" onChange={handleStampUpload} />
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-400">رفع الختم</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
