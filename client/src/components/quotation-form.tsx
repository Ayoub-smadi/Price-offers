import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Plus, FileText, Save, Wand2, Trash2, CheckCircle2,
  Phone, Mail, Globe, RotateCcw, MessageCircle
} from "lucide-react";
import { useCreateQuotation as useCreateQuote, useParseText as useParseTextAPI } from "@/hooks/use-quotations";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/export-utils";
import { format } from "date-fns";
import logoImage from "@assets/لقطة_شاشة_2026-03-08_080127_1773036971718.png";
import stampImage from "@assets/لقطة_شاشة_2026-03-08_023328_1773047188235.png";

type Item = {
  id: string; name: string; description: string; category: string;
  quantity: number; unit: string; price: number; total: number; imageUrl?: string;
};

type Headers = {
  index: string; image: string; name: string; description: string;
  category: string; quantity: string; price: string; total: string;
};

type Details = {
  quotationNumber: string; customerName: string;
  companyNameAr: string; companyLocationAr: string;
  companyNameEn: string; companyLocationEn: string;
  date: string; notes: string; phone: string; email: string; website: string;
  closingText: string; signerTitle: string; footerCompany: string;
};

const defaultDetails = (): Details => ({
  quotationNumber: `${format(new Date(), "yyyyMMdd")}`,
  customerName: "",
  companyNameAr: "مؤسسة ومشاتل القادري الزراعية",
  companyLocationAr: "جرش – الرشايدة",
  companyNameEn: "Al-Qadri Agricultural Establishment",
  companyLocationEn: "Jerash - Al-Rashaidah",
  date: format(new Date(), "yyyy-MM-dd"),
  notes: "", phone: "00962777772211",
  email: "tamerqadri@gmail.com", website: "www.alkadri-plants.com",
  closingText: "واقبلوا فائق الاحترام....",
  signerTitle: "المدير العام/ ثامر احمد القادري",
  footerCompany: "مؤسسة ومشاتل القادري الزراعية",
});

const defaultItems = (): Item[] => [
  { id: "1", name: "", description: "", category: "", quantity: 1, unit: "وحدة", price: 0, total: 0 }
];

const defaultHeaders = (): Headers => ({
  index: "#", image: "الصورة", name: "الاسم", description: "الوصف",
  category: "القسم", quantity: "الكمية", price: "السعر", total: "الإجمالي",
});

interface QuotationFormProps {
  draftKey?: string;
  embedMode?: boolean;
}

export function QuotationForm({ draftKey = "aq_draft_quotation", embedMode = false }: QuotationFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const createMutation = useCreateQuote();
  const parseMutation = useParseTextAPI();

  const loadDraft = () => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const draft = loadDraft();

  const [items, setItems] = useState<Item[]>(draft?.items ?? defaultItems());
  const [details, setDetails] = useState<Details>(draft?.details ?? defaultDetails());
  const [headers, setHeaders] = useState<Headers>(draft?.headers ?? defaultHeaders());
  const [logoBase64, setLogoBase64] = useState<string | null>(draft?.logoBase64 ?? null);
  const [pasteText, setPasteText] = useState("");
  const [discountValue, setDiscountValue] = useState<number>(draft?.discountValue ?? 0);
  const [taxRate, setTaxRate] = useState<number>(draft?.taxRate ?? 0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ items, details, headers, logoBase64, discountValue, taxRate }));
    } catch {}
  }, [items, details, headers, logoBase64, discountValue, taxRate, draftKey]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const clearDraft = () => {
    sessionStorage.removeItem(draftKey);
    setItems(defaultItems());
    setDetails(defaultDetails());
    setHeaders(defaultHeaders());
    setLogoBase64(null);
    setDiscountValue(0);
    setTaxRate(0);
    setSavedSuccess(false);
  };

  const subtotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
  const discountAmount = (subtotal * discountValue) / 100;
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100;
  const grandTotal = subtotal - discountAmount + taxAmount;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result as string);
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
        toast({ title: "تم التحليل بنجاح", description: `تمت إضافة ${newItems.length} عناصر إلى الجدول.` });
      },
      onError: () => toast({ title: "خطأ في التحليل", variant: "destructive" })
    });
  };

  const handleWhatsApp = () => {
    const validItems = items.filter(i => i.name.trim());
    const itemLines = validItems.map((i, idx) => `${idx + 1}. ${i.name} × ${i.quantity} = ${i.total.toLocaleString()} د`).join('\n');
    const discLine = discountAmount > 0 ? `\nخصم: -${discountAmount.toLocaleString()} د` : '';
    const taxLine = taxAmount > 0 ? `\nضريبة (${taxRate}%): +${taxAmount.toLocaleString()} د` : '';
    const msg = `*عرض سعر رقم: ${details.quotationNumber}*\nالعميل: ${details.customerName || '—'}\nالتاريخ: ${details.date}\n\n${itemLines}${discLine}${taxLine}\n──────────────────\n*المجموع الكلي: ${grandTotal.toLocaleString()} دينار*\n\n${details.companyNameAr}\n☎ ${details.phone}`;
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
        if (embedMode) {
          setSavedSuccess(true);
          setTimeout(() => { clearDraft(); }, 2000);
        } else {
          clearDraft();
          navigate("/history");
        }
      },
      onError: (error) => toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" })
    });
  };

  const hdrCls = "bg-transparent border-none focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-white/30 rounded px-1 text-center text-xs font-bold text-white w-full";

  if (savedSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-black text-slate-800">تم إرسال عرض السعر بنجاح!</h2>
        <p className="text-slate-500 text-sm">سيتم مسح النموذج تلقائياً خلال ثانيتين...</p>
        <button onClick={clearDraft} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity">
          إنشاء عرض جديد الآن
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-2 pb-20 min-h-screen flex flex-col">

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 glass-panel p-2 rounded-xl sticky top-2 z-50 no-print">
        <div>
          <h1 className="text-lg font-bold text-foreground">إنشاء عرض سعر جديد</h1>
          <p className="text-muted-foreground text-xs hidden sm:block">أدخل البيانات أو الصق النص لتحويله لجدول تلقائياً</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearDraft} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-red-500 transition-all dark:bg-slate-800 dark:text-slate-400" title="مسح وبدء من جديد">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleWhatsApp} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all dark:bg-green-900/20 dark:text-green-400" title="إرسال واتساب">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportToPDF("quotation-document", `Quote-${details.quotationNumber}`, items, details, logoBase64 || logoImage)}
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

      {/* Smart Paste Area */}
      <div className="glass-panel p-3 rounded-lg space-y-2 no-print border-primary/20">
        <div className="flex items-center gap-2 text-primary">
          <Wand2 className="w-5 h-5" />
          <h2 className="text-sm font-bold">التحليل الذكي للنصوص</h2>
        </div>
        <p className="text-muted-foreground text-xs">
          الصق النص على هذا النمط: <span className="font-bold text-foreground">الكمية / الاسم / الوصف / القسم / السعر</span> — نص عادي أو محادثة واتساب وسيقوم النظام بترتيبها في الجدول أدناه.
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

      {/* DOCUMENT AREA */}
      <div id="quotation-document" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl p-5 sm:p-6 space-y-3 flex-1 flex flex-col print:shadow-none print:border-slate-300 print:p-4 print:rounded-none">

        {/* Header */}
        <div className="pb-6 border-b-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="relative group w-32 h-32 overflow-hidden bg-white dark:bg-slate-900 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
                <img src={logoBase64 || logoImage} alt="Logo" className="w-full h-full object-contain p-2" />
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer no-print" title="انقر لتحميل شعار جديد" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center no-print pointer-events-none">
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded">تغيير</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-start gap-8">
                <div className="flex-1 space-y-1">
                  <input value={details.companyNameAr} onChange={(e) => setDetails({...details, companyNameAr: e.target.value})} className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-right focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-1 rounded-sm" placeholder="اسم الشركة" />
                  <input value={details.companyLocationAr} onChange={(e) => setDetails({...details, companyLocationAr: e.target.value})} className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-right focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-0.5 rounded-sm" placeholder="الموقع" />
                </div>
                <div className="flex-1 space-y-1">
                  <input value={details.companyNameEn} onChange={(e) => setDetails({...details, companyNameEn: e.target.value})} className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-left focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-1 rounded-sm" placeholder="Company Name" />
                  <input value={details.companyLocationEn} onChange={(e) => setDetails({...details, companyLocationEn: e.target.value})} className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-left focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-0.5 rounded-sm" placeholder="Location" />
                </div>
              </div>
            </div>
          </div>
          <div data-pdf-info-row="true" className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800" style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <div className="flex-1 text-center space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">التاريخ</label>
              <input type="date" value={details.date} onChange={(e) => setDetails({...details, date: e.target.value})} className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary outline-none py-1 px-0 w-full text-center" />
            </div>
            <div className="flex-1 text-center space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">عرض سعر رقم</label>
              <input value={details.quotationNumber} onChange={(e) => setDetails({...details, quotationNumber: e.target.value})} className="text-lg font-black text-slate-900 dark:text-slate-50 bg-transparent border-none p-0 focus:ring-2 focus:ring-primary/30 w-full text-center focus:outline-none rounded" />
            </div>
            <div className="flex-1 text-center space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 no-print block">العميل</label>
              <input value={details.customerName} onChange={(e) => setDetails({...details, customerName: e.target.value})} className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary outline-none py-1 px-0 w-full text-center no-print" placeholder="اسم العميل" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-700">
                <th className="p-2 text-center w-6"><input value={headers.index} onChange={e => setHeaders({...headers, index: e.target.value})} className={hdrCls} style={{ width: '2rem', color: '#ffffff' }} /></th>
                <th className="p-2 text-right"><input value={headers.name} onChange={e => setHeaders({...headers, name: e.target.value})} className={hdrCls} style={{ color: '#ffffff' }} /></th>
                <th className="p-2 text-right"><input value={headers.description} onChange={e => setHeaders({...headers, description: e.target.value})} className={hdrCls} style={{ color: '#ffffff' }} /></th>
                <th className="p-2 text-right"><input value={headers.category} onChange={e => setHeaders({...headers, category: e.target.value})} className={hdrCls} style={{ color: '#ffffff' }} /></th>
                <th className="p-2 text-center w-24"><input value={headers.quantity} onChange={e => setHeaders({...headers, quantity: e.target.value})} className={hdrCls} style={{ color: '#ffffff' }} /></th>
                <th className="p-2 text-center w-24"><input value={headers.price} onChange={e => setHeaders({...headers, price: e.target.value})} className={hdrCls} style={{ color: '#ffffff' }} /></th>
                <th className="p-2 text-center w-24"><input value={headers.total} onChange={e => setHeaders({...headers, total: e.target.value})} className={hdrCls} style={{ color: '#ffffff' }} /></th>
                <th className="p-2 text-center w-28"><input value={headers.image} onChange={e => setHeaders({...headers, image: e.target.value})} className={hdrCls} style={{ color: '#ffffff' }} /></th>
                <th className="p-2 w-10 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="p-1.5 text-center text-slate-600 dark:text-slate-400 font-semibold text-xs">{index + 1}</td>
                  <td className="p-1.5">
                    <input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-medium" placeholder="الاسم" />
                  </td>
                  <td className="p-1.5">
                    <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} dir="rtl" className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-400 focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors" placeholder="الوصف" />
                  </td>
                  <td className="p-1.5">
                    <input value={item.category} onChange={(e) => updateItem(item.id, 'category', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-400 focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors" placeholder="القسم" />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min="1" dir="ltr" value={item.quantity === 0 ? '' : item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} placeholder="0" style={{ textAlign: 'center' }} className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-bold text-slate-800 dark:text-slate-100" />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min="0" step="0.01" dir="ltr" value={item.price === 0 ? '' : item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} placeholder="0.00" style={{ textAlign: 'center' }} className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-bold text-slate-800 dark:text-slate-100" />
                  </td>
                  <td className="p-1.5 text-center font-bold text-slate-900 dark:text-slate-50 bg-slate-100 dark:bg-slate-800/50 rounded text-xs">{fmt(item.total)}</td>
                  <td className="p-1 text-center">
                    <label className="relative cursor-pointer block w-24 h-24 mx-auto rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors group/img" title="انقر لرفع صورة">
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 no-print" onChange={(e) => handleItemImageUpload(item.id, e)} />
                      {item.imageUrl ? (
                        <>
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center no-print">
                            <Plus className="w-3 h-3 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 no-print">
                          <Plus className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                    </label>
                  </td>
                  <td className="p-1.5 text-center no-print">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                      <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
                  <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <td colSpan={7} className="p-2 text-right text-xs pr-4 text-slate-600 dark:text-slate-400">المجموع الفرعي</td>
                    <td className="p-1.5 text-center text-xs text-slate-700 dark:text-slate-300 font-semibold">{fmt(subtotal)}</td>
                    <td></td><td className="no-print"></td>
                  </tr>
                  {discountAmount > 0 && (
                    <tr className="bg-green-50 dark:bg-green-900/10">
                      <td colSpan={7} className="p-2 text-right text-xs pr-4 text-green-700 dark:text-green-400">خصم ({discountValue}%)</td>
                      <td className="p-1.5 text-center text-xs text-green-700 dark:text-green-400 font-semibold">- {fmt(discountAmount)}</td>
                      <td></td><td className="no-print"></td>
                    </tr>
                  )}
                  {taxAmount > 0 && (
                    <tr className="bg-orange-50 dark:bg-orange-900/10">
                      <td colSpan={7} className="p-2 text-right text-xs pr-4 text-orange-700 dark:text-orange-400">ضريبة ({taxRate}%)</td>
                      <td className="p-1.5 text-center text-xs text-orange-700 dark:text-orange-400 font-semibold">+ {fmt(taxAmount)}</td>
                      <td></td><td className="no-print"></td>
                    </tr>
                  )}
                </>
              )}
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-950 text-white">
                <td colSpan={7} className="p-2 text-right font-black text-xs pr-4">المجموع الكلي</td>
                <td className="p-1.5 text-center font-black text-sm bg-primary/20 text-white">{fmt(grandTotal)} <span className="text-xs font-bold opacity-80">د.أ</span></td>
                <td className="bg-slate-900 dark:bg-slate-950"></td>
                <td className="no-print bg-slate-900 dark:bg-slate-950"></td>
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
              <span className="font-black text-foreground">الإجمالي النهائي: <strong>{fmt(grandTotal)} د.أ</strong></span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1 no-print">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ملاحظات:</label>
          <textarea value={details.notes} onChange={(e) => setDetails({...details, notes: e.target.value})} className="w-full h-12 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all resize-none text-slate-700 dark:text-slate-300 text-xs" placeholder="شروط الدفع، مدة التوريد، إلخ..." />
        </div>
        {details.notes.trim() && (
          <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap break-words">{details.notes}</div>
        )}

        {/* Closing Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
          <input value={details.closingText} onChange={e => setDetails({...details, closingText: e.target.value})} className="text-center text-base font-bold text-slate-900 dark:text-slate-50 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full max-w-xs focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-1 rounded-sm" placeholder="نص الختام" />
          <div className="w-full flex justify-end">
            <div className="flex flex-col items-center">
              <input value={details.signerTitle} onChange={e => setDetails({...details, signerTitle: e.target.value})} className="text-center text-sm font-bold text-slate-900 dark:text-slate-50 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-1 rounded-sm" placeholder="المدير العام / الاسم" />
              <img src={stampImage} alt="Stamp" className="w-32 h-auto mt-4" />
            </div>
          </div>
        </div>

        {/* Contact Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 text-center opacity-70">
          <input value={details.footerCompany} onChange={e => setDetails({...details, footerCompany: e.target.value})} className="text-[10px] font-bold text-slate-900 dark:text-slate-50 bg-transparent border-none focus:outline-none focus:ring-0 text-center w-full mb-2" placeholder="اسم الشركة في التذييل" />
          <div className="flex items-center justify-center gap-4 text-slate-600 dark:text-slate-400" dir="ltr">
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <input value={details.phone} onChange={(e) => setDetails({...details, phone: e.target.value})} className="text-[10px] bg-transparent border-none p-0 focus:ring-0 focus:outline-none font-semibold w-28" dir="ltr" />
            </div>
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <input value={details.email} onChange={(e) => setDetails({...details, email: e.target.value})} className="text-[10px] bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-36" dir="ltr" />
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 flex-shrink-0" />
              <input value={details.website} onChange={(e) => setDetails({...details, website: e.target.value})} className="text-[10px] bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-36" dir="ltr" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
