import type { Metadata } from "next";
import "./globals.css";
import "./workspace-overrides.css";

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
