import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./workspace-overrides.css";
import "./tay-workspace.css";
import "../public/transcenlutions-brand.css";
import "./mobile-chat.css";
import "./writing-actions.css";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content" };

export const metadata: Metadata = {
  title: "Tay | Transcenlutions Command Room",
  description:
    "Tay turns requests into governed, visible action: ask, plan, approve when needed, act, and report.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
