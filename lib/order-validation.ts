import { z } from "zod";

export const sizeNumbers = [38, 40, 42, 44, 46, 48, 50] as const;

export const orderSchema = z.object({
  customer: z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional() }),
  orderNumber: z.string().min(1), issueNumber: z.string().optional(), processName: z.string().min(1), salesOrderNumber: z.string().optional(), productionManager: z.string().optional(), receivedDate: z.string().optional(), inwardValue: z.number().min(0).optional(),
  garmentName: z.string().min(1), color: z.string().optional(), clientOrderReference: z.string().optional(),
  sizeQuantities: z.array(z.object({ size: z.number().refine((size) => sizeNumbers.includes(size as (typeof sizeNumbers)[number])), quantity: z.number().int().min(0) })),
  rawMaterials: z.array(z.object({ itemCode: z.string().optional(), itemName: z.string().min(1), color: z.string().optional(), panna: z.number().min(0).optional(), quantity: z.number().min(0), unit: z.string().min(1) })).default([]),
});

export type OrderInput = z.infer<typeof orderSchema>;
