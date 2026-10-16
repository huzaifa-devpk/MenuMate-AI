import { Link } from "react-router-dom";
import { ArrowRight, Check, FileDown, Github, Languages, Palette, QrCode, Sparkles, Store, Wallet, Clock3, ShieldCheck } from "lucide-react";
import { ButtonLink } from "../components/ui";
import { GITHUB_URL } from "../components/Layout";

const features = [
  {
    icon: Languages,
    title: "AI translation with Gemma",
    text: "Translate dish names and descriptions between English and Urdu with Google's open-weight Gemma model. Every suggestion is reviewed by you before it goes live.",
  },
  {
    icon: Palette,
    title: "Beautiful menu design",
    text: "Choose between a Classic and a Modern theme. Menus are mobile-first, accessible and render Urdu with proper right-to-left layout.",
  },
  {
    icon: FileDown,
    title: "Printable PDF export",
    text: "Download a clean, print-ready PDF of your menu in the language you choose, generated from your saved data with embedded Urdu-capable fonts.",
  },
  {
    icon: QrCode,
    title: "QR code sharing",
    text: "Publish your menu to a unique link and download a QR code for tables, flyers and social media. Unpublish any time.",
  },
];

const steps = [
  { title: "Add your dishes", text: "Enter categories, dishes, descriptions and prices. Prices are stored as numbers and never changed by AI." },
  { title: "Translate with Gemma", text: "Pick a target language, review the side-by-side suggestions, edit anything you like, then approve." },
  { title: "Publish & share", text: "Preview, publish to a public link, download the PDF and print a QR code for your tables." },
];

const benefits = [
  { icon: Wallet, title: "No designer needed", text: "A professional multilingual menu without hiring a designer or translator for every change." },
  { icon: Clock3, title: "Update in minutes", text: "Change a price or add a seasonal dish and your digital menu, PDF and QR link update together." },
  { icon: ShieldCheck, title: "You stay in control", text: "AI output is clearly marked and must be approved. Your data lives in your own deployment." },
  { icon: Store, title: "Built for small kitchens", text: "Cafés, food stalls and home-based businesses in Pakistan and worldwide, with PKR, USD, GBP and EUR support." },
];

/** Static preview of the sample menu used on the landing page. Prices are illustrative. */
const sampleDishes = [
  { name: "Chicken Karahi", ur: "چکن کڑاہی", desc: "Wok-cooked chicken with tomatoes, ginger and green chillies.", price: "Rs 1,250" },
  { name: "Chicken Biryani", ur: "چکن بریانی", desc: "Fragrant basmati rice layered with spiced chicken.", price: "Rs 450" },
  { name: "Daal Makhani", ur: "دال مکھنی", desc: "Slow-simmered black lentils finished with butter.", price: "Rs 550" },
  { name: "Gulab Jamun", ur: "گلاب جامن", desc: "Soft milk dumplings in cardamom syrup.", price: "Rs 180" },
];

export function LandingPage() {
  return (
    <div className="animate-rise">
      {/* Hero -------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,rgb(16_185_129_/_0.12),transparent_70%)]" />
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkles className="size-3.5" /> Powered by open-weight Gemma
            </span>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold text-charcoal-950 sm:text-5xl lg:text-6xl">
              Your Restaurant Menu, Ready for Every Language.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-charcoal-600">
              MenuMate AI turns your dishes and prices into a polished digital menu. Translate between English and Urdu with Gemma, review every word, then publish with a QR code or export a printable PDF.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to="/menu/new" size="lg" icon={ArrowRight}>
                Create Your Menu
              </ButtonLink>
              <ButtonLink to="/m/saffron-garden" size="lg" variant="outline">
                Explore Demo
              </ButtonLink>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-charcoal-600 sm:grid-cols-2">
              {["English ↔ Urdu translation", "Prices never altered by AI", "PDF export & QR codes", "Open source, MIT licensed"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-brand-600" /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Menu preview ---------------------------------------------------- */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-cream-100 to-saffron-100 opacity-80 blur-2xl" />
            <div className="card overflow-hidden shadow-lift">
              <div className="flex items-center justify-between border-b border-charcoal-900/6 bg-charcoal-950 px-5 py-4 text-white">
                <div>
                  <p className="font-display text-lg font-semibold">Saffron Garden</p>
                  <p className="text-xs text-white/60">Sample menu · Lahore</p>
                </div>
                <div className="flex gap-1 rounded-full bg-white/10 p-1 text-xs">
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-medium text-charcoal-900">EN</span>
                  <span className="px-2.5 py-0.5 font-urdu text-white/80">اردو</span>
                </div>
              </div>
              <div className="divide-y divide-charcoal-900/6 bg-white">
                {sampleDishes.map((dish) => (
                  <div key={dish.name} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="font-semibold text-charcoal-900">{dish.name}</p>
                        <p className="lang-ur truncate text-sm leading-none text-charcoal-500" dir="rtl">{dish.ur}</p>
                      </div>
                      <p className="mt-0.5 text-sm text-charcoal-500">{dish.desc}</p>
                    </div>
                    <p className="price shrink-0 font-semibold text-brand-700">{dish.price}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-cream-100 px-5 py-3 text-xs text-charcoal-500">
                <span>Illustrative sample prices</span>
                <span className="inline-flex items-center gap-1"><QrCode className="size-3.5" /> menumate/m/saffron-garden</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features ---------------------------------------------------------- */}
      <section className="container-page py-16 lg:py-20" id="features">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Everything a small restaurant needs</p>
          <h2 className="mt-3 text-3xl font-semibold text-charcoal-950 sm:text-4xl">From spreadsheet to shareable menu</h2>
          <p className="mt-4 text-charcoal-600">One place for your dishes, translations, printable menu and QR code. No design skills required.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-card">
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-charcoal-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works ------------------------------------------------------ */}
      <section className="bg-charcoal-950 text-white">
        <div className="container-page py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-brand-400 uppercase">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Three steps to a multilingual menu</h2>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="font-display text-4xl font-semibold text-brand-400">0{i + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits ---------------------------------------------------------- */}
      <section className="container-page py-16 lg:py-20">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Why small restaurants</p>
            <h2 className="mt-3 text-3xl font-semibold text-charcoal-950 sm:text-4xl">Made for the people who run the kitchen</h2>
            <p className="mt-4 text-charcoal-600">
              Many small restaurants serve customers who read Urdu, English or both. MenuMate AI keeps one source of truth for your dishes and prices and lets Gemma do the translation drafts, so you can focus on cooking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/dashboard" variant="secondary" icon={ArrowRight}>Open the dashboard</ButtonLink>
              <ButtonLink to={GITHUB_URL} variant="ghost" icon={Github} external>View source</ButtonLink>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-charcoal-900/8 bg-cream-100/70 p-5">
                <b.icon className="size-5 text-brand-700" />
                <h3 className="mt-3 font-semibold text-charcoal-900">{b.title}</h3>
                <p className="mt-1.5 text-sm text-charcoal-600">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA --------------------------------------------------------------- */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_120%,rgb(255_255_255_/_0.18),transparent)]" />
          <h2 className="relative text-3xl font-semibold sm:text-4xl">Start with your first menu today</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">Free and open source. Runs locally or on your own Render deployment. Bring your own Gemma API key for translations.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/menu/new" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-medium text-brand-800 shadow-sm hover:bg-cream-100">
              Create Your Menu <ArrowRight className="size-4" />
            </Link>
            <Link to="/m/saffron-garden" className="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 font-medium text-white hover:bg-white/10">
              Explore Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
