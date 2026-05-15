import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tay Engine Box 1",
  description: "Approved Box 1 Tay Engine loop for Transcenlutions.",
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
