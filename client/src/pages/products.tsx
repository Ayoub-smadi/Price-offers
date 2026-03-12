import { useState } from "react";
import { Package, Plus, Pencil, Trash2, Check, X, Search, Sparkles } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

type ProductForm = { name: string; description: string; unit: string; price: string };
const emptyForm: ProductForm = { name: "", description: "", unit: "وحدة", price: "" };

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);

  const filtered = (products || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast({ title: "مطلوب اسم المنتج", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      { name: form.name.trim(), description: form.description.trim() || null, unit: form.unit || "وحدة", price: form.price || "0" },
      {
        onSuccess: () => { toast({ title: "تم إضافة المنتج" }); setForm(emptyForm); setShowAdd(false); },
        onError: () => toast({ title: "خطأ في الإضافة", variant: "destructive" }),
      }
    );
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, description: p.description || "", unit: p.unit || "وحدة", price: String(p.price) });
  };

  const handleUpdate = () => {
    if (!editForm.name.trim() || editingId === null) return;
    updateMutation.mutate(
      { id: editingId, name: editForm.name.trim(), description: editForm.description.trim() || null, unit: editForm.unit || "وحدة", price: editForm.price || "0" },
      {
        onSuccess: () => { toast({ title: "تم التحديث" }); setEditingId(null); },
        onError: () => toast({ title: "خطأ في التحديث", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "تم الحذف" }),
      onError: () => toast({ title: "خطأ في الحذف", variant: "destructive" }),
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            كتالوج المنتجات
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary/70" />
            المنتجات تُحفظ هنا تلقائياً عند إنشاء أي عرض سعر
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          منتج جديد
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border-2 border-border pl-4 pr-10 py-2.5 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          placeholder="ابحث في المنتجات..."
        />
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="font-bold text-lg text-foreground">إضافة منتج يدوياً</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">اسم المنتج *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="مثال: سرو ليلاندي"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">الوحدة</label>
              <input
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="وحدة / متر / كيلو..."
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">السعر الافتراضي</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">الوصف</label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="وصف مختصر..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleCreate} disabled={createMutation.isPending} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" />
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm); }} className="flex items-center gap-2 px-5 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors">
              <X className="w-4 h-4" />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">
            {search ? "لا توجد نتائج مطابقة" : "الكتالوج فارغ"}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
            {search
              ? "جرب كلمة بحث مختلفة"
              : "سيُملأ الكتالوج تلقائياً عند حفظ أول عرض سعر، أو أضف منتجاً يدوياً الآن"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="bg-card rounded-2xl border border-border/50 p-4 hover:border-primary/30 hover:shadow-md transition-all group">
              {editingId === product.id ? (
                <div className="space-y-2">
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-primary"
                    placeholder="اسم المنتج"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={editForm.unit}
                      onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary"
                      placeholder="الوحدة"
                    />
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary"
                      placeholder="السعر"
                    />
                  </div>
                  <input
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary"
                    placeholder="الوصف"
                  />
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                      <Check className="w-3 h-3" /> حفظ
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold">
                      <X className="w-3 h-3" /> إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-lg">
                      {product.unit || "وحدة"}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(product)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} disabled={deleteMutation.isPending} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{product.description}</p>
                  )}
                  <div className="text-lg font-black text-primary">
                    {Number(product.price).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ {product.unit || "وحدة"}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
