import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({
  variable: "--font-inter",
  // cyrillic-ext — для «ґ» (U+0491), якої немає в базовому cyrillic
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

/** Дисплейний шрифт для цифр і заголовків: вузький, спортивний, з кирилицею. Inter лишається для тексту. */
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: "Tactical Fit",
  title: { default: "Tactical Fit — AI Домашній Тренер", template: "%s · Tactical Fit" },
  description: "Персональний AI-тренер для домашніх тренувань: арсенал по фото, план Пн–Пт, прогрес.",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "Tactical Fit",
    // Контент під статус-баром + env(safe-area-inset-*) в оболонці (потрібен viewportFit: "cover")
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    // Next віддає лише mobile-web-app-capable; iOS Safari досі читає apple-префікс
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C111C",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className={`${inter.variable} ${jetbrains.variable} ${oswald.variable}`}>
      <body className="flex min-h-dvh items-start justify-center sm:items-center sm:p-4">
        <Providers>
          {/* Мобільний контейнер: на iPhone — на весь екран, на десктопі — «телефон» 402×844 */}
          <div id="app-frame" className="relative flex h-dvh w-full flex-col overflow-hidden bg-graphite bg-[radial-gradient(130%_50%_at_50%_-6%,rgba(43,144,254,0.17),transparent_62%)] sm:h-[min(844px,calc(100dvh-2rem))] sm:w-[402px] sm:rounded-[46px] sm:border-[6px] sm:border-[#1e232d] sm:shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
            {children}
            {/* «Заряджання» екрана під час затиску: яскравість = прогрес (див. HoldToCompleteButton) */}
            <div id="charge-glow" className="charge-glow" aria-hidden />
          </div>
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
