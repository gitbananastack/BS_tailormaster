import { QrScanner } from "@/components/qr-scanner";
import { currentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";

export default async function ScanPage() { const user = await currentUser(); if (!user) redirect("/login"); return <><QrScanner /><MobileNav active="scan" role={user.role} /></>; }
