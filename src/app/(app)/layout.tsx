import { TabBar } from "@/components/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Контент заходить під статус-бар (black-translucent), а iOS 26 ще й розмиває та притемнює смугу під ним — приблизно
        +25px нижче годинника. Тому відступ = safe-area + 32px: шапка починається під зоною системи й лишається читабельною.
      */}
      <main className="phone-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-8">
        {children}
      </main>
      <TabBar />
    </>
  );
}
