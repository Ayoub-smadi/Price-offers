import { useState, useRef } from "react";
import { Package, Plus, Pencil, Trash2, Check, X, Search, Sparkles, Camera, ImageOff, FileDown, GripVertical, Loader2, Trees, Flower2, Leaf, ChevronDown, ChevronUp, Tag, Inbox, FolderPlus, Settings2 } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import { exportCatalogToPDF } from "@/lib/export-utils";
import { queryClient } from "@/lib/queryClient";
import type { Product, ProductCategory } from "@shared/schema";
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

type ProductForm = { name: string; description: string; unit: string; price: string; imageUrl?: string; category: string };
const emptyForm: ProductForm = { name: "", description: "", unit: "وحدة", price: "", imageUrl: "", category: "" };

function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

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

const DEFAULT_CATEGORY_COLOR = "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800";
const DEFAULT_BADGE_COLOR = "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200";
const DEFAULT_BTN_COLOR = "bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300";
const DEFAULT_ICON = <Tag className="w-4 h-4" />;

function getCategoryColor(name: string) { return CATEGORY_COLORS[name] || DEFAULT_CATEGORY_COLOR; }
function getCategoryBadge(name: string) { return CATEGORY_BADGE_COLORS[name] || DEFAULT_BADGE_COLOR; }
function getCategoryBtn(name: string) { return CATEGORY_BTN_COLORS[name] || DEFAULT_BTN_COLOR; }
function getCategoryIcon(name: string) { return CATEGORY_ICONS[name] || DEFAULT_ICON; }

const isUnclassified = (p: Product, categoryNames: string[]) => !p.category || !categoryNames.includes(p.category);

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
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("image", compressed);
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
  product, onAssign, onStartEdit, onDelete, assigning, categories,
}: {
  product: Product;
  onAssign: (id: number, catName: string) => void;
  onStartEdit: (p: Product) => void;
  onDelete: (id: number) => void;
  assigning: number | null;
  categories: ProductCategory[];
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
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onAssign(product.id, cat.name)}
                disabled={assigning === product.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${getCategoryBtn(cat.name)}`}
                data-testid={`button-assign-${product.id}-${cat.name}`}>
                {getCategoryIcon(cat.name)}
                {cat.name}
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
  product, editingId, editForm, setEditForm, onStartEdit, onUpdate, onDelete, updatePending, setEditingId, categories,
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
  categories: ProductCategory[];
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
            dir="rtl" style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" placeholder="الوصف" />
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">القسم</label>
            <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary"
              data-testid={`select-category-edit-${product.id}`}>
              <option value="">— غير مصنف —</option>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
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
          <div className="p-4" dir="rtl">
            <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{product.name}</h3>
            {product.description && (
              <div
                dir="rtl"
                style={{ direction: 'rtl', overflow: 'hidden', maxHeight: '2.5rem', lineHeight: '1.25rem', textAlign: 'right' }}
                className="text-muted-foreground text-xs mb-2"
              >
                {'\u200F'}{product.description}
              </div>
            )}
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
  category, products, editingId, editForm, setEditForm, onStartEdit, onUpdate, onDelete, updatePending, setEditingId, onReorder, onAddToCategory, categories, onDeleteCategory, onRenameCategory,
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
  onReorder: (categoryName: string, newOrder: Product[]) => void;
  onAddToCategory: (categoryName: string) => void;
  categories: ProductCategory[];
  onDeleteCategory: (id: number) => void;
  onRenameCategory: (id: number, name: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex(p => p.id === Number(active.id));
    const newIndex = products.findIndex(p => p.id === Number(over.id));
    onReorder(category.name, arrayMove(products, oldIndex, newIndex));
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${getCategoryColor(category.name)}`}>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => setCollapsed(c => !c)}
            className="flex items-center gap-2 font-bold text-base text-foreground hover:opacity-80 transition-opacity min-w-0"
            data-testid={`button-collapse-${category.name}`}>
            <span className={`${getCategoryBadge(category.name).split(" ").slice(0, 2).join(" ")} p-1.5 rounded-lg shrink-0`}>
              {getCategoryIcon(category.name)}
            </span>
            {renaming ? null : (
              <span className="truncate">{category.name}</span>
            )}
            <span className="text-sm font-normal text-muted-foreground shrink-0">({products.length})</span>
            {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />}
          </button>
          {renaming && (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newName.trim()) { onRenameCategory(category.id, newName.trim()); setRenaming(false); }
                  if (e.key === "Escape") { setRenaming(false); setNewName(category.name); }
                }}
                className="bg-background border border-primary rounded-lg px-2 py-1 text-sm font-semibold outline-none w-40"
                data-testid={`input-rename-category-${category.id}`}
              />
              <button onClick={() => { if (newName.trim()) { onRenameCategory(category.id, newName.trim()); setRenaming(false); } }}
                className="p-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setRenaming(false); setNewName(category.name); }}
                className="p-1 bg-secondary text-secondary-foreground rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!renaming && !confirmingDelete && (
            <button onClick={() => setRenaming(true)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title="إعادة تسمية القسم"
              data-testid={`button-rename-category-${category.id}`}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {!renaming && !confirmingDelete && (
            <button onClick={() => setConfirmingDelete(true)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title="حذف القسم"
              data-testid={`button-delete-category-${category.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {confirmingDelete && (
            <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 rounded-lg px-2 py-1">
              <span className="text-xs text-destructive font-semibold">
                {products.length > 0 ? `حذف القسم؟ (${products.length} منتج سيصبح غير مصنف)` : "حذف القسم؟"}
              </span>
              <button onClick={() => { onDeleteCategory(category.id); setConfirmingDelete(false); }}
                className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                data-testid={`button-confirm-delete-category-${category.id}`}>
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setConfirmingDelete(false)}
                className="p-1 bg-secondary text-secondary-foreground rounded transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <button onClick={() => onAddToCategory(category.name)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
            data-testid={`button-add-to-category-${category.name}`}>
            <Plus className="w-3.5 h-3.5" /> إضافة
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-4 pb-4">
          {products.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-border/60">
              <p className="text-muted-foreground text-sm">لا توجد منتجات في هذا القسم</p>
              <button onClick={() => onAddToCategory(category.name)} className="mt-2 text-primary text-xs hover:underline">أضف أول منتج</button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={products.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(product => (
                    <SortableProductCard key={product.id} product={product} editingId={editingId}
                      editForm={editForm} setEditForm={setEditForm} onStartEdit={onStartEdit}
                      onUpdate={onUpdate} onDelete={onDelete} updatePending={updatePending}
                      setEditingId={setEditingId} categories={categories} />
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
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [exporting, setExporting] = useState(false);
  const [categoryOrders, setCategoryOrders] = useState<Record<string, number[]>>({});
  const [assigning, setAssigning] = useState<number | null>(null);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedExportCats, setSelectedExportCats] = useState<Set<string>>(new Set());

  const isLoading = productsLoading || categoriesLoading;
  const categoryList = categories || [];
  const categoryNames = categoryList.map(c => c.name);
  const unclassifiedProducts = (products || []).filter(p => isUnclassified(p, categoryNames));
  const totalCount = products?.length ?? 0;

  const getProductsForCategory = (catName: string): Product[] => {
    if (!products) return [];
    const catProducts = products.filter(p => p.category === catName);
    const order = categoryOrders[catName];
    if (!order) return catProducts;
    const sorted = order.map(id => catProducts.find(p => p.id === id)).filter(Boolean) as Product[];
    const newOnes = catProducts.filter(p => !order.includes(p.id));
    return [...sorted, ...newOnes];
  };

  const handleAssign = async (productId: number, categoryName: string) => {
    setAssigning(productId);
    try {
      await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryName }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: `تم نقل المنتج إلى قسم ${categoryName}` });
    } catch {
      toast({ title: "خطأ في التصنيف", variant: "destructive" });
    } finally {
      setAssigning(null);
    }
  };

  const handleReorder = async (categoryName: string, newOrder: Product[]) => {
    setCategoryOrders(prev => ({ ...prev, [categoryName]: newOrder.map(p => p.id) }));
    const allProducts = products || [];
    const otherItems = allProducts.filter(p => p.category !== categoryName).map(p => ({ id: p.id, sortOrder: p.sortOrder ?? 0 }));
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

  const handleAddToCategory = (categoryName: string) => {
    setForm({ ...emptyForm, category: categoryName });
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
    setEditForm({ name: p.name, description: p.description || "", unit: p.unit || "وحدة", price: String(p.price), imageUrl: p.imageUrl || "", category: p.category || "" });
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

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categoryNames.includes(name)) { toast({ title: "هذا القسم موجود مسبقاً", variant: "destructive" }); return; }
    createCategoryMutation.mutate(
      { name, sortOrder: categoryList.length },
      {
        onSuccess: () => { toast({ title: `تم إضافة قسم "${name}"` }); setNewCategoryName(""); },
        onError: () => toast({ title: "خطأ في إضافة القسم", variant: "destructive" }),
      }
    );
  };

  const handleDeleteCategory = (id: number) => {
    deleteCategoryMutation.mutate(id, {
      onSuccess: () => toast({ title: "تم حذف القسم" }),
      onError: () => toast({ title: "خطأ في حذف القسم", variant: "destructive" }),
    });
  };

  const handleRenameCategory = (id: number, name: string) => {
    updateCategoryMutation.mutate(
      { id, name },
      {
        onSuccess: () => toast({ title: "تم تغيير اسم القسم" }),
        onError: () => toast({ title: "خطأ في تغيير الاسم", variant: "destructive" }),
      }
    );
  };

  const openExportDialog = () => {
    const allProducts = products || [];
    if (allProducts.length === 0) { toast({ title: "لا توجد منتجات للتصدير", variant: "destructive" }); return; }
    setSelectedExportCats(new Set(categoryNames));
    setShowExportDialog(true);
  };

  const handleExportPDF = async () => {
    const allProducts = products || [];
    const filtered = allProducts.filter(p => {
      if (!p.category || !categoryNames.includes(p.category)) return selectedExportCats.has("__unclassified__");
      return selectedExportCats.has(p.category);
    });
    if (filtered.length === 0) { toast({ title: "لا توجد منتجات في الأقسام المختارة", variant: "destructive" }); return; }
    setShowExportDialog(false);
    setExporting(true);
    try {
      await exportCatalogToPDF(filtered);
      toast({ title: "تم تصدير الكتالوج بنجاح" });
    } catch {
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const toggleExportCat = (name: string) => {
    setSelectedExportCats(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
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
          <button onClick={() => setShowManageCategories(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm border ${showManageCategories ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary/50"}`}
            data-testid="button-manage-categories">
            <Settings2 className="w-4 h-4" />
            إدارة الأقسام
          </button>
          <button onClick={openExportDialog} disabled={exporting || totalCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            data-testid="button-export-catalog">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            تصدير كتالوج
          </button>
          <button onClick={() => { setForm(emptyForm); setShowAdd(v => !v); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            data-testid="button-toggle-add">
            <Plus className="w-4 h-4" />
            منتج جديد
          </button>
        </div>
      </div>

      {/* Manage Categories Panel */}
      {showManageCategories && (
        <div className="bg-card rounded-2xl border-2 border-primary/20 p-5 space-y-4">
          <h2 className="font-bold text-base text-foreground flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            إدارة الأقسام
          </h2>
          <div className="flex flex-wrap gap-2">
            {categoryList.map(cat => (
              <div key={cat.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-semibold ${getCategoryColor(cat.name)}`}>
                {getCategoryIcon(cat.name)}
                <span>{cat.name}</span>
              </div>
            ))}
            {categoryList.length === 0 && <p className="text-muted-foreground text-sm">لا توجد أقسام بعد</p>}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              placeholder="اسم القسم الجديد (مثل: أشجار فاكهة)"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-primary"
              data-testid="input-new-category"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-add-category">
              {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة قسم
            </button>
          </div>
          <p className="text-xs text-muted-foreground">يمكنك إعادة تسمية أي قسم بالضغط على أيقونة القلم بجانبه، أو حذف الأقسام الفارغة.</p>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="bg-card rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 p-5 space-y-4">
          <h2 className="font-bold text-base text-foreground flex items-center gap-2">
            <FileDown className="w-5 h-5 text-emerald-600" />
            اختر الأقسام للتصدير
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedExportCats(new Set([...categoryNames, "__unclassified__"]))}
              className="text-xs text-primary hover:underline font-semibold">
              تحديد الكل
            </button>
            <span className="text-muted-foreground text-xs">•</span>
            <button
              onClick={() => setSelectedExportCats(new Set())}
              className="text-xs text-muted-foreground hover:underline">
              إلغاء الكل
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categoryList.map(cat => (
              <label key={cat.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all ${selectedExportCats.has(cat.name) ? `${getCategoryColor(cat.name)} font-semibold` : "border-border bg-background opacity-60"}`}
                data-testid={`label-export-cat-${cat.id}`}>
                <input type="checkbox" checked={selectedExportCats.has(cat.name)}
                  onChange={() => toggleExportCat(cat.name)} className="accent-primary w-4 h-4 shrink-0" />
                <span className="shrink-0">{getCategoryIcon(cat.name)}</span>
                <span className="text-sm truncate">{cat.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">({getProductsForCategory(cat.name).length})</span>
              </label>
            ))}
            {unclassifiedProducts.length > 0 && (
              <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all ${selectedExportCats.has("__unclassified__") ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 font-semibold" : "border-border bg-background opacity-60"}`}
                data-testid="label-export-cat-unclassified">
                <input type="checkbox" checked={selectedExportCats.has("__unclassified__")}
                  onChange={() => toggleExportCat("__unclassified__")} className="accent-primary w-4 h-4 shrink-0" />
                <Inbox className="w-4 h-4 shrink-0 text-amber-600" />
                <span className="text-sm truncate">غير مصنف</span>
                <span className="text-xs text-muted-foreground shrink-0">({unclassifiedProducts.length})</span>
              </label>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleExportPDF} disabled={selectedExportCats.size === 0}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              data-testid="button-confirm-export">
              <FileDown className="w-4 h-4" /> تصدير PDF
            </button>
            <button onClick={() => setShowExportDialog(false)}
              className="px-5 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث في المنتجات..."
          className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-primary"
          data-testid="input-search-products"
        />
      </div>

      {/* Add Form */}
      {showAdd && (
        <div id="add-form-top" className="bg-card rounded-2xl border-2 border-primary/30 p-5 space-y-3">
          <h2 className="font-bold text-base text-foreground">إضافة منتج جديد</h2>
          <div className="flex items-center gap-3">
            <ProductImage url={form.imageUrl} className="w-20 h-20 shrink-0 rounded-xl" />
            <div className="flex flex-col gap-1.5">
              <ImageUploadButton onUploaded={url => setForm({ ...form, imageUrl: url })} />
              {form.imageUrl && <button type="button" onClick={() => setForm({ ...form, imageUrl: "" })} className="text-xs text-destructive hover:underline text-right">إزالة</button>}
            </div>
          </div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-primary" placeholder="اسم المنتج *" data-testid="input-product-name" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" placeholder="الوحدة" data-testid="input-product-unit" />
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" placeholder="السعر" data-testid="input-product-price" />
          </div>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            dir="rtl" style={{ direction: 'rtl', unicodeBidi: 'isolate' }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" placeholder="الوصف (اختياري)" data-testid="input-product-description" />
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">القسم</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="select-product-category">
              <option value="">— غير مصنف —</option>
              {categoryList.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              إضافة
            </button>
            <button onClick={() => setShowAdd(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold">
              <X className="w-4 h-4" /> إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Categories */}
      {!isLoading && (
        <div className="space-y-6">
          {categoryList.map(cat => {
            const catProducts = getProductsForCategory(cat.name).filter(filterProduct);
            return (
              <CategorySection
                key={cat.id}
                category={cat}
                products={catProducts}
                editingId={editingId}
                editForm={editForm}
                setEditForm={setEditForm}
                onStartEdit={startEdit}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                updatePending={updateMutation.isPending}
                setEditingId={setEditingId}
                onReorder={handleReorder}
                onAddToCategory={handleAddToCategory}
                categories={categoryList}
                onDeleteCategory={handleDeleteCategory}
                onRenameCategory={handleRenameCategory}
              />
            );
          })}

          {/* Unclassified */}
          {unclassifiedProducts.filter(filterProduct).length > 0 && (
            <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 overflow-hidden bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 px-5 py-3">
                <span className="bg-amber-100 dark:bg-amber-900 p-1.5 rounded-lg">
                  <Inbox className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                </span>
                <span className="font-bold text-base text-foreground">غير مصنف</span>
                <span className="text-sm font-normal text-muted-foreground">({unclassifiedProducts.filter(filterProduct).length})</span>
              </div>
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unclassifiedProducts.filter(filterProduct).map(product => (
                  <UnclassifiedCard
                    key={product.id}
                    product={product}
                    onAssign={handleAssign}
                    onStartEdit={startEdit}
                    onDelete={handleDelete}
                    assigning={assigning}
                    categories={categoryList}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalCount === 0 && !showAdd && (
            <div className="text-center py-20">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">لا توجد منتجات بعد</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">ابدأ بإضافة أول منتج في الكتالوج</p>
              <button onClick={() => setShowAdd(true)} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                إضافة منتج
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
