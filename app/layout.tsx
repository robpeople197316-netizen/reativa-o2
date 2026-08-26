import type { Metadata, Viewport } from "next";
import { Inter, Orbitron, Share_Tech_Mono } from "next/font/google";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const mono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JARVIS CORE · Gestão de Salão",
  description:
    "HUD futurista de gestão para salão de beleza — clientes, financeiro, agendas, estoque, metas, histórico químico e visagismo.",
};

export const viewport: Viewport = {
  themeColor: "#01060d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen overflow-hidden font-sans">{children}</body>
    </html>
  );
}
