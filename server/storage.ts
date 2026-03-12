import { db } from "./db";
import { quotations, quotationItems, products, users, type InsertQuotation, type QuotationWithItems, type InsertProduct, type Product, type User } from "@shared/schema";
import { eq, desc, isNull, isNotNull, asc, sql } from "drizzle-orm";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(salt + password).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) return false;
  const expected = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

export interface IStorage {
  getQuotations(): Promise<QuotationWithItems[]>;
  getQuotation(id: number): Promise<QuotationWithItems | undefined>;
  createQuotation(quotation: InsertQuotation, items: any[]): Promise<QuotationWithItems>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>, items: any[]): Promise<QuotationWithItems>;
  softDeleteQuotation(id: number): Promise<void>;
  getDeletedQuotations(): Promise<QuotationWithItems[]>;
  restoreQuotation(id: number): Promise<void>;
  permanentDeleteQuotation(id: number): Promise<void>;
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  reorderProducts(items: { id: number; sortOrder: number }[]): Promise<void>;
  getUserByUsername(username: string): Promise<User | undefined>;
  changeUserPassword(username: string, newPasswordHash: string): Promise<void>;
  seedAdminUser(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getQuotations(): Promise<QuotationWithItems[]> {
    const qList = await db.select().from(quotations)
      .where(isNull(quotations.deletedAt))
      .orderBy(desc(quotations.createdAt));
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
      const allProducts = await db.select().from(products);
      for (const item of items) {
        const name = String(item.name).trim();
        if (!name) continue;
        const alreadyExists = allProducts.some(
          p => p.name.trim().toLowerCase() === name.toLowerCase()
        );
        if (!alreadyExists) {
          await db.insert(products).values({
            name,
            description: item.description ? String(item.description) : null,
            unit: "وحدة",
            price: String(item.price ?? 0),
          });
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

  async softDeleteQuotation(id: number): Promise<void> {
    await db.update(quotations).set({ deletedAt: new Date() }).where(eq(quotations.id, id));
  }

  async getDeletedQuotations(): Promise<QuotationWithItems[]> {
    const qList = await db.select().from(quotations)
      .where(isNotNull(quotations.deletedAt))
      .orderBy(desc(quotations.deletedAt));
    const result: QuotationWithItems[] = [];
    for (const q of qList) {
      const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, q.id));
      result.push({ ...q, items });
    }
    return result;
  }

  async restoreQuotation(id: number): Promise<void> {
    await db.update(quotations).set({ deletedAt: null }).where(eq(quotations.id, id));
  }

  async permanentDeleteQuotation(id: number): Promise<void> {
    await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));
    await db.delete(quotations).where(eq(quotations.id, id));
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(asc(products.sortOrder), desc(products.createdAt));
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

  async reorderProducts(items: { id: number; sortOrder: number }[]): Promise<void> {
    for (const item of items) {
      await db.update(products).set({ sortOrder: item.sortOrder }).where(eq(products.id, item.id));
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async changeUserPassword(username: string, newPasswordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.username, username));
  }

  async seedAdminUser(): Promise<void> {
    const existing = await this.getUserByUsername("Ayoub");
    if (!existing) {
      const passwordHash = createPasswordHash("Ayoub123");
      await db.insert(users).values({ username: "Ayoub", passwordHash });
      console.log("[seed] تم إنشاء حساب الأدمن: Ayoub / Ayoub123");
    }
  }
}

export const storage = new DatabaseStorage();
