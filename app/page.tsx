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
import { fetchPublicHeroStaff } from "@/lib/public-hero-staff"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default async function Home() {
  const [googleRating, publicStaff] = await Promise.all([
    getGoogleBusinessRating(),
    fetchPublicHeroStaff(),
  ])

  return (
    <BookingCtaProvider>
      <HomeStaffProvider>
      <main className="relative">
        <Header />
        <Hero googleRating={googleRating} publicStaff={publicStaff} />
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
