import type { Metadata } from "next"
import { BookingCtaProvider } from "@/components/booking-cta-modal"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { Pricing } from "@/components/pricing"
import { About } from "@/components/about"
import { Schedule } from "@/components/schedule"
import { Contact } from "@/components/contact"
import { Footer } from "@/components/footer"
import { HomeStaffProvider } from "@/components/home-staff-context"
import { getGoogleBusinessRating } from "@/lib/google-business-rating"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default async function Home() {
  const googleRating = await getGoogleBusinessRating()

  return (
    <BookingCtaProvider>
      <HomeStaffProvider>
      <main className="relative">
        <Header />
        <Hero googleRating={googleRating} />
        <Services />
        <Pricing />
        <About />
        <Schedule />
        <Contact />
        <Footer />
      </main>
      </HomeStaffProvider>
    </BookingCtaProvider>
  )
}
