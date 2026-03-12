import { useState } from "react";
import { 
  Plus, FileText, Save, 
  Wand2, Trash2, CheckCircle2,
  Phone, Mail, Globe
} from "lucide-react";
import { useCreateQuotation as useCreateQuote, useParseText as useParseTextAPI } from "@/hooks/use-quotations";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/export-utils";
import { format } from "date-fns";
import logoImage from "@assets/لقطة_شاشة_2026-03-08_080127_1773036971718.png";
import stampImage from "@assets/لقطة_شاشة_2026-03-08_023328_1773047188235.png";

type Item = {
  id: string;
  name: string;
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
    { id: "1", name: "", description: "", quantity: 1, unit: "وحدة", price: 0, total: 0 }
  ]);
  
  const [details, setDetails] = useState({
    quotationNumber: `${format(new Date(), "yyyyMMdd")}`,
    customerName: "",
    companyNameAr: "مؤسسة ومشاتل القادري الزراعية",
    companyLocationAr: "جرش – الرشايدة",
    companyNameEn: "Al-Qadri Agricultural Establishment",
    companyLocationEn: "Jerash - Al-Rashaidah",
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
          unit: "وحدة",
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
        description: i.description.trim(),
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

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-2 pb-20 min-h-screen flex flex-col print:p-0 print:space-y-0">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 glass-panel p-2 rounded-xl sticky top-2 z-50 no-print print:hidden">
        <div>
          <h1 className="text-lg font-bold text-foreground">إنشاء عرض سعر جديد</h1>
          <p className="text-muted-foreground text-xs hidden sm:block">أدخل البيانات أو الصق النص لتحويله لجدول تلقائياً</p>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => exportToPDF(
              "quotation-document",
              `Quote-${details.quotationNumber}`,
              items,
              details,
              logoBase64 || logoImage
            )}
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

      {/* Smart Paste Area - No Print */}
      <div className="glass-panel p-3 rounded-lg space-y-2 no-print border-primary/20">
        <div className="flex items-center gap-2 text-primary">
          <Wand2 className="w-5 h-5" />
          <h2 className="text-sm font-bold">التحليل الذكي للنصوص</h2>
        </div>
        <p className="text-muted-foreground text-xs">الصق محادثة واتساب أو قائمة عشوائية وسيقوم النظام بترتيبها في الجدول أدناه.</p>
        <div className="relative">
          <textarea 
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="مثال: 5 شاشات سامسونج سعر الواحدة 1500، و 2 كيبورد سعر 300..."
            className="w-full h-16 p-2 rounded-lg input-soft resize-none text-xs"
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

      {/* DOCUMENT AREA (Printable) */}
      <div id="quotation-document" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl p-5 sm:p-6 space-y-3 flex-1 flex flex-col print:shadow-none print:border-slate-300 print:p-4 print:rounded-none">
        
        {/* Header Section - Professional Side-by-Side Design */}
        <div className="pb-6 border-b-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-6">
            {/* Logo - Left Side */}
            <div className="flex-shrink-0">
              <div className="relative group w-32 h-32 overflow-hidden bg-white dark:bg-slate-900 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
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
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center no-print pointer-events-none">
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded">تغيير</span>
                </div>
              </div>
            </div>

            {/* Company Information - Side by Side Layout */}
            <div className="flex-1 space-y-4">
              {/* Company Names - Side by Side */}
              <div className="flex items-start gap-8">
                {/* Arabic Information - Left Side */}
                <div className="flex-1 space-y-1">
                  <input 
                    value={details.companyNameAr}
                    onChange={(e) => setDetails({...details, companyNameAr: e.target.value})}
                    className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-right focus:ring-0 focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-1 rounded-sm"
                    placeholder="اسم الشركة"
                  />
                  <input 
                    value={details.companyLocationAr}
                    onChange={(e) => setDetails({...details, companyLocationAr: e.target.value})}
                    className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-right focus:ring-0 focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-0.5 rounded-sm"
                    placeholder="الموقع"
                  />
                </div>

                {/* English Information - Right Side */}
                <div className="flex-1 space-y-1">
                  <input 
                    value={details.companyNameEn}
                    onChange={(e) => setDetails({...details, companyNameEn: e.target.value})}
                    className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-left focus:ring-0 focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-1 rounded-sm"
                    placeholder="Company Name"
                  />
                  <input 
                    value={details.companyLocationEn}
                    onChange={(e) => setDetails({...details, companyLocationEn: e.target.value})}
                    className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-transparent border-none border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none w-full text-left focus:ring-0 focus:bg-slate-50 dark:focus:bg-slate-900/30 px-2 py-0.5 rounded-sm"
                    placeholder="Location"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Meta Information - Professional Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">التاريخ</label>
              <input 
                type="date"
                value={details.date}
                onChange={(e) => setDetails({...details, date: e.target.value})}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary outline-none py-1 px-0 w-full text-center truncate"
              />
            </div>
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">عرض سعر رقم</label>
              <input 
                value={details.quotationNumber}
                onChange={(e) => setDetails({...details, quotationNumber: e.target.value})}
                className="text-lg font-black text-slate-900 dark:text-slate-50 bg-transparent border-none p-0 focus:ring-2 focus:ring-primary/30 w-full text-center focus:outline-none rounded"
              />
            </div>
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 no-print">العميل</label>
              <input 
                value={details.customerName}
                onChange={(e) => setDetails({...details, customerName: e.target.value})}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-transparent border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary outline-none py-1 px-0 w-full text-center no-print truncate"
                placeholder="اسم العميل"
              />
            </div>
          </div>
        </div>

        {/* Editable Table - Professional */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 flex-1">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-700 dark:border-slate-800">
                <th className="p-2 font-bold text-center w-6 text-xs">
                  {headers.index}
                </th>
                <th className="p-2 font-bold text-right text-xs">
                  {headers.name}
                </th>
                <th className="p-2 font-bold text-right text-xs">
                  {headers.description}
                </th>
                <th className="p-2 font-bold text-center w-16 text-xs">
                  {headers.quantity}
                </th>
                <th className="p-2 font-bold text-center w-16 text-xs">
                  {headers.price}
                </th>
                <th className="p-2 font-bold text-center w-16 text-xs">
                  {headers.total}
                </th>
                <th className="p-2 w-6 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="p-1.5 text-center text-slate-600 dark:text-slate-400 font-semibold text-xs">{index + 1}</td>
                  <td className="p-1.5">
                    <input 
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-medium truncate"
                      placeholder="الاسم"
                    />
                  </td>
                  <td className="p-1.5">
                    <input 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs text-slate-600 dark:text-slate-400 focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors truncate"
                      placeholder="الوصف"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <input 
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-medium"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price || ''}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full text-center bg-transparent border border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 px-1.5 py-1 rounded text-xs focus:bg-blue-50 dark:focus:bg-slate-900 transition-colors font-semibold"
                    />
                  </td>
                  <td className="p-1.5 text-center font-bold text-slate-900 dark:text-slate-50 bg-slate-100 dark:bg-slate-800/50 rounded text-xs">
                    {item.total.toLocaleString()}
                  </td>
                  <td className="p-1.5 text-center no-print">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-950 text-white">
                <td colSpan={5} className="p-2 text-right font-black text-xs pr-4">المجموع الكلي</td>
                <td className="p-1.5 text-center font-black text-sm bg-primary/20 text-white">{grandTotal.toLocaleString()}</td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button 
          onClick={addItem}
          className="flex items-center gap-1 text-primary font-bold hover:bg-primary/10 px-2 py-1 rounded text-xs transition-colors no-print"
        >
          <Plus className="w-3 h-3" />
          إضافة صنف جديد
        </button>

        {/* Footer Section */}
        <div className="space-y-2">
          {details.notes.trim() && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ملاحظات:</label>
              <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap break-words line-clamp-2">
                {details.notes}
              </div>
            </div>
          )}

          <div className="space-y-1 no-print">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">ملاحظات:</label>
            <textarea 
              value={details.notes}
              onChange={(e) => setDetails({...details, notes: e.target.value})}
              className="w-full h-12 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all resize-none text-slate-700 dark:text-slate-300 text-xs"
              placeholder="شروط الدفع، مدة التوريد، إلخ..."
            />
          </div>
        </div>

        {/* Closing Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center">
          <div className="w-full flex flex-col items-center gap-4">
            <div className="text-center text-base font-bold text-slate-900 dark:text-slate-50">
              واقبلوا فائق الاحترام....
            </div>
            <div className="w-full flex justify-end">
              <div className="flex flex-col items-center">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  المدير العام/ ثامر احمد القادري
                </div>
                <img src={stampImage} alt="Stamp" className="w-32 h-auto mt-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 text-center opacity-70">
          <div className="text-[10px] font-bold text-slate-900 dark:text-slate-50 mb-2">مؤسسة ومشاتل القدري الزراعية</div>
          <div className="flex items-center justify-center gap-4 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <input 
                value={details.phone}
                onChange={(e) => setDetails({...details, phone: e.target.value})}
                className="text-[10px] bg-transparent border-none p-0 focus:ring-0 focus:outline-none font-semibold w-28"
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <input 
                value={details.email}
                onChange={(e) => setDetails({...details, email: e.target.value})}
                className="text-[10px] bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-36"
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 flex-shrink-0" />
              <input 
                value={details.website}
                onChange={(e) => setDetails({...details, website: e.target.value})}
                className="text-[10px] bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-36"
                dir="ltr"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
