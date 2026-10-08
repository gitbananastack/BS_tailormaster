import { z } from "zod";

export const sizeNumbers = [38, 40, 42, 44, 46, 48, 50] as const;

const sizeSchema = z.array(z.object({ size: z.number().refine(size => sizeNumbers.includes(size as typeof sizeNumbers[number])), quantity: z.number().int().min(0) }));
export const designItemSchema = z.object({ itemName: z.string().trim().min(1), designCode: z.string().trim().min(1, "Design number is required for every design.").max(191), color: z.string().optional(), clientOrderReference: z.string().optional(), sizeQuantities: sizeSchema });

export const orderSchema = z.object({
  customer: z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional() }),
  orderNumber: z.string().min(1), issueNumber: z.string().optional(), processName: z.string().min(1), salesOrderNumber: z.string().optional(), productionManager: z.string().optional(), receivedDate: z.string().optional(), inwardValue: z.number().min(0).optional(),
  items: z.array(designItemSchema).min(1).max(100),
  garmentName: z.string().min(1), color: z.string().optional(), clientOrderReference: z.string().optional(),
  sizeQuantities: sizeSchema.default([]),
  rawMaterials: z.array(z.object({ itemCode: z.string().optional(), itemName: z.string().min(1), color: z.string().optional(), panna: z.number().min(0).optional(), quantity: z.number().min(0), unit: z.string().min(1), cost: z.number().min(0).default(0) })).default([]),
});

export type OrderInput = z.infer<typeof orderSchema>;
