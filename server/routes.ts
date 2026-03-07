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
      
      const lines = input.text.split('\n').filter(l => l.trim() !== '');
      const items = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        
        // Extract all numbers from the line
        const numberPattern = /(\d+(?:[.,]\d+)?)/g;
        const numbers = trimmedLine.match(numberPattern) || [];
        const normalizedNumbers = numbers.map(n => parseFloat(n.replace(',', '.')));
        
        // Extract the text (remove numbers from the line)
        let nameText = trimmedLine.replace(numberPattern, '').trim();
        
        let qty = 1;
        let price = 0;
        
        // Try to identify price and quantity from numbers
        if (normalizedNumbers.length >= 2) {
          // Assume last number is price, second-to-last is quantity
          price = normalizedNumbers[normalizedNumbers.length - 1];
          qty = normalizedNumbers[normalizedNumbers.length - 2];
        } else if (normalizedNumbers.length === 1) {
          // Only one number - assume it's price
          price = normalizedNumbers[0];
          qty = 1;
        }
        
        // If we couldn't extract name, use a generic name
        const name = nameText || `منتج #${normalizedNumbers.join('-') || 'unknown'}`;
        
        return {
          name: name.trim() || "عنصر غير معروف",
          description: "",
          quantity: Math.max(qty, 1), // Ensure quantity is at least 1
          price: Math.max(price, 0),  // Ensure price is not negative
          total: Math.max(qty, 1) * Math.max(price, 0)
        };
      }).filter(item => item !== null);

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