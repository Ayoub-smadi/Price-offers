import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { useQuotation } from "@/hooks/use-quotations";
import { QuotationFormNoHeader } from "@/components/quotation-form-no-header";
import { format } from "date-fns";

export default function ViewQuotationNoHeader() {
  const { id } = useParams<{ id: string }>();
  const quotationId = Number(id);
  const { data: quotation, isLoading, error } = useQuotation(quotationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="p-12 text-center text-destructive" dir="rtl">
        <h2 className="text-xl font-bold">لم يتم العثور على العرض</h2>
      </div>
    );
  }

  const dateStr = (() => {
    try { return format(new Date(quotation.date), "yyyy-MM-dd"); }
    catch { return String(quotation.date ?? ""); }
  })();

  const initialData = {
    items: (quotation.items || []).map((item, i) => ({
      id: String(item.id ?? i + 1),
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      quantity: Number(item.quantity),
      unit: "وحدة",
      price: Number(item.price),
      total: Number(item.total),
      imageUrl: item.imageUrl || undefined,
    })),
    details: {
      quotationNumber: quotation.quotationNumber || "",
      customerName: quotation.customerName || "",
      date: dateStr,
      notes: quotation.notes || "",
      closingText: "واقبلوا فائق الاحترام....",
      signerTitle: "المدير العام/ ثامر احمد القادري",
      titleText: "عرض سعر",
    },
  };

  return <QuotationFormNoHeader initialData={initialData} editId={quotationId} />;
}
