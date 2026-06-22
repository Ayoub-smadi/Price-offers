import { createApp } from "../server/app";
import type { Request, Response } from "express";

let appHandler: ((req: Request, res: Response) => void) | null = null;
let initError: Error | null = null;

async function getApp() {
  if (initError) throw initError;
  if (!appHandler) {
    try {
      const { app } = await createApp();
      appHandler = app;
    } catch (err) {
      initError = err as Error;
      console.error("[api] createApp() failed:", err);
      throw err;
    }
  }
  return appHandler;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error("[api] handler error:", err);
    res.status(500).json({
      message: "حدث خطأ في الخادم",
      detail: err?.message || String(err),
    });
  }
}
