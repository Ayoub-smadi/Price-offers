import { db } from "./db";
import { quotations, quotationItems, type InsertQuotation, type QuotationWithItems } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getQuotations(): Promise<QuotationWithItems[]>;
  getQuotation(id: number): Promise<QuotationWithItems | undefined>;
  createQuotation(quotation: InsertQuotation, items: any[]): Promise<QuotationWithItems>;
}

export class DatabaseStorage implements IStorage {
  async getQuotations(): Promise<QuotationWithItems[]> {
    const qList = await db.select().from(quotations);
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
    }
    return { ...newQ, items: newItems };
  }
}

export const storage = new DatabaseStorage();