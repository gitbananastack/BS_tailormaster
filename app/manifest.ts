import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return {
  id: "/", name: "StitchFlow Production Control", short_name: "StitchFlow",
  description: "Your stitching floor in your pocket. Scan orders, inspect quality, and update assigned work.",
  start_url: "/", scope: "/", display: "standalone", background_color: "#143b2d", theme_color: "#143b2d",
  lang: "en", categories: ["business", "productivity"], prefer_related_applications: false,
  icons: [
   { src: "/icons/stitchflow-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
   { src: "/icons/stitchflow-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
   { src: "/icons/stitchflow-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  shortcuts: [{ name: "Scan order", short_name: "Scan", url: "/scan", icons: [{ src: "/icons/stitchflow-192.png", sizes: "192x192" }] }, { name: "My assigned work", short_name: "My work", url: "/my-work", icons: [{ src: "/icons/stitchflow-192.png", sizes: "192x192" }] }],
 };
}
