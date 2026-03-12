import { db } from "./db";
import { quotations, quotationItems, products, type InsertQuotation, type QuotationWithItems, type InsertProduct, type Product } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getQuotations(): Promise<QuotationWithItems[]>;
  getQuotation(id: number): Promise<QuotationWithItems | undefined>;
  createQuotation(quotation: InsertQuotation, items: any[]): Promise<QuotationWithItems>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>, items: any[]): Promise<QuotationWithItems>;
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getQuotations(): Promise<QuotationWithItems[]> {
    const qList = await db.select().from(quotations).orderBy(desc(quotations.createdAt));
    const result: QuotationWithItems[] = [];
    for (const q of qList) {
      const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, q.id));
      result.push({ ...q, items });
    }
    return result;
  }

  async getQuotation(id: number): Promise<QuotationWithItems | undefined> {
    const [q] = await db.select().from(quotations).where(eq(quotations.id, id));
    if (!q) return undefined;
    const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, q.id));
    return { ...q, items };
  }

  async createQuotation(quotation: InsertQuotation, items: any[]): Promise<QuotationWithItems> {
    const [newQ] = await db.insert(quotations).values(quotation).returning();
    const itemsToInsert = items.map(item => ({ ...item, quotationId: newQ.id }));
    let newItems: any[] = [];
    if (itemsToInsert.length > 0) {
      newItems = await db.insert(quotationItems).values(itemsToInsert).returning();
      // Deduct stock for matching products (case-insensitive name match)
      const allProducts = await db.select().from(products);
      for (const item of items) {
        const match = allProducts.find(
          p => p.name.trim().toLowerCase() === String(item.name).trim().toLowerCase()
        );
        if (match) {
          const currentStock = match.stock ?? 0;
          const newStock = currentStock - Number(item.quantity);
          await db.update(products)
            .set({ stock: newStock })
            .where(eq(products.id, match.id));
        }
      }
    }
    return { ...newQ, items: newItems };
  }

  async updateQuotation(id: number, quotation: Partial<InsertQuotation>, items: any[]): Promise<QuotationWithItems> {
    const [updatedQ] = await db.update(quotations).set(quotation).where(eq(quotations.id, id)).returning();
    await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));
    let newItems: any[] = [];
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({ ...item, quotationId: id }));
      newItems = await db.insert(quotationItems).values(itemsToInsert).returning();
    }
    return { ...updatedQ, items: newItems };
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newP] = await db.insert(products).values(product).returning();
    return newP;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedP] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updatedP;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }
}

export const storage = new DatabaseStorage();
