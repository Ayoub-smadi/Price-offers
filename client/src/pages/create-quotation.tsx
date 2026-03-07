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
    notes: '"واقبلوا فائق الاحترام...."',
    phone: "00962777772211",
    email: "thamerqadri@gmail.com",
    website: "www.alkadri-plants.com",
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
        description: `${i.botanicalName}\n${i.description}`,
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
      <div id="quotation-document" className="bg-card border border-border shadow-xl shadow-black/5 rounded-2xl p-8 sm:p-10 space-y-8">
        
        {/* Header Section - Professional Layout */}
        <div className="space-y-6 text-center pb-6 border-b-2 border-border/30">
          {/* Logo */}
          <div className="relative group w-24 h-24 mx-auto rounded-xl overflow-hidden bg-white dark:bg-white/5 flex flex-col items-center justify-center border border-border/30">
            {logoBase64 ? (
              <img src={logoBase64} alt="Company Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <img src={logoImage} alt="Default Logo" className="w-full h-full object-contain p-1" />
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

          {/* Company Info */}
          <div className="space-y-1">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block no-print">اسم الشركة</label>
              <input 
                value={details.companyName}
                onChange={(e) => setDetails({...details, companyName: e.target.value})}
                className="text-xl font-black text-foreground bg-transparent border-none p-0 focus:ring-0 w-full text-center"
                placeholder="اسم الشركة"
              />
            </div>
            <input 
              value={details.companyNameEn}
              onChange={(e) => setDetails({...details, companyNameEn: e.target.value})}
              className="text-xs font-semibold text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full text-center"
              placeholder="Company Name in English"
              dir="ltr"
            />
            <input 
              value={details.companyLocation}
              onChange={(e) => setDetails({...details, companyLocation: e.target.value})}
              className="text-xs text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full text-center"
              placeholder="الموقع"
            />
          </div>

          {/* Date and Number */}
          <div className="flex justify-between items-center text-sm">
            <div className="text-right">
              <span className="text-xs font-bold text-muted-foreground/60 block">التاريخ</span>
              <input 
                type="date"
                value={details.date}
                onChange={(e) => setDetails({...details, date: e.target.value})}
                className="text-xs font-semibold bg-transparent border-b border-muted-foreground/30 focus:border-primary outline-none py-1 px-0"
              />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-muted-foreground/60">عرض سعر رقم</span>
              <input 
                value={details.quotationNumber}
                onChange={(e) => setDetails({...details, quotationNumber: e.target.value})}
                className="text-lg font-black text-foreground bg-transparent border-none p-0 focus:ring-0 block"
              />
            </div>
          </div>

          {/* Customer Name */}
          <div className="text-sm">
            <span className="text-muted-foreground">السادة </span>
            <input 
              value={details.customerName}
              onChange={(e) => setDetails({...details, customerName: e.target.value})}
              className="text-sm font-bold text-foreground bg-transparent border-b border-muted-foreground/30 focus:border-primary outline-none inline py-1 px-1 focus:ring-0 min-w-64 no-print"
              placeholder="اسم العميل"
            />
            <span className="text-muted-foreground"> /المحترمين.</span>
          </div>
        </div>

        {/* Editable Table - Professional */}
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-right text-sm border-collapse">
            <thead>
              <tr className="bg-secondary/80 text-secondary-foreground border-b-2 border-border">
                <th className="p-2 font-bold text-center w-8">#</th>
                <th className="p-2 font-bold text-right">الصنف</th>
                <th className="p-2 font-bold text-right">الاسم النباتي / الاسم الشائع</th>
                <th className="p-2 font-bold text-right">الوصف</th>
                <th className="p-2 font-bold text-center w-20">الكمية</th>
                <th className="p-2 font-bold text-center w-20">الوحدة</th>
                <th className="p-2 font-bold text-center w-24">السعر</th>
                <th className="p-2 font-bold text-center w-24">الإجمالي</th>
                <th className="p-2 w-8 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                  <td className="p-2 text-center text-muted-foreground font-medium">{index + 1}</td>
                  <td className="p-2">
                    <input 
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary px-1 py-1 rounded text-sm focus:bg-background transition-colors"
                      placeholder="الصنف"
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      value={item.botanicalName}
                      onChange={(e) => updateItem(item.id, 'botanicalName', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary px-1 py-1 rounded text-xs text-muted-foreground focus:bg-background transition-colors"
                      placeholder="الاسم النباتي"
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary px-1 py-1 rounded text-xs text-muted-foreground focus:bg-background transition-colors"
                      placeholder="الوصف"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input 
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-primary px-1 py-1 rounded text-sm focus:bg-background transition-colors"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input 
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-primary px-1 py-1 rounded text-sm focus:bg-background transition-colors"
                      placeholder="وحدة"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input 
                      type="number"
                      min="0"
                      value={item.price || ''}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-primary px-1 py-1 rounded text-sm focus:bg-background transition-colors font-medium"
                    />
                  </td>
                  <td className="p-2 text-center font-semibold text-foreground">
                    {item.total.toLocaleString()}
                  </td>
                  <td className="p-2 text-center no-print">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
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
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs font-bold text-foreground mb-2 block">ملاحظات:</label>
            <textarea 
              value={details.notes}
              onChange={(e) => setDetails({...details, notes: e.target.value})}
              className="w-full h-16 p-2 bg-secondary/30 border border-border/50 rounded-lg focus:border-primary focus:bg-background transition-all resize-none text-muted-foreground text-xs"
              placeholder="شروط الدفع، مدة التوريد، إلخ..."
            />
          </div>

          <div className="text-right border-t-2 border-border/30 pt-4">
            <div className="font-bold text-foreground text-base">المجموع الكلي: <span className="text-lg">{grandTotal.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="border-t-2 border-border/30 pt-6 text-center text-xs space-y-3 text-muted-foreground">
          <div className="font-semibold text-foreground">مؤسسة ومشاتل القدري الزراعية</div>
          <div className="space-y-1">
            <input 
              value={details.phone}
              onChange={(e) => setDetails({...details, phone: e.target.value})}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-center w-full"
              dir="ltr"
            />
            <input 
              value={details.email}
              onChange={(e) => setDetails({...details, email: e.target.value})}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-center w-full"
              dir="ltr"
            />
            <input 
              value={details.website}
              onChange={(e) => setDetails({...details, website: e.target.value})}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-center w-full"
              dir="ltr"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
