import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transcenlutions — Money OS for makers, creators, and operators",
  description:
    "An AI-powered operating layer that helps you make, protect, and grow money. Connect your stack, unify the data, and act on the insights — for businesses, creators, and professionals.",
  metadataBase: new URL("https://transcenlutions.com"),
  openGraph: {
    title: "Transcenlutions",
    description:
      "Make money. Protect money. Grow money. The AI operating layer for businesses, creators, and professionals.",
    url: "https://transcenlutions.com",
    siteName: "Transcenlutions",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
