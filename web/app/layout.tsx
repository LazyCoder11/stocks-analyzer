import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Analyzer — AI Portfolio Manager",
  description: "Manage your stock portfolio with automated technical indicators, real-time news aggregation, and AI analysis reports sent right to Telegram.",
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
