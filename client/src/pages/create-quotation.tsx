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
  description: string;
  quantity: number;
  price: number;
  total: number;
};

export default function CreateQuotation() {
  const { toast } = useToast();
  const createMutation = useCreateQuote();
  const parseMutation = useParseTextAPI();

  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "", description: "", quantity: 1, price: 0, total: 0 }
  ]);
  
  const [details, setDetails] = useState({
    quotationNumber: `Q-${Math.floor(Math.random() * 10000)}`,
    customerName: "",
    companyName: "مؤسسة ومشاتل القدري الزراعية",
    companyNameEn: "Al-Qadri Agricultural Foundation and Nurseries",
    companyLocation: "جرش - الرشيدية",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "نأمل أن ينال عرضنا إعجابكم. صالح لمدة 30 يوماً.",
  });

  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");

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
      description: "", 
      quantity: 1, 
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
    if (!details.customerName) {
      toast({ title: "مطلوب اسم العميل", variant: "destructive" });
      return;
    }
    
    createMutation.mutate({
      quotationNumber: details.quotationNumber,
      customerName: details.customerName,
      date: new Date(details.date),
      notes: details.notes,
      grandTotal: grandTotal.toString(),
      items: items.map(i => ({
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        price: i.price.toString(),
        total: i.total.toString(),
      }))
    }, {
      onSuccess: () => {
        toast({
          title: "تم الحفظ",
          description: "تم حفظ عرض السعر بنجاح.",
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
      <div id="quotation-document" className="bg-card border border-border shadow-xl shadow-black/5 rounded-2xl p-8 sm:p-12 space-y-12">
        
        {/* Header Section - Professional Layout */}
        <div className="flex flex-col sm:flex-row justify-between gap-8 border-b-2 border-border/50 pb-8">
          {/* Logo and Company Info */}
          <div className="flex flex-col sm:flex-row gap-6 flex-1 items-start">
            {/* Logo */}
            <div className="relative group w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-white dark:bg-white/5 flex flex-col items-center justify-center border border-border/30">
              {logoBase64 ? (
                <img src={logoBase64} alt="Company Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <img src={logoImage} alt="Default Logo" className="w-full h-full object-contain p-2" />
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer no-print"
                title="انقر لتحميل شعار جديد"
              />
              {!logoBase64 && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center no-print">
                  <span className="text-xs font-bold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">تغيير</span>
                </div>
              )}
            </div>

            {/* Company Details */}
            <div className="space-y-3 flex-1">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block no-print">اسم الشركة</label>
                <input 
                  value={details.companyName}
                  onChange={(e) => setDetails({...details, companyName: e.target.value})}
                  className="text-2xl font-black text-foreground bg-transparent border-none p-0 focus:ring-0 w-full"
                  placeholder="اسم الشركة"
                />
              </div>
              <input 
                value={details.companyNameEn}
                onChange={(e) => setDetails({...details, companyNameEn: e.target.value})}
                className="text-sm font-semibold text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full"
                placeholder="Company Name in English"
                dir="ltr"
              />
              <input 
                value={details.companyLocation}
                onChange={(e) => setDetails({...details, companyLocation: e.target.value})}
                className="text-sm text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full"
                placeholder="الموقع / المحافظة"
              />
            </div>
          </div>

          {/* Quote Number and Date - Right Side */}
          <div className="flex flex-col items-end justify-between gap-6 text-right">
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-muted-foreground/60 block mb-1">رقم العرض</span>
              <input 
                value={details.quotationNumber}
                onChange={(e) => setDetails({...details, quotationNumber: e.target.value})}
                className="text-3xl font-black text-primary bg-transparent border-none p-0 focus:ring-0"
                dir="ltr"
              />
            </div>
            
            <div className="text-right">
              <span className="text-xs font-bold text-muted-foreground block mb-2">التاريخ</span>
              <input 
                type="date"
                value={details.date}
                onChange={(e) => setDetails({...details, date: e.target.value})}
                className="text-sm font-semibold bg-transparent border-b-2 border-primary/30 focus:border-primary outline-none py-1 px-0 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div className="bg-secondary/30 rounded-xl p-6 border border-border/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">عرض السعر مقدم لـ:</label>
              <input 
                value={details.customerName}
                onChange={(e) => setDetails({...details, customerName: e.target.value})}
                className="w-full px-4 py-3 bg-background border border-border/50 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                placeholder="اسم العميل أو الشركة"
              />
            </div>
          </div>
        </div>

        {/* Editable Table */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">تفاصيل البضائع والخدمات</h3>
          <div className="overflow-x-auto rounded-xl border border-border/30">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gradient-to-l from-primary/20 to-primary/10 text-foreground border-b border-border">
                  <th className="p-4 font-bold text-center w-12">#</th>
                  <th className="p-4 font-bold text-right">الصنف</th>
                  <th className="p-4 font-bold text-right">الوصف</th>
                  <th className="p-4 font-bold text-center w-28">الكمية</th>
                  <th className="p-4 font-bold text-center w-32">السعر الواحد</th>
                  <th className="p-4 font-bold text-center w-32">الإجمالي</th>
                  <th className="p-4 w-12 no-print"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                    <td className="p-3 text-center text-muted-foreground font-medium">{index + 1}</td>
                    <td className="p-2">
                      <input 
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary px-2 py-1.5 rounded-md focus:bg-background transition-colors"
                        placeholder="اسم الصنف"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary px-2 py-1.5 rounded-md focus:bg-background transition-colors text-sm text-muted-foreground"
                        placeholder="تفاصيل إضافية"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-primary px-2 py-1.5 rounded-md focus:bg-background transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number"
                        min="0"
                        value={item.price || ''}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-primary px-2 py-1.5 rounded-md focus:bg-background transition-colors font-medium"
                      />
                    </td>
                    <td className="p-3 text-center font-bold text-primary bg-primary/5 rounded-md my-1">
                      {item.total.toLocaleString()}
                    </td>
                    <td className="p-2 text-center no-print">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
            className="flex items-center gap-2 text-primary font-bold hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors no-print"
          >
            <Plus className="w-5 h-5" />
            إضافة صنف جديد
          </button>
        </div>

        {/* Footer & Totals */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-8">
          <div className="w-full sm:w-1/2 space-y-2">
            <label className="text-sm font-bold text-foreground">ملاحظات وشروط:</label>
            <textarea 
              value={details.notes}
              onChange={(e) => setDetails({...details, notes: e.target.value})}
              className="w-full h-32 p-3 bg-secondary/30 border border-border/50 rounded-xl focus:border-primary focus:bg-background transition-all resize-none text-muted-foreground"
              placeholder="شروط الدفع، مدة التوريد، إلخ..."
            />
          </div>

          <div className="w-full sm:w-1/3 bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg shadow-primary/20">
            <div className="flex justify-between items-center mb-4">
              <span className="text-primary-foreground/80 font-medium">المجموع الفرعي:</span>
              <span className="font-semibold">{grandTotal.toLocaleString()}</span>
            </div>
            {/* Can add tax row here if needed */}
            <div className="h-px bg-primary-foreground/20 w-full my-4" />
            <div className="flex justify-between items-center text-xl">
              <span className="font-bold">الإجمالي الكلي:</span>
              <span className="font-black text-2xl tracking-tight">{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
