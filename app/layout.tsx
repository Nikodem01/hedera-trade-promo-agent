import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromoProof — Trade Promotion Settlement Agent",
  description:
    "Reads the contract. Judges the proof. Negotiates. Settles on Hedera.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="paper-bg min-h-full flex flex-col">{children}</body>
    </html>
  );
}
