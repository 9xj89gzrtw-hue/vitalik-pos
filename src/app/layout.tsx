import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/vitalik/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ВИТАЛИК — POS",
  description:
    "Простое и надёжное POS: официант отправляет заказ в один тап, кухня видит сводку и карточки, данные живут в базе — синхронизация стабильна на любом смартфоне.",
  applicationName: "ВИТАЛИК",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon-512.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/icon-512.png", sizes: "512x512" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ВИТАЛИК",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#12141A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground overscroll-none`}
      >
        {children}
        <Toaster position="top-center" theme="dark" offset="56px" />
        <PwaRegister />
      </body>
    </html>
  );
}
