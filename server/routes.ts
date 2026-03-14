import type { Express } from "express";
import type { Server } from "http";
import { storage, verifyPassword, createPasswordHash } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertProductSchema, insertProductCategorySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("ملفات الصور فقط مسموح بها"));
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Quotations ──────────────────────────────────────────────
  app.get(api.quotations.list.path, async (req, res) => {
    try {
      const data = await storage.getQuotations();
      res.json(data);
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get(api.quotations.get.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = await storage.getQuotation(id);
      if (!data) return res.status(404).json({ message: "Not found" });
      res.json(data);
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post(api.quotations.create.path, async (req, res) => {
    try {
      const input = api.quotations.create.input.parse(req.body);
      const { items, ...qData } = input;
      const data = await storage.createQuotation(
        { ...qData, grandTotal: String(qData.grandTotal) },
        items.map(i => ({ ...i, price: String(i.price), total: String(i.total) }))
      );
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.put('/api/quotations/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.quotations.create.input.parse(req.body);
      const { items, ...qData } = input;
      const existing = await storage.getQuotation(id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      const data = await storage.updateQuotation(
        id,
        { ...qData, grandTotal: String(qData.grandTotal) },
        items.map(i => ({ ...i, price: String(i.price), total: String(i.total) }))
      );
      res.json(data);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete('/api/quotations/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getQuotation(id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      await storage.softDeleteQuotation(id);
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Trash ────────────────────────────────────────────────────
  app.get('/api/trash', async (_req, res) => {
    try {
      res.json(await storage.getDeletedQuotations());
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post('/api/trash/:id/restore', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.restoreQuotation(id);
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete('/api/trash/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.permanentDeleteQuotation(id);
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Upload ───────────────────────────────────────────────────
  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي ملف" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // ── Products ─────────────────────────────────────────────────
  app.get('/api/products', async (_req, res) => {
    try {
      res.json(await storage.getProducts());
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const input = insertProductSchema.parse(req.body);
      const product = await storage.createProduct({ ...input, price: String(input.price) } as any);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.put('/api/products/reorder', async (req, res) => {
    try {
      const schema = z.array(z.object({ id: z.number(), sortOrder: z.number() }));
      const items = schema.parse(req.body);
      await storage.reorderProducts(items);
      res.status(204).end();
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = insertProductSchema.partial().parse(req.body);
      const existing = await storage.getProduct(id);
      const product = await storage.updateProduct(id, input.price !== undefined ? { ...input, price: String(input.price) } as any : input);
      if (
        existing?.imageUrl?.startsWith('/uploads/') &&
        input.imageUrl !== undefined &&
        input.imageUrl !== existing.imageUrl
      ) {
        const filePath = path.join(uploadsDir, path.basename(existing.imageUrl));
        fs.unlink(filePath, () => {});
      }
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const product = await storage.getProduct(id);
      await storage.deleteProduct(id);
      if (product?.imageUrl?.startsWith('/uploads/')) {
        const filePath = path.join(uploadsDir, path.basename(product.imageUrl));
        fs.unlink(filePath, () => {});
      }
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Product Categories ────────────────────────────────────────
  app.get('/api/product-categories', async (_req, res) => {
    try {
      res.json(await storage.getProductCategories());
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post('/api/product-categories', async (req, res) => {
    try {
      const input = insertProductCategorySchema.parse(req.body);
      const cat = await storage.createProductCategory(input);
      res.status(201).json(cat);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.put('/api/product-categories/reorder', async (req, res) => {
    try {
      const schema = z.array(z.object({ id: z.number(), sortOrder: z.number() }));
      const items = schema.parse(req.body);
      await storage.reorderProductCategories(items);
      res.status(204).end();
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.put('/api/product-categories/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = insertProductCategorySchema.partial().parse(req.body);
      const cat = await storage.updateProductCategory(id, input);
      res.json(cat);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete('/api/product-categories/:id', async (req, res) => {
    try {
      await storage.deleteProductCategory(Number(req.params.id));
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Auth ──────────────────────────────────────────────────────
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = z.object({ username: z.string(), password: z.string() }).parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      res.json({ username: user.username });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const { username, oldPassword, newPassword } = z.object({
        username: z.string(),
        oldPassword: z.string(),
        newPassword: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
      }).parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
        return res.status(401).json({ message: "كلمة المرور القديمة غير صحيحة" });
      }
      const newHash = createPasswordHash(newPassword);
      await storage.changeUserPassword(username, newHash);
      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ── Text Parser ───────────────────────────────────────────────
  app.post(api.parser.parseText.path, async (req, res) => {
    try {
      const input = api.parser.parseText.input.parse(req.body);
      const numberPattern = /(\d+(?:[.,]\d+)?)/g;

      const lines = input.text.split('\n').filter(l => l.trim() !== '');
      const items = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;

        // ── Tab-separated format: #  الاسم  الوصف  القسم  الكمية  السعر ──
        if (trimmedLine.includes('\t')) {
          const cols = trimmedLine.split('\t').map(c => c.trim());
          // Skip header rows (first col is "#" or "م" or non-numeric label with no price)
          if (cols[0] === '#' || cols[0] === 'م' || cols[0] === 'الرقم') return null;
          // cols: [index, name, description, category, quantity, price]  (6 cols)
          // or:   [index, name, description, quantity, price]             (5 cols)
          // or:   [name, description, category, quantity, price]          (5 cols, no index)
          let name = '', description = '', category = '', qty = 1, price = 0;
          if (cols.length >= 6) {
            name        = cols[1] || '';
            description = cols[2] || '';
            category    = cols[3] || '';
            const qm = cols[4].match(numberPattern);
            if (qm) qty = parseFloat(qm[0].replace(',', '.'));
            const pm = cols[5].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          } else if (cols.length === 5) {
            // Could be [index, name, description, qty, price] or [name, desc, cat, qty, price]
            const firstIsNum = /^\d+$/.test(cols[0]);
            if (firstIsNum) {
              name        = cols[1] || '';
              description = cols[2] || '';
              const qm = cols[3].match(numberPattern);
              if (qm) qty = parseFloat(qm[0].replace(',', '.'));
              const pm = cols[4].match(numberPattern);
              if (pm) price = parseFloat(pm[0].replace(',', '.'));
            } else {
              name        = cols[0] || '';
              description = cols[1] || '';
              category    = cols[2] || '';
              const qm = cols[3].match(numberPattern);
              if (qm) qty = parseFloat(qm[0].replace(',', '.'));
              const pm = cols[4].match(numberPattern);
              if (pm) price = parseFloat(pm[0].replace(',', '.'));
            }
          } else if (cols.length === 4) {
            name        = cols[0] || '';
            description = cols[1] || '';
            const qm = cols[2].match(numberPattern);
            if (qm) qty = parseFloat(qm[0].replace(',', '.'));
            const pm = cols[3].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          } else if (cols.length >= 2) {
            name = cols[0] || '';
            const pm = cols[cols.length - 1].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          }
          if (!name) return null;
          return { name: name.trim(), description: description.trim(), category: category.trim(), quantity: Math.max(qty, 1), price: Math.max(price, 0), total: Math.max(qty, 1) * Math.max(price, 0) };
        }

        // ── Slash-separated format: الكمية / الاسم / الوصف / القسم / السعر ──
        const slashParts = trimmedLine.split('/').map(p => p.trim()).filter(p => p);
        if (slashParts.length >= 3) {
          let qty = 1;
          const qtyMatch = slashParts[0].match(numberPattern);
          if (qtyMatch) qty = parseFloat(qtyMatch[0].replace(',', '.'));
          const name = slashParts[1] || "عنصر غير معروف";
          let description = "";
          let category = "";
          let price = 0;
          if (slashParts.length >= 5) {
            // الكمية / الاسم / الوصف / القسم / السعر
            description = slashParts[2] || "";
            category    = slashParts[3] || "";
            const pm = slashParts[4].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          } else if (slashParts.length === 4) {
            // الكمية / الاسم / الوصف / السعر
            description = slashParts[2] || "";
            const pm = slashParts[3].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          } else {
            // الكمية / الاسم / السعر
            const pm = slashParts[2].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          }
          return { name: name.trim() || "عنصر غير معروف", description: description.trim(), category: category.trim(), quantity: Math.max(qty, 1), price: Math.max(price, 0), total: Math.max(qty, 1) * Math.max(price, 0) };
        }

        // ── Free text format: اسم المنتج الكمية السعر ──
        const numbers = trimmedLine.match(numberPattern) || [];
        const normalizedNumbers = numbers.map(n => parseFloat(n.replace(',', '.')));
        let nameText = trimmedLine.replace(numberPattern, '').trim();
        let qty = 1;
        let price = 0;
        if (normalizedNumbers.length >= 2) {
          price = normalizedNumbers[normalizedNumbers.length - 1];
          qty = normalizedNumbers[normalizedNumbers.length - 2];
        } else if (normalizedNumbers.length === 1) {
          price = normalizedNumbers[0];
          qty = 1;
        }
        const name = nameText || `منتج #${normalizedNumbers.join('-') || 'unknown'}`;
        return { name: name.trim() || "عنصر غير معروف", description: "", category: "", quantity: Math.max(qty, 1), price: Math.max(price, 0), total: Math.max(qty, 1) * Math.max(price, 0) };
      }).filter(item => item !== null);
      res.json({ items });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  return httpServer;
}
