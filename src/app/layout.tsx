import type { Metadata } from "next";
import { Encode_Sans_Semi_Condensed } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const encodeSans = Encode_Sans_Semi_Condensed({
  variable: "--font-encode-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "DaZ-Lesetextgenerator",
  description: "Niveaukonsistente Lesetexte für Deutsch als Zweitsprache",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${encodeSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers></body>
    </html>
  );
}
