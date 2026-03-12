import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Trash2, RotateCcw, FileText, Hash, User, Calendar, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { QuotationWithItems } from "@shared/schema";

export default function TrashPage() {
  const { data: deleted, isLoading } = useQuery<QuotationWithItems[]>({
    queryKey: ["/api/trash"],
  });
  const { toast } = useToast();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const restoreMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/trash/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "تمت الاستعادة", description: "تم استعادة عرض السعر بنجاح." });
    },
    onError: () => toast({ title: "خطأ في الاستعادة", variant: "destructive" }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/trash/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      setConfirmId(null);
      toast({ title: "تم الحذف النهائي", description: "تم حذف عرض السعر نهائياً." });
    },
    onError: () => {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
      setConfirmId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-48 bg-muted rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-destructive" />
            سلة المحذوفات
          </h1>
          <p className="text-muted-foreground mt-1">العروض المحذوفة يمكن استعادتها أو حذفها نهائياً</p>
        </div>

        {deleted && deleted.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>الحذف النهائي لا يمكن التراجع عنه</span>
          </div>
        )}
      </div>

      {!deleted || deleted.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
          <Trash2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">السلة فارغة</h3>
          <p className="text-muted-foreground mt-2">لا توجد عروض أسعار محذوفة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {deleted.map(quote => (
            <div
              key={quote.id}
              className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm opacity-80 hover:opacity-100 transition-all duration-300 group relative overflow-hidden"
              data-testid={`card-trash-${quote.id}`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-destructive/30 rounded-t-2xl" />

              <div className="flex justify-between items-start mb-4">
                <div className="bg-destructive/10 text-destructive px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  {quote.quotationNumber}
                </div>
                <div className="text-2xl font-black text-foreground">
                  {Number(quote.grandTotal).toLocaleString()}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <User className="w-5 h-5 text-destructive/60" />
                  <span className="font-semibold text-foreground">{quote.customerName}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="w-5 h-5 text-destructive/60" />
                  <span>{format(new Date(quote.date), 'dd MMMM yyyy', { locale: ar })}</span>
                </div>
                {quote.deletedAt && (
                  <div className="text-xs text-destructive/70 mt-1">
                    حُذف في: {format(new Date(quote.deletedAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {quote.items?.length || 0} أصناف
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => restoreMutation.mutate(quote.id)}
                    disabled={restoreMutation.isPending}
                    className="flex items-center gap-1.5 text-sm font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    data-testid={`button-restore-${quote.id}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    استعادة
                  </button>

                  {confirmId === quote.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-destructive font-bold">تأكيد؟</span>
                      <button
                        onClick={() => permanentDeleteMutation.mutate(quote.id)}
                        disabled={permanentDeleteMutation.isPending}
                        className="text-xs font-bold text-white bg-destructive hover:bg-destructive/90 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        data-testid={`button-confirm-perm-delete-${quote.id}`}
                      >
                        {permanentDeleteMutation.isPending ? "..." : "نعم"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg transition-colors"
                        data-testid={`button-cancel-perm-delete-${quote.id}`}
                      >
                        لا
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(quote.id)}
                      className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="حذف نهائي"
                      data-testid={`button-perm-delete-${quote.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
