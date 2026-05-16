import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tay for Transcenlutions",
  description:
    "A focused Transcenlutions workspace for turning passive-income business requests into clear next steps.",
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
