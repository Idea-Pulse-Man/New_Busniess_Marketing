import { accessBlocked } from "@/lib/proxycheck";
import { site } from "@/lib/site";
import { AccessBlocked } from "./access-blocked";
import { AnimationLine } from "./animation-line";
import { Crystal3D } from "./crystal-3d";
import { LogoMark } from "./logo";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const blocked = await accessBlocked();
  if (blocked) return <AccessBlocked reason={blocked} />;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Deep indigo: the logo's dark tile blends in, and it flows into the blue hero below */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d1033]/90 text-white backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2 font-bold tracking-tight">
            <LogoMark className="ring-white/15! shadow-amber-400/10!" />
            {site.name}
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#about" className="hover:text-white">About</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <a href="#apply" className="btn btn-primary">Apply now</a>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <AnimationLine>
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 md:pt-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Now accepting applications
                </span>
                <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
                  {site.tagline}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">{site.description}</p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <a href="#apply" className="btn bg-white px-6 py-3 text-base text-brand-700 shadow-sm hover:bg-brand-50">
                    Apply in 1 minute →
                  </a>
                  <a href="#about" className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10">
                    Learn more
                  </a>
                </div>
              </div>
              <Crystal3D className="order-first mx-auto w-64 sm:w-80 lg:order-none lg:w-full" />
            </div>

            <dl className="mt-16 grid grid-cols-2 gap-6 border-t border-white/20 pt-10 md:grid-cols-4">
              {site.stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-3xl font-bold text-white">{s.value}</dt>
                  <dd className="mt-1 text-sm text-white/75">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </AnimationLine>

        {/* About */}
        <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">About us</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{site.about.title}</h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-slate-600">
              {site.about.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {site.pillars.map((p, i) => (
              <div
                key={p.title}
                className={`rounded-2xl border p-6 ${
                  i === 0 ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white"
                }`}
              >
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${i === 0 ? "text-brand-50" : "text-slate-600"}`}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-slate-50 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From application to first project</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-4">
              {site.steps.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className="scroll-mt-20 py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Apply</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Ready to start?</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                No sign-up, no CV, no experience required. Tell us a little about yourself and we&apos;ll take it
                from there.
              </p>
              <ul className="mt-8 space-y-3 text-slate-700">
                {["Takes about a minute", "Beginners are very welcome", "Free — always", "Reply by email within ~48h"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                        ✓
                      </span>
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8 lg:col-span-3">
              <ApplyForm />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-slate-50 py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Questions</h2>
            <div className="mt-10 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
              {site.faq.map((f) => (
                <details key={f.q} className="group p-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                    {f.q}
                    <span className="ml-4 text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>
            {site.contactLabel}:{" "}
            <a href={`mailto:${site.contactEmail}`} className="hover:text-slate-900">
              {site.contactEmail}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
