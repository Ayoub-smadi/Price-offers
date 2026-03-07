import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.quotations.list.path, async (req, res) => {
    try {
      const data = await storage.getQuotations();
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get(api.quotations.get.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = await storage.getQuotation(id);
      if (!data) {
        return res.status(404).json({ message: "Not found" });
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post(api.quotations.create.path, async (req, res) => {
    try {
      // Coerce numeric types in case they come as strings
      const bodySchema = api.quotations.create.input;
      const input = bodySchema.parse(req.body);
      const { items, ...qData } = input;
      const data = await storage.createQuotation({
        ...qData,
        grandTotal: String(qData.grandTotal) // Postgres numeric
      }, items.map(i => ({
        ...i,
        price: String(i.price),
        total: String(i.total)
      })));
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post(api.parser.parseText.path, async (req, res) => {
    try {
      const input = api.parser.parseText.input.parse(req.body);
      
      const lines = input.text.split('\\n').filter(l => l.trim() !== '');
      const items = lines.map(line => {
        const tokens = line.trim().split(/\\s+/);
        
        let qty = 1;
        let price = 0;
        let nameParts = [];
        
        const maybePrice = tokens.length > 0 ? Number(tokens[tokens.length - 1]) : NaN;
        const maybeQty = tokens.length > 1 ? Number(tokens[tokens.length - 2]) : NaN;
        
        if (!isNaN(maybePrice) && !isNaN(maybeQty)) {
          price = maybePrice;
          qty = maybeQty;
          nameParts = tokens.slice(0, tokens.length - 2);
        } else if (!isNaN(maybePrice)) {
          price = maybePrice;
          nameParts = tokens.slice(0, tokens.length - 1);
        } else {
          nameParts = tokens;
        }

        const name = nameParts.join(' ');
        
        return {
          name: name || "عنصر غير معروف",
          description: "",
          quantity: qty,
          price: price,
          total: qty * price
        };
      });

      res.json({ items });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  return httpServer;
}