import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col gap-5 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
      <AppHeader />
      <main id="contenu" className="flex flex-col gap-5">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
