import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tay for Transcenlutions",
  description:
    "A private-alpha Transcenlutions command room where Tay helps overwhelmed builders stop spinning and start executing.",
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
