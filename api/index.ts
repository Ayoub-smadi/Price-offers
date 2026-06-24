import { createApp } from "../server/app";
import type { Request, Response } from "express";

let appHandler: ((req: Request, res: Response) => void) | null = null;
let initError: string | null = null;

async function getApp() {
  if (initError) {
    throw new Error(initError);
  }
  if (!appHandler) {
    try {
      const { app } = await createApp();
      appHandler = app;
    } catch (err: any) {
      initError = err?.message || "Unknown startup error";
      console.error("[vercel] createApp failed:", initError);
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
    const msg = err?.message || "Server initialization failed";
    console.error("[vercel] handler error:", msg);
    if (!res.headersSent) {
      res.status(500).json({ message: msg });
    }
  }
}
