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
  title: "ServerSafe | Infraestrutura em nuvem e seguranca",
  description:
    "Cloud computing, firewall, backup, monitoramento, suporte tecnico e automacao para empresas que precisam de estabilidade e continuidade.",
  keywords: [
    "ServerSafe",
    "cloud computing",
    "seguranca",
    "firewall",
    "backup",
    "monitoramento",
    "suporte de TI",
    "automacao de processos",
    "continuidade operacional",
  ],
  openGraph: {
    title: "ServerSafe | Infraestrutura em nuvem e seguranca",
    description:
      "Infraestrutura em nuvem, seguranca e suporte tecnico para empresas que dependem de estabilidade.",
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
