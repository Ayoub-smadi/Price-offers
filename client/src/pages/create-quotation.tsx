import { useState, useRef } from "react";
import { 
  Plus, FileText, Download, Printer, Save, FileSpreadsheet, 
  Wand2, Trash2, Image as ImageIcon, CheckCircle2 
} from "lucide-react";
import { useCreateQuotation as useCreateQuote, useParseText as useParseTextAPI } from "@/hooks/use-quotations";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel, exportToWord } from "@/lib/export-utils";
import { format } from "date-fns";
import logoImage from "@assets/image_1772873421057.png";

type Item = {
  id: string;
  name: string;
  botanicalName: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
};

export default function CreateQuotation() {
  const { toast } = useToast();
  const createMutation = useCreateQuote();
  const parseMutation = useParseTextAPI();

  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "", botanicalName: "", description: "", quantity: 1, unit: "وحدة", price: 0, total: 0 }
  ]);
  
  const [details, setDetails] = useState({
    quotationNumber: `${format(new Date(), "yyyyMMdd")}`,
    customerName: "",
    companyName: "مؤسسة ومشاتل القدري الزراعية",
    companyNameEn: "Al-Qadri Agricultural Foundation and Nurseries",
    companyLocation: "جرش – الرشايدة",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    phone: "00962777772211",
    email: "thamerqadri@gmail.com",
    website: "www.alkadri-plants.com",
  });

  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [headers, setHeaders] = useState({
    index: "#",
    name: "الاسم",
    description: "الوصف",
    quantity: "الكمية",
    price: "السعر",
    total: "الإجمالي"
  });

  const grandTotal = items.reduce((acc, item) => acc + (item.total || 0), 0);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      name: "", 
      botanicalName: "", 
      description: "", 
      quantity: 1, 
      unit: "وحدة",
      price: 0, 
      total: 0 
    }]);
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

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    
    parseMutation.mutate({ text: pasteText }, {
      onSuccess: (data) => {
        const newItems = data.items.map(i => ({
          id: Date.now().toString() + Math.random(),
          name: i.name || "عنصر غير معروف",
          description: i.description || "",
          quantity: i.quantity || 1,
          price: i.price || 0,
          total: (i.quantity || 1) * (i.price || 0)
        }));
        
        // Remove empty first item if it exists
        const filteredItems = items.filter(i => i.name.trim() !== "" || i.price > 0);
        setItems([...filteredItems, ...newItems]);
        setPasteText("");
        
        toast({
          title: "تم التحليل بنجاح",
          description: `تمت إضافة ${newItems.length} عناصر إلى الجدول.`,
        });
      },
      onError: () => {
        toast({
          title: "خطأ في التحليل",
          description: "تأكد من صحة النص والمحاولة مرة أخرى.",
          variant: "destructive"
        });
      }
    });
  };

  const handleSave = () => {
    if (!details.customerName.trim()) {
      toast({ title: "مطلوب اسم العميل", variant: "destructive" });
      return;
    }
    
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast({ title: "مطلوب إضافة عناصر", description: "أضف على الأقل عنصر واحد", variant: "destructive" });
      return;
    }
    
    createMutation.mutate({
      quotationNumber: details.quotationNumber,
      customerName: details.customerName,
      date: new Date(details.date),
      notes: details.notes,
      grandTotal: grandTotal.toString(),
      items: validItems.map(i => ({
        name: i.name.trim(),
        description: [i.botanicalName, i.description].filter(Boolean).join('\n'),
        quantity: Math.max(1, i.quantity),
        price: Math.max(0, i.price).toString(),
        total: Math.max(0, i.total).toString(),
      }))
    }, {
      onSuccess: () => {
        toast({
          title: "تم الحفظ",
          description: "تم حفظ عرض السعر بنجاح.",
        });
      },
      onError: (error) => {
        toast({
          title: "خطأ في الحفظ",
          description: error.message || "فشل حفظ عرض السعر",
          variant: "destructive"
        });
      }
    });
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-32">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl sticky top-4 z-50 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إنشاء عرض سعر جديد</h1>
          <p className="text-muted-foreground text-sm">أدخل البيانات أو الصق النص لتحويله لجدول تلقائياً</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={printDocument}
            className="p-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
            title="طباعة"
          >
            <Printer className="w-5 h-5" />
          </button>
          
          <div className="h-8 w-px bg-border mx-1" />
          
          <button 
            onClick={() => exportToPDF("quotation-document", `Quote-${details.quotationNumber}`)}
            className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:text-red-400"
            title="تصدير PDF"
          >
            <FileText className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => exportToExcel(items, { ...details, grandTotal })}
            className="p-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all dark:bg-green-900/20 dark:text-green-400"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => exportToWord(items, { ...details, grandTotal })}
            className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all dark:bg-blue-900/20 dark:text-blue-400"
            title="تصدير Word"
          >
            <Download className="w-5 h-5" />
          </button>

          <button 
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {createMutation.isPending ? "جاري الحفظ..." : "حفظ العرض"}
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Smart Paste Area - No Print */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 no-print border-primary/20">
        <div className="flex items-center gap-3 text-primary">
          <Wand2 className="w-6 h-6" />
          <h2 className="text-xl font-bold">التحليل الذكي للنصوص</h2>
        </div>
        <p className="text-muted-foreground text-sm">الصق محادثة واتساب أو قائمة عشوائية وسيقوم النظام بترتيبها في الجدول أدناه.</p>
        <div className="relative">
          <textarea 
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="مثال: 5 شاشات سامسونج سعر الواحدة 1500، و 2 كيبورد سعر 300..."
            className="w-full h-32 p-4 rounded-xl input-soft resize-none"
          />
          <button 
            onClick={handleParseText}
            disabled={parseMutation.isPending || !pasteText.trim()}
            className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            {parseMutation.isPending ? "جاري التحليل..." : "حلل النص"}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DOCUMENT AREA (Printable) */}
      <div id="quotation-document" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-10 sm:p-12 space-y-8 print:shadow-none print:border-slate-300">
        
        {/* Header Section - Professional Layout */}
        <div className="space-y-8 pb-8 border-b-2 border-slate-200 dark:border-slate-800">
          {/* Logo Section */}
          <div className="flex flex-col items-center">
            <div className="relative group w-32 h-32 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center border-2 border-slate-300 dark:border-slate-700 shadow-md hover:shadow-lg transition-all">
              {logoBase64 ? (
                <img src={logoBase64} alt="Company Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
                  <img src={logoImage} alt="Default Logo" className="w-full h-full object-contain p-2" />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer no-print"
                title="انقر لتحميل شعار جديد"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center no-print pointer-events-none">
                <div className="text-center">
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity block text-slate-700 dark:text-slate-300">تغيير الشعار</span>
                </div>
              </div>
            </div>
          </div>

          {/* Company Info - Centered and Professional */}
          <div className="space-y-3 text-center">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block no-print">اسم الشركة</label>
              <input 
                value={details.companyName}
                onChange={(e) => setDetails({...details, companyName: e.target.value})}
                className="text-3xl font-black text-slate-900 dark:text-slate-50 bg-transparent border-none p-0 focus:ring-0 w-full text-center focus:outline-none"
                placeholder="اسم الشركة"
              />
            </div>
            <div className="space-y-1">
              <input 
                value={details.companyNameEn}
                onChange={(e) => setDetails({...details, companyNameEn: e.target.value})}
                className="text-sm font-semibold text-slate-600 dark:text-slate-400 bg-transparent border-none p-0 focus:ring-0 w-full text-center focus:outline-none"
                placeholder="Company Name in English"
                dir="ltr"
              />
              <input 
                value={details.companyLocation}
                onChange={(e) => setDetails({...details, companyLocation: e.target.value})}
                className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none p-0 focus:ring-0 w-full text-center focus:outline-none"
                placeholder="الموقع"
              />
            </div>
          </div>

          {/* Meta Information - Clean Grid */}
          <div className="grid grid-cols-3 gap-6 pt-4">
            <div className="text-center">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">التاريخ</label>
              <input 
                type="date"
                value={details.date}
                onChange={(e) => setDetails({...details, date: e.target.value})}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 outline-none py-2 px-0 w-full text-center"
              />
            </div>
            <div className="text-center">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">عرض سعر رقم</label>
              <input 
                value={details.quotationNumber}
                onChange={(e) => setDetails({...details, quotationNumber: e.target.value})}
                className="text-2xl font-black text-slate-900 dark:text-slate-50 bg-transparent border-none p-0 focus:ring-0 w-full text-center focus:outline-none"
              />
            </div>
            <div className="text-center">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block no-print">العميل</label>
              <input 
                value={details.customerName}
                onChange={(e) => setDetails({...details, customerName: e.target.value})}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 outline-none py-2 px-0 w-full text-center no-print"
                placeholder="اسم العميل"
              />
            </div>
          </div>
        </div>

        {/* Editable Table - Professional */}
        <div className="overflow-x-auto rounded-xl border-2 border-slate-200 dark:border-slate-800">
          <table className="w-full text-right text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-950 text-white border-b-2 border-slate-700 dark:border-slate-800">
                <th className="p-4 font-bold text-center w-8 text-sm">
                  {headers.index}
                </th>
                <th className="p-4 font-bold text-right text-sm">
                  {headers.name}
                </th>
                <th className="p-4 font-bold text-right text-sm">
                  {headers.description}
                </th>
                <th className="p-4 font-bold text-center w-20 text-sm">
                  {headers.quantity}
                </th>
                <th className="p-4 font-bold text-center w-24 text-sm">
                  {headers.price}
                </th>
                <th className="p-4 font-bold text-center w-24 text-sm">
                  {headers.total}
                </th>
                <th className="p-4 w-8 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="p-3 text-center text-slate-600 dark:text-slate-400 font-semibold">{index + 1}</td>
                  <td className="p-3">
                    <input 
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-2 py-1.5 rounded text-sm focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-medium"
                      placeholder="الاسم"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors"
                      placeholder="الوصف"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input 
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-2 py-1.5 rounded text-sm focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-medium"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input 
                      type="number"
                      min="0"
                      value={item.price || ''}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-2 py-1.5 rounded text-sm focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-semibold"
                    />
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-50 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                    {item.total.toLocaleString()}
                  </td>
                  <td className="p-3 text-center no-print">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button 
          onClick={addItem}
          className="flex items-center gap-2 text-primary font-bold hover:bg-primary/10 px-3 py-2 rounded-lg text-sm transition-colors no-print"
        >
          <Plus className="w-4 h-4" />
          إضافة صنف جديد
        </button>

        {/* Footer Section */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ملاحظات:</label>
            <textarea 
              value={details.notes}
              onChange={(e) => setDetails({...details, notes: e.target.value})}
              className="w-full h-20 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all resize-none text-slate-700 dark:text-slate-300 text-sm"
              placeholder="شروط الدفع، مدة التوريد، إلخ..."
            />
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-white rounded-xl p-5 text-center shadow-lg">
            <div className="text-sm font-semibold mb-1 opacity-90">المجموع الكلي</div>
            <div className="text-3xl font-black">{grandTotal.toLocaleString()}</div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="border-t-2 border-slate-200 dark:border-slate-800 pt-6 text-center text-xs space-y-3">
          <div className="font-bold text-slate-900 dark:text-slate-50 text-sm">مؤسسة ومشاتل القدري الزراعية</div>
          <div className="space-y-2 text-slate-600 dark:text-slate-400">
            <input 
              value={details.phone}
              onChange={(e) => setDetails({...details, phone: e.target.value})}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-center w-full focus:outline-none font-semibold"
              dir="ltr"
            />
            <input 
              value={details.email}
              onChange={(e) => setDetails({...details, email: e.target.value})}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-center w-full focus:outline-none"
              dir="ltr"
            />
            <input 
              value={details.website}
              onChange={(e) => setDetails({...details, website: e.target.value})}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-center w-full focus:outline-none"
              dir="ltr"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
