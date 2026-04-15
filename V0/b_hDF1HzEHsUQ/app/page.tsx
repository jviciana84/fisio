import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { Pricing } from "@/components/pricing"
import { About } from "@/components/about"
import { Schedule } from "@/components/schedule"
import { Contact } from "@/components/contact"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="relative">
      <Header />
      <Hero />
      <Services />
      <Pricing />
      <About />
      <Schedule />
      <Contact />
      <Footer />
    </main>
  )
}
