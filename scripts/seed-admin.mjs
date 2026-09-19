import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const username = process.env.ADMIN_USERNAME || "BSadmin";
const password = process.env.ADMIN_INITIAL_PASSWORD;
if (!password) throw new Error("Set ADMIN_INITIAL_PASSWORD before running this seed script.");

const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
const prisma = new PrismaClient();

await prisma.user.upsert({
  where: { email: username },
  update: { name: "StitchFlow Administrator", role: "ADMIN", isActive: true, passwordHash },
  create: { name: "StitchFlow Administrator", email: username, passwordHash, role: "ADMIN" },
});
await prisma.$disconnect();
