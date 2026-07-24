import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

const APPLE_TOUCH_SIZES = [57, 60, 72, 76, 114, 120, 144, 152, 167, 180] as const;

export const metadata: Metadata = {
  applicationName: "Калорії",
  title: {
    default: "Калькулятор калорій",
    template: "%s · Калорії",
  },
  description: "Персональний калькулятор калорій з ШІ-аналізом їжі",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Калорії",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: APPLE_TOUCH_SIZES.map((size) => ({
      url: `/icons/apple-touch-icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
    other: [
      {
        rel: "apple-touch-icon",
        url: "/icons/apple-touch-icon.png",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#161826" },
    { media: "(prefers-color-scheme: light)", color: "#161826" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
