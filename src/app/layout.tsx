import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Inter,
  Handjet,
  Nunito,
  Russo_One,
  Alegreya,
} from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/PwaRegister";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

/*
 * Шрифти ігрових тем. preload:false — їх тягне лише той, у кого відповідна тема
 * активна: @font-face оголошений завжди, але браузер качає файл, тільки коли
 * CSS теми реально задіє родину.
 */
const russoOne = Russo_One({
  variable: "--font-russo",
  subsets: ["latin", "cyrillic"],
  weight: "400",
  preload: false,
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  preload: false,
});

const handjet = Handjet({
  variable: "--font-handjet",
  subsets: ["latin", "cyrillic"],
  preload: false,
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

/* Полонина: тепла книжкова антиква — гуцульська оповідь, а не інтерфейс. */
const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700"],
  preload: false,
});

const APPLE_TOUCH_SIZES =[57, 60, 72, 76, 114, 120, 144, 152, 167, 180] as const;

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
    // НЕ "black-translucent": воно кидає контент під статус-бар і вмикає safe-area
    statusBarStyle: "black",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${inter.variable} ${russoOne.variable} ${nunito.variable} ${handjet.variable} ${dmSans.variable} ${alegreya.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
