import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StitchFlow Production Control",
    short_name: "StitchFlow",
    description: "QR-based stitching center workflow management",
    start_url: "/login",
    display: "standalone",
    background_color: "#143b2d",
    theme_color: "#143b2d",
    icons: [{ src: "/stitchflow-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
