import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "R JOGHANI",
    short_name: "R JOGHANI",
    description: "Control your stock seamlessly.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b2b61",
    icons: [
      {
        src: "/brand-logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand-logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/mobile-screenshot.jpeg",
        sizes: "720x1485",
        type: "image/jpeg",
      },
    ],
    protocol_handlers: [
      {
        protocol: "web+stockflow",
        url: "/open?url=%s",
      },
    ],
    display_override: ["window-controls-overlay", "standalone"],
  };
}
