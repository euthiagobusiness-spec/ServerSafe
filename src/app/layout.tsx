import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ServerSafe | Infraestrutura em nuvem e segurança",
  description:
    "Cloud computing, servidores, criptografia, segurança da informação, LGPD, privacidade e continuidade operacional para negócios que dependem de estabilidade e alta disponibilidade.",
  keywords: [
    "ServerSafe",
    "cloud computing",
    "servidores",
    "segurança",
    "firewall",
    "backup",
    "criptografia",
    "failover",
    "continuidade operacional",
    "LGPD",
    "DPO",
    "ISO 27001",
    "ISO 27701",
  ],
  openGraph: {
    title: "ServerSafe | Infraestrutura em nuvem e segurança",
    description:
      "Infraestrutura em nuvem, segurança e governança para empresas que não podem parar.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f5f8fb] text-slate-950">{children}</body>
    </html>
  );
}
