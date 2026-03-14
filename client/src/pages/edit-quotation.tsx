import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  Plus, FileText, Save,
  Wand2, Trash2, CheckCircle2, ArrowRight,
  Phone, Mail, Globe, Package, X, BookmarkPlus
} from "lucide-react";
import { useQuotation, useUpdateQuotation, useParseText as useParseTextAPI } from "@/hooks/use-quotations";
import { useProducts, useCreateProduct } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/export-utils";
import { format } from "date-fns";
import logoImage from "@assets/لقطة_شاشة_2026-03-08_080127_1773036971718.png";
import stampImage from "@assets/لقطة_شاشة_2026-03-08_023328_1773047188235.png";

type Item = {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  imageUrl?: string;
};

export default function EditQuotation() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const quotationId = Number(id);

  const { data: quotation, isLoading, error } = useQuotation(quotationId);
  const updateMutation = useUpdateQuotation(quotationId);
  const parseMutation = useParseTextAPI();
  const createProductMutation = useCreateProduct();
  const { data: catalogProducts } = useProducts();

  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "", description: "", category: "", quantity: 1, unit: "وحدة", price: 0, total: 0 }
  ]);

  const [details, setDetails] = useState({
    quotationNumber: "",
    customerName: "",
    companyNameAr: "مؤسسة ومشاتل القادري الزراعية",
    companyLocationAr: "جرش – الرشايدة",
    companyNameEn: "Al-Qadri Agricultural Establishment",
    companyLocationEn: "Jerash - Al-Rashaidah",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    phone: "00962777772211",
    email: "tamerqadri@gmail.com",
    website: "www.alkadri-plants.com",
  });

  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const [headers] = useState({
    index: "#", name: "الاسم", description: "الوصف",
    quantity: "الكمية", price: "السعر", total: "الإجمالي"
  });

  useEffect(() => {
    if (quotation && !initialized) {
      setDetails(prev => ({
        ...prev,
        quotationNumber: quotation.quotationNumber,
        customerName: quotation.customerName,
        date: format(new Date(quotation.date), "yyyy-MM-dd"),
        notes: quotation.notes || "",
      }));
      if (quotation.items && quotation.items.length > 0) {
        setItems(quotation.items.map(item => ({
          id: String(item.id),
          name: item.name,
          description: item.description || "",
          category: (item as any).category || "",
          quantity: item.quantity,
          unit: "وحدة",
          price: Number(item.price),
          total: Number(item.total),
          imageUrl: (item as any).imageUrl || "",
        })));
      }
      setInitialized(true);
    }
  }, [quotation, initialized]);

  const subtotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
  const discountAmount = (subtotal * discountValue) / 100;
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100;
  const grandTotal = subtotal - discountAmount + taxAmount;

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

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", description: "", category: "", quantity: 1, unit: "وحدة", price: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updated.total = Number(updated.quantity) * Number(updated.price);
        }
        return updated;
      }
      return item;
    }));
  };

  const addFromCatalog = (product: any) => {
    setItems(prev => [...prev.filter(i => i.name.trim() !== "" || i.price > 0), {
      id: Date.now().toString() + Math.random(),
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      quantity: 1,
      unit: product.unit || "وحدة",
      price: Number(product.price),
      total: Number(product.price),
      imageUrl: product.imageUrl || "",
    }]);
    setShowCatalog(false);
    setCatalogSearch("");
  };

  const saveItemToCatalog = (item: Item) => {
    if (!item.name.trim()) {
      toast({ title: "الاسم مطلوب", description: "أدخل اسم المنتج قبل الحفظ في الكتالوج.", variant: "destructive" });
      return;
    }
    createProductMutation.mutate({
      name: item.name.trim(),
      description: item.description.trim() || undefined,
      price: String(item.price),
      unit: item.unit || "وحدة",
      category: item.category?.trim() || undefined,
      imageUrl: item.imageUrl || undefined,
    }, {
      onSuccess: () => toast({ title: "تم الحفظ في الكتالوج", description: `تم حفظ "${item.name}" في الكتالوج بنجاح.` }),
      onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
    });
  };

  const saveAllToCatalog = () => {
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast({ title: "لا توجد منتجات للحفظ", variant: "destructive" });
      return;
    }
    validItems.forEach(item => {
      createProductMutation.mutate({
        name: item.name.trim(),
        description: item.description.trim() || undefined,
        price: String(item.price),
        unit: item.unit || "وحدة",
        category: item.category?.trim() || undefined,
        imageUrl: item.imageUrl || undefined,
      });
    });
    toast({ title: "تم الحفظ في الكتالوج", description: `تم حفظ ${validItems.length} منتجات في الكتالوج.` });
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

  const handleUpdate = () => {
    if (!details.customerName.trim()) {
      toast({ title: "مطلوب اسم العميل", variant: "destructive" });
      return;
    }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast({ title: "مطلوب إضافة عناصر", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      quotationNumber: details.quotationNumber,
      customerName: details.customerName,
      date: new Date(details.date),
      notes: details.notes,
      grandTotal: grandTotal.toString(),
      items: validItems.map(i => ({
        name: i.name.trim(), description: i.description.trim(),
        category: i.category?.trim() || null,
        quantity: Math.max(1, i.quantity), price: String(Math.max(0, i.price)), total: String(Math.max(0, i.total)),
        imageUrl: i.imageUrl || null,
      }))
    }, {
      onSuccess: () => toast({ title: "تم التحديث", description: "تم حفظ التعديلات بنجاح." }),
      onError: (error) => toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" })
    });
  };

  const filteredCatalog = (catalogProducts || []).filter(p =>
    p.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">جاري تحميل العرض...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive text-xl font-bold">لم يتم العثور على العرض</p>
          <button onClick={() => navigate("/history")} className="text-primary hover:underline flex items-center gap-2 mx-auto">
            <ArrowRight className="w-4 h-4" />
            العودة إلى السجل
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-2 pb-20 min-h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 glass-panel p-2 rounded-xl sticky top-2 z-50 no-print">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/history")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="العودة">
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">تعديل عرض السعر</h1>
            <p className="text-muted-foreground text-xs hidden sm:block">رقم العرض: {details.quotationNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={saveAllToCatalog}
            disabled={createProductMutation.isPending}
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all dark:bg-indigo-900/20 dark:text-indigo-400 disabled:opacity-50"
            title="حفظ جميع المنتجات في الكتالوج"
            data-testid="btn-save-all-catalog"
          >
            <BookmarkPlus className="w-4 h-4" />
          </button>
          <button onClick={() => exportToPDF("quotation-document", `Quote-${details.quotationNumber}`, items, details, logoBase64 || logoImage)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:text-red-400" title="تصدير PDF">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 text-sm">
            {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
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
        <p className="text-muted-foreground text-xs">الصق محادثة واتساب أو قائمة عشوائية وسيقوم النظام بترتيبها في الجدول أدناه.</p>
        <div className="relative">
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="مثال: 5 شاشات سامسونج سعر الواحدة 1500..." className="w-full h-16 p-2 rounded-lg input-soft resize-none text-xs" />
          <button onClick={handleParseText} disabled={parseMutation.isPending || !pasteText.trim()} className="absolute bottom-2 left-2 flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all disabled:opacity-50 text-xs">
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
                {logoBase64 ? <img src={logoBase64} alt="Company Logo" className="w-full h-full object-contain p-2" /> : <img src={logoImage} alt="Default Logo" className="w-full h-full object-contain p-2" />}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer no-print" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center no-print pointer-events-none">
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 text-slate-700 bg-white px-2 py-1 rounded">تغيير</span>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-8">
                <div className="flex-1 space-y-1">
                  <input value={details.companyNameAr} onChange={(e) => setDetails({...details, companyNameAr: e.target.value})} className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-right focus:ring-0 px-2 py-1 rounded-sm" placeholder="اسم الشركة" />
                  <input value={details.companyLocationAr} onChange={(e) => setDetails({...details, companyLocationAr: e.target.value})} className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-right focus:ring-0 px-2 py-0.5 rounded-sm" placeholder="الموقع" />
                </div>
                <div className="flex-1 space-y-1">
                  <input value={details.companyNameEn} onChange={(e) => setDetails({...details, companyNameEn: e.target.value})} className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-left focus:ring-0 px-2 py-1 rounded-sm" placeholder="Company Name" />
                  <input value={details.companyLocationEn} onChange={(e) => setDetails({...details, companyLocationEn: e.target.value})} className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-left focus:ring-0 px-2 py-0.5 rounded-sm" placeholder="Location" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-slate-500">التاريخ</label>
              <input type="date" value={details.date} onChange={(e) => setDetails({...details, date: e.target.value})} className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 focus:border-primary outline-none py-1 w-full text-center" />
            </div>
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-slate-500">عرض سعر رقم</label>
              <input value={details.quotationNumber} onChange={(e) => setDetails({...details, quotationNumber: e.target.value})} className="text-lg font-black text-slate-900 dark:text-slate-50 bg-transparent border-none p-0 focus:ring-2 focus:ring-primary/30 w-full text-center focus:outline-none rounded" />
            </div>
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-slate-500 no-print">العميل</label>
              <input value={details.customerName} onChange={(e) => setDetails({...details, customerName: e.target.value})} className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 focus:border-primary outline-none py-1 w-full text-center no-print" placeholder="اسم العميل" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 flex-1">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-700">
                <th className="p-2 font-bold text-center w-6 text-xs">{headers.index}</th>
                <th className="p-2 font-bold text-right text-xs">{headers.name}</th>
                <th className="p-2 font-bold text-right text-xs">{headers.description}</th>
                <th className="p-2 font-bold text-right text-xs">القسم</th>
                <th className="p-2 font-bold text-center w-16 text-xs">{headers.quantity}</th>
                <th className="p-2 font-bold text-center w-16 text-xs">{headers.price}</th>
                <th className="p-2 font-bold text-center w-16 text-xs">{headers.total}</th>
                <th className="p-2 font-bold text-center w-28 text-xs">صورة</th>
                <th className="p-2 w-10 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="p-1.5 text-center text-slate-600 dark:text-slate-400 font-semibold text-xs">{index + 1}</td>
                  <td className="p-1.5">
                    <input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-medium truncate" placeholder="الاسم" />
                  </td>
                  <td className="p-1.5">
                    <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} dir="rtl" style={{ direction: 'rtl', unicodeBidi: 'isolate' }} className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-400 focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors truncate" placeholder="الوصف" />
                  </td>
                  <td className="p-1.5">
                    <input value={item.category} onChange={(e) => updateItem(item.id, 'category', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-400 focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors truncate" placeholder="القسم" />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min="1" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full text-center bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-medium" />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min="0" step="0.01" value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} className="w-full text-center bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-semibold" />
                  </td>
                  <td className="p-1.5 text-center font-bold text-slate-900 dark:text-slate-50 bg-slate-100 dark:bg-slate-800/50 rounded text-xs">{item.total.toLocaleString()}</td>
                  <td className="p-1 text-center">
                    <label className="relative cursor-pointer block w-24 h-24 mx-auto rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors group/img" title="انقر لرفع صورة">
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 no-print" onChange={(e) => handleItemImageUpload(item.id, e)} data-testid={`input-item-image-${item.id}`} />
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
                      <button onClick={() => saveItemToCatalog(item)} title="حفظ في الكتالوج" className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" data-testid={`btn-save-catalog-${item.id}`}>
                        <BookmarkPlus className="w-3 h-3" />
                      </button>
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
                    <td colSpan={6} className="p-2 text-right text-xs pr-4 text-slate-600 dark:text-slate-400">المجموع الفرعي</td>
                    <td className="p-1.5 text-center text-xs text-slate-700 dark:text-slate-300 font-semibold">{subtotal.toLocaleString()}</td>
                    <td></td>
                    <td className="no-print"></td>
                  </tr>
                  {discountAmount > 0 && (
                    <tr className="bg-green-50 dark:bg-green-900/10">
                      <td colSpan={6} className="p-2 text-right text-xs pr-4 text-green-700 dark:text-green-400">خصم ({discountValue}%)</td>
                      <td className="p-1.5 text-center text-xs text-green-700 dark:text-green-400 font-semibold">- {discountAmount.toLocaleString()}</td>
                      <td></td>
                      <td className="no-print"></td>
                    </tr>
                  )}
                  {taxAmount > 0 && (
                    <tr className="bg-orange-50 dark:bg-orange-900/10">
                      <td colSpan={6} className="p-2 text-right text-xs pr-4 text-orange-700 dark:text-orange-400">ضريبة ({taxRate}%)</td>
                      <td className="p-1.5 text-center text-xs text-orange-700 dark:text-orange-400 font-semibold">+ {taxAmount.toLocaleString()}</td>
                      <td></td>
                      <td className="no-print"></td>
                    </tr>
                  )}
                </>
              )}
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-950 text-white">
                <td colSpan={6} className="p-2 text-right font-black text-xs pr-4">المجموع الكلي</td>
                <td className="p-1.5 text-center font-black text-sm bg-primary/20 text-white">{grandTotal.toLocaleString()}</td>
                <td></td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 no-print">
          <button onClick={addItem} className="flex items-center gap-1 text-primary font-bold hover:bg-primary/10 px-2 py-1 rounded text-xs transition-colors">
            <Plus className="w-3 h-3" /> إضافة صنف
          </button>
          <button onClick={() => setShowCatalog(true)} className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1 rounded text-xs transition-colors">
            <Package className="w-3 h-3" /> اختر من الكتالوج
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
              <span>المجموع الفرعي: <strong>{subtotal.toLocaleString()}</strong></span>
              {discountAmount > 0 && <span className="text-green-600">خصم: <strong>-{discountAmount.toLocaleString()}</strong></span>}
              {taxAmount > 0 && <span className="text-orange-600">ضريبة: <strong>+{taxAmount.toLocaleString()}</strong></span>}
              <span className="font-black text-foreground">الإجمالي: <strong>{grandTotal.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          {details.notes.trim() && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ملاحظات:</label>
              <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded text-slate-700 text-xs whitespace-pre-wrap break-words line-clamp-2">{details.notes}</div>
            </div>
          )}
          <div className="space-y-1 no-print">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ملاحظات:</label>
            <textarea value={details.notes} onChange={(e) => setDetails({...details, notes: e.target.value})} className="w-full h-12 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:border-blue-500 focus:ring-1 transition-all resize-none text-slate-700 dark:text-slate-300 text-xs" placeholder="شروط الدفع، مدة التوريد، إلخ..." />
          </div>
        </div>

        {/* Closing */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center">
          <div className="w-full flex flex-col items-center gap-4">
            <div className="text-center text-base font-bold text-slate-900 dark:text-slate-50">واقبلوا فائق الاحترام....</div>
            <div className="w-full flex justify-end">
              <div className="flex flex-col items-center">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">المدير العام/ ثامر احمد القادري</div>
                <img src={stampImage} alt="Stamp" className="w-32 h-auto mt-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 text-center opacity-70">
          <div className="text-[10px] font-bold text-slate-900 dark:text-slate-50 mb-2">مؤسسة ومشاتل القادري الزراعية</div>
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

      {/* Catalog Modal */}
      {showCatalog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCatalog(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-2xl flex flex-col"
            style={{ width: '100%', maxWidth: '680px', maxHeight: '88vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                اختر من الكتالوج
              </h2>
              <button onClick={() => setShowCatalog(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Search */}
            <div className="px-4 py-3 border-b border-border shrink-0">
              <input
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="ابحث في المنتجات..."
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            {/* Grid */}
            <div className="overflow-y-auto flex-1 p-4">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">لا توجد منتجات{catalogSearch ? " مطابقة" : " في الكتالوج"}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {filteredCatalog.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addFromCatalog(p)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        textAlign: 'right',
                        borderRadius: '14px',
                        border: '1.5px solid var(--border)',
                        overflow: 'hidden',
                        background: 'var(--background)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      {/* Image — fixed 140px height, guaranteed to show */}
                      <div style={{ width: '100%', height: '140px', overflow: 'hidden', background: 'var(--secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Package className="w-10 h-10 text-muted-foreground opacity-25" />
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', lineHeight: 1.3, color: 'var(--foreground)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                          {p.name}
                        </div>
                        {p.description && (
                          <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>
                            {p.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
                            {p.unit}
                          </span>
                          <span style={{ fontWeight: 900, fontSize: '15px', color: 'var(--primary)' }}>
                            {Number(p.price).toLocaleString()} ر.س
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
