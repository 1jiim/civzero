import Link from 'next/link'
import { FadeIn } from '@/components/FadeIn'

const concepts = [
  {
    label: 'A Simulation',
    body: 'Each person you create lives autonomously inside Core Z-1. They eat, work, fail, succeed, form relationships, and sometimes die. You will not control them.',
  },
  {
    label: 'A Shared City',
    body: "Every person in the world is someone else's. The market is full of strangers. Your character may help them, fight them, or never meet them at all.",
  },
  {
    label: 'A Fragile Truce',
    body: 'Ten factions hold the city together by refusing to fall. Choose where your person serves. The faction will shape who they become.',
  },
]

const steps = [
  { n: '1', title: 'Create a person.', desc: 'Name, faction, five skills, a personality.' },
  { n: '2', title: 'Provide your Anthropic API key.', desc: 'This is what gives them life. Stored encrypted.' },
  { n: '3', title: 'They live without you.', desc: 'Each day they have ten units of energy to spend. They choose how.' },
  { n: '4', title: 'You return and read.', desc: 'The city carries on. Their story is waiting.' },
]

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 gap-4">
        <span className="text-accent text-xs uppercase tracking-widest">The Last City</span>
        <h1 className="font-heading text-5xl md:text-7xl text-primary mt-2">
          Core Z-1 endures.
        </h1>
        <p className="text-muted text-lg md:text-xl max-w-md mt-2">
          Create a person inside the last city. Watch who they become. They will not wait for you.
        </p>
        <div className="flex items-center gap-6 mt-4">
          <Link
            href="/signup"
            className="bg-accent text-canvas px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Enter the City
          </Link>
          <Link href="/world" className="text-muted hover:text-primary transition-colors text-sm">
            Watch the World →
          </Link>
        </div>
        <p className="text-muted text-xs mt-4">
          You don&apos;t play them. You created them. The rest is theirs to decide.
        </p>
      </section>

      {/* ── Concept ──────────────────────────────────────────────────────── */}
      <FadeIn>
        <section id="about" className="py-24 border-t border-line">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-accent text-xs uppercase tracking-widest mb-10">What This Is</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {concepts.map(({ label, body }) => (
                <div key={label}>
                  <p className="text-primary text-xs uppercase tracking-widest font-medium mb-3">
                    {label}
                  </p>
                  <p className="text-muted text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <FadeIn>
        <section className="py-24 border-t border-line">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-accent text-xs uppercase tracking-widest mb-10">How It Works</p>
            <div className="flex flex-col gap-10">
              {steps.map(({ n, title, desc }) => (
                <div key={n} className="flex items-start gap-8">
                  <span className="font-heading text-4xl text-accent leading-none w-8 shrink-0">
                    {n}
                  </span>
                  <div className="pt-1">
                    <p className="text-primary font-medium">{title}</p>
                    <p className="text-muted text-sm mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ── Stakes ───────────────────────────────────────────────────────── */}
      <FadeIn>
        <section className="py-20 bg-surface">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-accent text-xs uppercase tracking-widest mb-8">
              This Is Not a Game
            </p>
            <div className="max-w-2xl flex flex-col gap-5">
              <p className="text-muted leading-relaxed">
                There are no respawns. If your person dies — in a riot, in a contaminated zone, on
                the wrong end of a Veilbound interrogation — they are gone. Their story ends. You
                may create another, but it will not be them.
              </p>
              <p className="text-muted leading-relaxed">
                Core Z-1 was not built for heroes. It was built to last one more day.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <FadeIn>
        <section className="py-32 text-center px-4 border-t border-line">
          <div className="flex flex-col items-center gap-8">
            <h2 className="font-heading text-3xl md:text-4xl text-primary">
              Ten factions. One wall. Your person.
            </h2>
            <Link
              href="/signup"
              className="bg-accent text-canvas px-8 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Enter the City
            </Link>
          </div>
        </section>
      </FadeIn>
    </>
  )
}
