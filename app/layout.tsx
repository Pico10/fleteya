import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FleteYa - Plataforma Logística",
  description: "Despacho y logística en tiempo real",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50">{children}</body>
    </html>
  );
}