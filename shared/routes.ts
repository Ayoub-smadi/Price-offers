import { z } from 'zod';
import { createQuotationRequestSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  quotations: {
    list: {
      method: 'GET' as const,
      path: '/api/quotations' as const,
      responses: {
        200: z.array(z.custom<any>()), // Returns array of QuotationWithItems
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/quotations/:id' as const,
      responses: {
        200: z.custom<any>(), // Returns QuotationWithItems
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/quotations' as const,
      input: createQuotationRequestSchema,
      responses: {
        201: z.custom<any>(), // Returns created QuotationWithItems
        400: errorSchemas.validation,
      },
    },
  },
  parser: {
    parseText: {
      method: 'POST' as const,
      path: '/api/parse-text' as const,
      input: z.object({ text: z.string() }),
      responses: {
        200: z.object({
          items: z.array(z.object({
            name: z.string(),
            description: z.string(),
            quantity: z.number(),
            price: z.number(),
            total: z.number()
          }))
        })
      }
    }
  },
  plants: {
    search: {
      method: 'POST' as const,
      path: '/api/plants/search' as const,
      input: z.object({ scientificName: z.string() }),
      responses: {
        200: z.object({
          commonNames: z.array(z.string()).optional(),
          scientificName: z.string(),
          image: z.string().nullable().optional(),
          description: z.string().optional()
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type QuotationInput = z.infer<typeof api.quotations.create.input>;
export type ParseTextInput = z.infer<typeof api.parser.parseText.input>;
export type ParseTextResponse = z.infer<typeof api.parser.parseText.responses[200]>;