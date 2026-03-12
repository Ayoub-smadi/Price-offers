import type { Express } from "express";
import type { Server } from "http";
import { storage, verifyPassword, createPasswordHash } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertProductSchema } from "@shared/schema";

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
      await storage.deleteQuotation(id);
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
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

  app.put('/api/products/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, input.price !== undefined ? { ...input, price: String(input.price) } as any : input);
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      await storage.deleteProduct(Number(req.params.id));
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
      const lines = input.text.split('\n').filter(l => l.trim() !== '');
      const items = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        const slashParts = trimmedLine.split('/').map(p => p.trim()).filter(p => p);
        const numberPattern = /(\d+(?:[.,]\d+)?)/g;
        if (slashParts.length >= 3) {
          let qty = 1;
          const qtyMatch = slashParts[0].match(numberPattern);
          if (qtyMatch) qty = parseFloat(qtyMatch[0].replace(',', '.'));
          const name = slashParts[1] || "عنصر غير معروف";
          let description = "";
          let price = 0;
          if (slashParts.length >= 5) {
            description = slashParts[2] || "";
            const pm = slashParts[3].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          } else if (slashParts.length === 4) {
            description = slashParts[2] || "";
            const pm = slashParts[3].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          } else {
            const pm = slashParts[2].match(numberPattern);
            if (pm) price = parseFloat(pm[0].replace(',', '.'));
          }
          return { name: name.trim() || "عنصر غير معروف", description: description.trim(), quantity: Math.max(qty, 1), price: Math.max(price, 0), total: Math.max(qty, 1) * Math.max(price, 0) };
        }
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
        return { name: name.trim() || "عنصر غير معروف", description: "", quantity: Math.max(qty, 1), price: Math.max(price, 0), total: Math.max(qty, 1) * Math.max(price, 0) };
      }).filter(item => item !== null);
      res.json({ items });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  return httpServer;
}
