import { AnatomySection } from './components/AnatomySection'
import { CTAFooter } from './components/CTAFooter'
import { FeatureGrid } from './components/FeatureGrid'
import { Hero } from './components/Hero'
import { HowItFloats } from './components/HowItFloats'
import { SpecBand } from './components/SpecBand'

const NAV = [
  { id: 'how', label: '原理' },
  { id: 'anatomy', label: '拆解' },
  { id: 'features', label: '能力' },
  { id: 'specs', label: '规格' },
] as const

export function MagOrbConsole() {
  return (
    <div className="flex min-h-svh flex-col bg-black text-[#f5f5f7]">
      <header className="sticky top-0 z-[10000] border-b border-white/10 bg-black/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-[1024px] items-center justify-between px-5 md:h-11 md:px-8">
          <a
            href="#hero"
            className="text-[14px] font-medium tracking-tight text-white/90 transition hover:text-white"
          >
            磁悬星
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-[12px] font-normal text-white/80 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#preorder"
              className="text-[12px] font-normal text-[#ffb47a] transition hover:text-[#ffd296]"
            >
              预订
            </a>
          </nav>

          <a
            href="#preorder"
            className="text-[12px] font-medium text-[#ffb47a] transition hover:text-[#ffd296] md:hidden"
          >
            预订 ›
          </a>
        </div>

        {/* Mobile nav row */}
        <nav
          className="flex items-center gap-5 overflow-x-auto border-t border-white/5 px-5 py-2 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
          aria-label="主导航"
        >
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 text-[12px] text-white/70 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="relative flex-1 overflow-x-hidden bg-black">
        <Hero />
        <HowItFloats />
        <AnatomySection />
        <FeatureGrid />
        <SpecBand />
        <CTAFooter />
      </main>
    </div>
  )
}
