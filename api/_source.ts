import { createApp } from "../server/app";
import type { Request, Response } from "express";

let appHandler: ((req: Request, res: Response) => void) | null = null;

async function getApp() {
  if (!appHandler) {
    const { app } = await createApp();
    appHandler = app;
  }
  return appHandler;
}

export default async function handler(req: Request, res: Response) {
  const app = await getApp();
  return app(req, res);
}
