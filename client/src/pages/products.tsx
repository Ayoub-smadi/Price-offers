import { useState, useRef } from "react";
import { Package, Plus, Pencil, Trash2, Check, X, Search, Sparkles, Camera, ImageOff, FileDown, GripVertical, Loader2, Trees, Flower2, Leaf, ChevronDown, ChevronUp, Tag, Inbox } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { exportCatalogToPDF } from "@/lib/export-utils";
import { queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ProductForm = { name: string; description: string; unit: string; price: string; imageUrl?: string; category: ProductCategory | "" };
const emptyForm: ProductForm = { name: "", description: "", unit: "وحدة", price: "", imageUrl: "", category: "" };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "أشجار": <Trees className="w-4 h-4" />,
  "شجيرات": <Leaf className="w-4 h-4" />,
  "ورود": <Flower2 className="w-4 h-4" />,
  "نباتات زينة": <Sparkles className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "أشجار": "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  "شجيرات": "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  "ورود": "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800",
  "نباتات زينة": "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  "أشجار": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "شجيرات": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "ورود": "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  "نباتات زينة": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
};

const CATEGORY_BTN_COLORS: Record<string, string> = {
  "أشجار": "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300",
  "شجيرات": "bg-green-100 hover:bg-green-200 text-green-800 border border-green-300",
  "ورود": "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300",
  "نباتات زينة": "bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-300",
};

const isUnclassified = (p: Product) => !p.category || !PRODUCT_CATEGORIES.includes(p.category as ProductCategory);

function ProductImage({ url, className }: { url?: string | null; className?: string }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageOff className="w-8 h-8 text-muted-foreground/30" />
      </div>
    );
  }
  return <img src={url} alt="صورة المنتج" onError={() => setError(true)} className={`object-cover ${className}`} />;
}

function ImageUploadButton({ productId, onUploaded }: { productId?: number; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      onUploaded(url);
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50">
        <Camera className="w-3.5 h-3.5" />
        {uploading ? "جاري الرفع..." : "رفع صورة"}
      </button>
    </>
  );
}

function UnclassifiedCard({
  product,
  onAssign,
  onStartEdit,
  onDelete,
  assigning,
}: {
  product: Product;
  onAssign: (id: number, cat: ProductCategory) => void;
  onStartEdit: (p: Product) => void;
  onDelete: (id: number) => void;
  assigning: number | null;
}) {
  return (
    <div className="bg-card rounded-2xl border-2 border-amber-200 dark:border-amber-800 overflow-hidden group relative">
      <div className="relative w-full h-36 overflow-hidden bg-muted">
        <ProductImage url={product.imageUrl} className="w-full h-36" />
        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onStartEdit(product)}
            className="p-1.5 bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shadow-sm"
            data-testid={`button-edit-unclassified-${product.id}`}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(product.id)}
            className="p-1.5 bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shadow-sm"
            data-testid={`button-delete-unclassified-${product.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-foreground text-sm mb-0.5 line-clamp-1">{product.name}</h3>
        <div className="text-base font-black text-primary mb-2">
          {Number(product.price).toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground"> / {product.unit || "وحدة"}</span>
        </div>
        <div className="border-t border-border pt-2">
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3" /> اختر القسم:
          </p>
          <div className="flex flex-wrap gap-1">
            {PRODUCT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => onAssign(product.id, cat)}
                disabled={assigning === product.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${CATEGORY_BTN_COLORS[cat]}`}
                data-testid={`button-assign-${product.id}-${cat}`}>
                {CATEGORY_ICONS[cat]}
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
      {assigning === product.id && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

function SortableProductCard({
  product, editingId, editForm, setEditForm, onStartEdit, onUpdate, onDelete, updatePending, setEditingId,
}: {
  product: Product;
  editingId: number | null;
  editForm: ProductForm;
  setEditForm: (f: ProductForm) => void;
  onStartEdit: (p: Product) => void;
  onUpdate: () => void;
  onDelete: (id: number) => void;
  updatePending: boolean;
  setEditingId: (id: number | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined };
  const isEditing = editingId === product.id;

  return (
    <div ref={setNodeRef} style={style}
      className="bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group overflow-hidden relative">
      {isEditing ? (
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3 mb-3">
            <ProductImage url={editForm.imageUrl} className="w-20 h-20 shrink-0 rounded-xl" />
            <div className="flex flex-col gap-1.5">
              <ImageUploadButton productId={product.id} onUploaded={url => setEditForm({ ...editForm, imageUrl: url })} />
              {editForm.imageUrl && <button type="button" onClick={() => setEditForm({ ...editForm, imageUrl: "" })} className="text-xs text-destructive hover:underline text-right">إزالة</button>}
            </div>
          </div>
          <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-primary" placeholder="اسم المنتج" />
          <div className="grid grid-cols-2 gap-2">
            <input value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary" placeholder="الوحدة" />
            <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary" placeholder="السعر" />
          </div>
          <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" placeholder="الوصف" />
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">القسم</label>
            <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value as ProductCategory })}
              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary"
              data-testid={`select-category-edit-${product.id}`}>
              <option value="">— غير مصنف —</option>
              {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onUpdate} disabled={updatePending}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
              <Check className="w-3 h-3" /> حفظ
            </button>
            <button onClick={() => setEditingId(null)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold">
              <X className="w-3 h-3" /> إلغاء
            </button>
          </div>
        </div>
      ) : (
        <>
          <div {...attributes} {...listeners}
            className="absolute top-2 right-2 z-10 p-1 rounded-md bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="relative w-full h-40 overflow-hidden bg-muted">
            <ProductImage url={product.imageUrl} className="w-full h-40" />
            <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onStartEdit(product)}
                className="p-1.5 bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shadow-sm"
                data-testid={`button-edit-${product.id}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(product.id)}
                className="p-1.5 bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shadow-sm"
                data-testid={`button-delete-${product.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute top-2 left-2">
              <div className="bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-lg backdrop-blur-sm">
                {product.unit || "وحدة"}
              </div>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{product.name}</h3>
            {product.description && <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{product.description}</p>}
            <div className="text-lg font-black text-primary">
              {Number(product.price).toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground"> / {product.unit || "وحدة"}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategorySection({
  category, products, editingId, editForm, setEditForm, onStartEdit, onUpdate, onDelete, updatePending, setEditingId, onReorder, onAddToCategory,
}: {
  category: ProductCategory;
  products: Product[];
  editingId: number | null;
  editForm: ProductForm;
  setEditForm: (f: ProductForm) => void;
  onStartEdit: (p: Product) => void;
  onUpdate: () => void;
  onDelete: (id: number) => void;
  updatePending: boolean;
  setEditingId: (id: number | null) => void;
  onReorder: (category: ProductCategory, newOrder: Product[]) => void;
  onAddToCategory: (category: ProductCategory) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex(p => p.id === Number(active.id));
    const newIndex = products.findIndex(p => p.id === Number(over.id));
    onReorder(category, arrayMove(products, oldIndex, newIndex));
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${CATEGORY_COLORS[category]}`}>
      <div className="flex items-center justify-between px-5 py-3">
        <button onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 font-bold text-base text-foreground hover:opacity-80 transition-opacity"
          data-testid={`button-collapse-${category}`}>
          <span className={`${CATEGORY_BADGE_COLORS[category].split(" ").slice(0, 2).join(" ")} p-1.5 rounded-lg`}>
            {CATEGORY_ICONS[category]}
          </span>
          {category}
          <span className="text-sm font-normal text-muted-foreground">({products.length})</span>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </button>
        <button onClick={() => onAddToCategory(category)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          data-testid={`button-add-to-category-${category}`}>
          <Plus className="w-3.5 h-3.5" /> إضافة
        </button>
      </div>
      {!collapsed && (
        <div className="px-4 pb-4">
          {products.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-border/60">
              <p className="text-muted-foreground text-sm">لا توجد منتجات في هذا القسم</p>
              <button onClick={() => onAddToCategory(category)} className="mt-2 text-primary text-xs hover:underline">أضف أول منتج</button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={products.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(product => (
                    <SortableProductCard key={product.id} product={product} editingId={editingId}
                      editForm={editForm} setEditForm={setEditForm} onStartEdit={onStartEdit}
                      onUpdate={onUpdate} onDelete={onDelete} updatePending={updatePending}
                      setEditingId={setEditingId} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [exporting, setExporting] = useState(false);
  const [categoryOrders, setCategoryOrders] = useState<Record<string, number[]>>({});
  const [assigning, setAssigning] = useState<number | null>(null);

  const unclassifiedProducts = (products || []).filter(isUnclassified);
  const totalCount = products?.length ?? 0;

  const getProductsForCategory = (cat: ProductCategory): Product[] => {
    if (!products) return [];
    const catProducts = products.filter(p => (p.category as ProductCategory) === cat);
    const order = categoryOrders[cat];
    if (!order) return catProducts;
    const sorted = order.map(id => catProducts.find(p => p.id === id)).filter(Boolean) as Product[];
    const newOnes = catProducts.filter(p => !order.includes(p.id));
    return [...sorted, ...newOnes];
  };

  const handleAssign = async (productId: number, category: ProductCategory) => {
    setAssigning(productId);
    try {
      await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: `تم نقل المنتج إلى قسم ${category}` });
    } catch {
      toast({ title: "خطأ في التصنيف", variant: "destructive" });
    } finally {
      setAssigning(null);
    }
  };

  const handleReorder = async (category: ProductCategory, newOrder: Product[]) => {
    setCategoryOrders(prev => ({ ...prev, [category]: newOrder.map(p => p.id) }));
    const allProducts = products || [];
    const otherItems = allProducts.filter(p => (p.category as ProductCategory) !== category).map(p => ({ id: p.id, sortOrder: p.sortOrder ?? 0 }));
    const newCatItems = newOrder.map((p, idx) => ({ id: p.id, sortOrder: idx }));
    try {
      await fetch("/api/products/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([...otherItems, ...newCatItems]),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch {
      toast({ title: "خطأ في حفظ الترتيب", variant: "destructive" });
    }
  };

  const handleAddToCategory = (category: ProductCategory) => {
    setForm({ ...emptyForm, category });
    setShowAdd(true);
    setTimeout(() => document.getElementById("add-form-top")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleCreate = () => {
    if (!form.name.trim()) { toast({ title: "مطلوب اسم المنتج", variant: "destructive" }); return; }
    createMutation.mutate(
      { name: form.name.trim(), description: form.description.trim() || null, unit: form.unit || "وحدة", price: form.price || "0", imageUrl: form.imageUrl || null, category: form.category || null },
      {
        onSuccess: () => { toast({ title: "تم إضافة المنتج" }); setForm(emptyForm); setShowAdd(false); },
        onError: () => toast({ title: "خطأ في الإضافة", variant: "destructive" }),
      }
    );
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, description: p.description || "", unit: p.unit || "وحدة", price: String(p.price), imageUrl: p.imageUrl || "", category: (p.category as ProductCategory) || "" });
  };

  const handleUpdate = () => {
    if (!editForm.name.trim() || editingId === null) return;
    updateMutation.mutate(
      { id: editingId, name: editForm.name.trim(), description: editForm.description.trim() || null, unit: editForm.unit || "وحدة", price: editForm.price || "0", imageUrl: editForm.imageUrl || null, category: editForm.category || null },
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

  const handleExportPDF = async () => {
    const allProducts = products || [];
    if (allProducts.length === 0) { toast({ title: "لا توجد منتجات للتصدير", variant: "destructive" }); return; }
    setExporting(true);
    try {
      await exportCatalogToPDF(allProducts);
      toast({ title: "تم تصدير الكتالوج بنجاح" });
    } catch {
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const filterProduct = (p: Product) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase());

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            كتالوج المنتجات
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4 text-primary/70" />
            المنتجات الجديدة تظهر في "غير مصنف" • صنّفها ثم رتّبها
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExportPDF} disabled={exporting || totalCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            data-testid="button-export-catalog">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? "جاري التصدير..." : "تصدير PDF"}
          </button>
          <button onClick={() => { setForm(emptyForm); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            data-testid="button-add-product">
            <Plus className="w-4 h-4" /> منتج جديد
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border-2 border-border pl-4 pr-10 py-2.5 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          placeholder="ابحث في المنتجات..." data-testid="input-search-products" />
      </div>

      {/* Add Form */}
      {showAdd && (
        <div id="add-form-top" className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="font-bold text-lg text-foreground">إضافة منتج جديد</h3>
          <div className="flex items-center gap-4">
            <ProductImage url={form.imageUrl} className="w-20 h-20 shrink-0 rounded-xl" />
            <div className="flex flex-col gap-2">
              <ImageUploadButton onUploaded={url => setForm({ ...form, imageUrl: url })} />
              {form.imageUrl && <button type="button" onClick={() => setForm({ ...form, imageUrl: "" })} className="text-xs text-destructive hover:underline text-right">إزالة الصورة</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">اسم المنتج *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="مثال: سرو ليلاندي" data-testid="input-product-name" />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">القسم</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProductCategory })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                data-testid="select-category-new">
                <option value="">— غير مصنف —</option>
                {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">الوحدة</label>
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="وحدة / متر / كيلو..." />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">السعر الافتراضي</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="0.00" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-muted-foreground block mb-1">الوصف</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="وصف مختصر..." />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleCreate} disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" />
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm); }}
              className="flex items-center gap-2 px-5 py-2 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors">
              <X className="w-4 h-4" /> إلغاء
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : totalCount === 0 && !search ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">الكتالوج فارغ</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
            سيُملأ الكتالوج تلقائياً عند حفظ أول عرض سعر، أو أضف منتجاً يدوياً الآن
          </p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── غير مصنف section ── */}
          {(() => {
            const filtered = unclassifiedProducts.filter(filterProduct);
            if (search && filtered.length === 0) return null;
            return (
              <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2 font-bold text-base text-amber-900 dark:text-amber-100">
                    <span className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 p-1.5 rounded-lg">
                      <Inbox className="w-4 h-4" />
                    </span>
                    غير مصنف
                    <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium hidden sm:block">
                    اختر القسم لكل منتج ↓
                  </p>
                </div>
                {filtered.length === 0 ? (
                  <div className="px-5 pb-4 text-center py-6 text-muted-foreground text-sm">
                    ✅ جميع المنتجات مصنّفة
                  </div>
                ) : (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(p => (
                      <UnclassifiedCard key={p.id} product={p}
                        onAssign={handleAssign} onStartEdit={startEdit}
                        onDelete={handleDelete} assigning={assigning} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Category sections ── */}
          {PRODUCT_CATEGORIES.map(cat => {
            const catProducts = getProductsForCategory(cat).filter(filterProduct);
            if (search && catProducts.length === 0) return null;
            return (
              <CategorySection key={cat} category={cat} products={catProducts}
                editingId={editingId} editForm={editForm} setEditForm={setEditForm}
                onStartEdit={startEdit} onUpdate={handleUpdate} onDelete={handleDelete}
                updatePending={updateMutation.isPending} setEditingId={setEditingId}
                onReorder={handleReorder} onAddToCategory={handleAddToCategory} />
            );
          })}

          {/* No search results */}
          {search && unclassifiedProducts.filter(filterProduct).length === 0 &&
            PRODUCT_CATEGORIES.every(cat => getProductsForCategory(cat).filter(filterProduct).length === 0) && (
              <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground">لا توجد نتائج مطابقة</h3>
                <p className="text-muted-foreground mt-1 text-sm">جرب كلمة بحث مختلفة</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
