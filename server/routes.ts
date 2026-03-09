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
        
        // Try parsing slash-separated format first: quantity / name / description / price / total
        const slashParts = trimmedLine.split('/').map(p => p.trim()).filter(p => p);
        
        if (slashParts.length >= 3) {
          // Slash-separated format detected: quantity / name / description / price / total
          const numberPattern = /(\d+(?:[.,]\d+)?)/g;
          
          // Extract quantity from first part
          let qty = 1;
          const qtyMatch = slashParts[0].match(numberPattern);
          if (qtyMatch) {
            qty = parseFloat(qtyMatch[0].replace(',', '.'));
          }
          
          // Extract name (second part)
          const name = slashParts[1] || "عنصر غير معروف";
          
          // Extract description (third part onwards, excluding price/total)
          let description = "";
          let price = 0;
          
          // For 5-part format: qty / name / desc / price / total
          // For 4-part format: qty / name / desc / price
          // For 3-part format: qty / name / price
          
          if (slashParts.length >= 5) {
            // Full 5-part format
            description = slashParts[2] || "";
            const priceMatch = slashParts[3].match(numberPattern);
            if (priceMatch) {
              price = parseFloat(priceMatch[0].replace(',', '.'));
            }
            // Total is in slashParts[4] - we can verify or recalculate
          } else if (slashParts.length === 4) {
            // 4-part: qty / name / desc / price
            description = slashParts[2] || "";
            const priceMatch = slashParts[3].match(numberPattern);
            if (priceMatch) {
              price = parseFloat(priceMatch[0].replace(',', '.'));
            }
          } else {
            // 3-part: qty / name / price
            const priceMatch = slashParts[2].match(numberPattern);
            if (priceMatch) {
              price = parseFloat(priceMatch[0].replace(',', '.'));
            }
          }
          
          const total = Math.max(qty, 1) * Math.max(price, 0);
          
          return {
            name: name.trim() || "عنصر غير معروف",
            description: description.trim(),
            quantity: Math.max(qty, 1),
            price: Math.max(price, 0),
            total: total
          };
        }
        
        // Fallback: Extract all numbers from the line
        const numberPattern = /(\d+(?:[.,]\d+)?)/g;
        const numbers = trimmedLine.match(numberPattern) || [];
        const normalizedNumbers = numbers.map(n => parseFloat(n.replace(',', '.')));
        
        // Extract the text (remove numbers from the line)
        let nameText = trimmedLine.replace(numberPattern, '').trim();
        
        let qty = 1;
        let price = 0;
        
        // Try to identify price and quantity from numbers
        if (normalizedNumbers.length >= 2) {
          price = normalizedNumbers[normalizedNumbers.length - 1];
          qty = normalizedNumbers[normalizedNumbers.length - 2];
        } else if (normalizedNumbers.length === 1) {
          price = normalizedNumbers[0];
          qty = 1;
        }
        
        const name = nameText || `منتج #${normalizedNumbers.join('-') || 'unknown'}`;
        
        return {
          name: name.trim() || "عنصر غير معروف",
          description: "",
          quantity: Math.max(qty, 1),
          price: Math.max(price, 0),
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

  app.post(api.plants.search.path, async (req, res) => {
    try {
      const input = api.plants.search.input.parse(req.body);
      const plantName = encodeURIComponent(input.scientificName);
      
      // Search Wikipedia
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${plantName}&prop=pageimages|extracts&exintro&format=json&pithumbsize=300`
      );
      
      if (!response.ok) {
        return res.json({ scientificName: input.scientificName });
      }

      const data = await response.json();
      const pages = data.query.pages;
      const page = Object.values(pages)[0] as any;

      const result = {
        scientificName: input.scientificName,
        commonNames: [] as string[],
        image: page?.thumbnail?.source || null,
        description: page?.extract || ""
      };

      // Try to extract common names from description
      const commonNameMatch = result.description.match(/(?:also known as|common name[s]?:|commonly called)[^.]*?([^,]+(?:,[^,]+)*)/i);
      if (commonNameMatch) {
        result.commonNames = commonNameMatch[1]
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0)
          .slice(0, 5);
      }

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  return httpServer;
}