import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="login-shell"><section className="login-intro"><p className="eyebrow">QR-enabled workflow</p><h1>Every garment. Every stage. Visible.</h1><p>Track jobs from cutting through delivery, with live shop-floor accountability and phase-wise costing.</p><div className="login-stages"><span>01 Cutting</span><span>02 Stitching</span><span>03 Quality</span><span>04 Packing</span><span>05 Delivery</span></div></section><LoginForm /></main>;
}
