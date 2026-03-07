import { useQuotations } from "@/hooks/use-quotations";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Calendar, User, Search, Hash } from "lucide-react";
import { useState } from "react";

export default function History() {
  const { data: quotations, isLoading, error } = useQuotations();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-48 bg-muted rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center text-destructive">
        <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل السجل</h2>
        <p className="opacity-80 mt-2">يرجى المحاولة لاحقاً</p>
      </div>
    );
  }

  const filtered = quotations?.filter(q => 
    q.customerName.toLowerCase().includes(search.toLowerCase()) || 
    q.quotationNumber.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">سجل العروض</h1>
          <p className="text-muted-foreground mt-1">تصفح جميع عروض الأسعار السابقة</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border-2 border-border pl-4 pr-10 py-2.5 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            placeholder="ابحث بالاسم أو الرقم..."
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
          <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">لا توجد عروض أسعار</h3>
          <p className="text-muted-foreground mt-2">لم تقم بإنشاء أي عروض أسعار حتى الآن، أو لا توجد نتائج مطابقة للبحث.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(quote => (
            <div 
              key={quote.id} 
              className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  {quote.quotationNumber}
                </div>
                <div className="text-2xl font-black text-foreground">
                  {Number(quote.grandTotal).toLocaleString()}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <User className="w-5 h-5 text-primary/70" />
                  <span className="font-semibold text-foreground">{quote.customerName}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="w-5 h-5 text-primary/70" />
                  <span>
                    {format(new Date(quote.date), 'dd MMMM yyyy', { locale: ar })}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  يحتوي على {quote.items?.length || 0} أصناف
                </span>
                <button className="text-primary font-bold text-sm px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                  عرض التفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
