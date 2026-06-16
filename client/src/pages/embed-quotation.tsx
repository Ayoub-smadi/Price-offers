import { QuotationForm } from "@/components/quotation-form";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";

export default function EmbedQuotation() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div dir="rtl" className="text-right bg-white min-h-screen">
          <QuotationForm draftKey="aq_embed_draft" embedMode={true} />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
