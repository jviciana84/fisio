import { BookingCtaProvider } from "@/components/booking-cta-modal";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SectionWatermark } from "@/components/section-watermark";

export function LegalDocumentLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <BookingCtaProvider>
      <div className="relative min-h-screen overflow-x-hidden font-sans">
        <div className="pointer-events-none fixed inset-0 z-0 gradient-mesh" />
        <div className="pointer-events-none fixed -right-24 top-24 z-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none fixed -left-20 bottom-20 z-0 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <SectionWatermark align="left" fullViewport scaleFactor={1.05} />

        <Header />

        <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-20 pt-24 sm:px-6 lg:max-w-4xl lg:pb-28">
          <div className="glass-extreme relative overflow-hidden rounded-3xl border border-white/50 p-6 shadow-2xl shadow-blue-900/10 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10 blur-2xl" />
            <div className="relative">
              <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              <p className="mb-8 text-sm font-medium text-slate-500">Fisioterapia Roc Blanc</p>
              <article className="space-y-8 text-sm leading-relaxed text-slate-700 sm:text-base [&_h2]:mt-10 [&_h2]:scroll-mt-28 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:first:mt-0 [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {children}
              </article>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </BookingCtaProvider>
  );
}
