import { Link } from 'react-router-dom'
import { m, type Transition } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: EASE } as Transition,
})

const stats = [
  { value: '< 400', unit: 'ms', label: 'Finality on Solana' },
  { value: '100%', unit: '', label: 'Non-custodial exit' },
  { value: '0', unit: 'trust', label: 'Needed from Ika nodes' },
  { value: '∞', unit: '', label: 'Permissionless withdrawals' },
]

const features = [
  {
    icon: '◎',
    title: 'Liveness Monitor', tag: 'ALWAYS ON',
    desc: 'Tracks every heartbeat from Ika executor nodes on-chain. If the network goes silent for N blocks, the protocol detects it immediately.',
    accent: false,
  },
  {
    icon: '⚠',
    title: 'Emergency Mode', tag: 'AUTOMATIC',
    desc: 'Automatically triggers when liveness fails. No governance vote, no multisig delay. Pure on-chain logic activates the escape hatch.',
    accent: true,
  },
  {
    icon: '↗',
    title: 'Force Withdraw', tag: 'TRUSTLESS',
    desc: 'Users call force_withdraw() directly on Solana. Funds leave the vault without any signature from Ika nodes. Your keys, your coins.',
    accent: false,
  },
  {
    icon: '⚡',
    title: 'Slash & Bounty', tag: 'INCENTIVIZED',
    desc: "Malicious executor stake is burned on-chain. The reporter who triggered emergency mode collects a bounty from the slashed collateral.",
    accent: false,
  },
]

function CellOrb() {
  return (
    <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center animate-float">
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute rounded-full border animate-pulse-w"
          style={{
            width: `${120 + i * 64}px`,
            height: `${120 + i * 64}px`,
            borderColor: `rgba(255,255,255,${0.12 - i * 0.03})`,
            animationDelay: `${i * 0.5}s`,
          }} />
      ))}
      <div className="relative w-28 h-28 rounded-full border border-white/40 flex items-center justify-center"
           style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="w-3 h-3 rounded-full bg-white" style={{ boxShadow: '0 0 16px rgba(255,255,255,0.6)' }} />
      </div>
      <div className="absolute inset-0 animate-spin-slow">
        <div className="w-3.5 h-3.5 rounded-full bg-[#CC6437] absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
             style={{ boxShadow: '0 0 12px #CC6437' }} />
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-32 overflow-hidden min-h-[90vh]">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

        <m.div {...fade(0.1)} className="mb-6">
          <span className="font-mono text-[11px] tracking-[-0.22px] uppercase text-[#CECECE] border border-white/20 px-[11px] py-[5px] rounded-full inline-block">
            Superteam Encrypt / Ika Bounty
          </span>
        </m.div>

        <m.h1 {...fade(0.2)} className="font-cond text-[52px] md:text-[72px] lg:text-[82px] font-bold leading-[1.05] tracking-[-1.24px] mb-6 max-w-4xl">
          <span className="gradient-text">The Cell That</span>
          <br />
          <span className="text-white">Saves Itself</span>
        </m.h1>

        <m.p {...fade(0.35)} className="text-[#858585] text-[15px] md:text-[17px] max-w-xl leading-[1.6] mb-4 tracking-[-0.02em]">
          Apoptosis Protocol is a trustless <span className="text-white">escape hatch</span> for the{' '}
          <span className="text-[#CC6437]">Ika FHE coprocessor network</span> on Solana.
          When executor nodes fail, censor, or disappear — users exit safely. Always.
        </m.p>

        <m.p {...fade(0.4)} className="font-mono text-[11px] text-[#858585]/60 mb-12 tracking-[-0.22px]">
          Named after biological apoptosis — programmed cell death that protects the organism.
        </m.p>

        <m.div {...fade(0.5)} className="flex flex-row flex-wrap gap-3 justify-center mb-20">
          <Link to="/how-it-works"
            className="whitespace-nowrap px-[18px] py-[10px] bg-white text-[#0B0B0B] font-cond text-sm font-bold tracking-[-0.02em] uppercase rounded-full hover:bg-[#CECECE] transition-colors duration-200">
            HOW IT WORKS →
          </Link>
          <a href="https://github.com/justbiar/apoptosis-protocol" target="_blank" rel="noopener noreferrer"
            className="whitespace-nowrap px-[18px] py-[10px] border border-white/60 text-white font-cond text-sm font-bold tracking-[-0.02em] uppercase rounded-full hover:bg-white hover:text-[#0B0B0B] transition-all duration-200">
            VIEW CODE ↗
          </a>
        </m.div>

        <m.div {...fade(0.6)}>
          <CellOrb />
        </m.div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#272A2A] py-10" style={{ background: '#000000' }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <m.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="text-center">
              <div className="font-cond text-[32px] md:text-[40px] font-bold text-white leading-[1.1] tracking-[-0.64px]">
                {s.value}<span className="text-base ml-1 text-[#858585]">{s.unit}</span>
              </div>
              <div className="font-mono text-[11px] text-[#858585] tracking-[-0.22px] uppercase mt-2">{s.label}</div>
            </m.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-[80px]">
        <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <p className="font-mono text-[11px] tracking-[-0.22px] uppercase text-[#858585] mb-4">Protocol Components</p>
          <h2 className="font-cond text-[32px] md:text-[40px] font-bold text-white leading-[1.1] tracking-[-0.64px]">Four layers. One guarantee.</h2>
          <p className="text-[#858585] mt-4 max-w-md mx-auto text-[14px] leading-[1.6]">
            Each component activates in sequence — from monitoring to exit to punishment.
          </p>
        </m.div>

        <div className="grid md:grid-cols-2 gap-px bg-[#272A2A]">
          {features.map((f, i) => (
            <m.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              className="p-8 group cursor-default transition-colors duration-300"
              style={{ background: i % 2 === 0 ? '#0B0B0B' : '#0B0B0B' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#272A2A' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0B0B0B' }}
            >
              <div className="flex items-start gap-4">
                <span className={`font-mono text-2xl mt-0.5 ${f.accent ? 'text-[#CC6437]' : 'text-white'}`}>{f.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-cond text-[20px] font-bold text-white leading-[1.05] tracking-[-0.4px]">{f.title}</h3>
                    <span className={`font-mono text-[10px] tracking-[-0.02em] px-[10px] py-[5px] rounded-full ${
                      f.accent
                        ? 'text-[#CC6437] border border-[#CC6437]/40'
                        : 'text-[#858585] bg-[#272A2A]'
                    }`}>{f.tag}</span>
                  </div>
                  <p className="text-[#858585] text-[13px] leading-[1.6] tracking-[-0.02em]">{f.desc}</p>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="border-t border-[#272A2A] py-[80px]">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
          <m.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <p className="font-mono text-[11px] tracking-[-0.22px] uppercase text-[#858585] mb-6">The Problem</p>
            <h2 className="font-cond text-[24px] font-bold text-white mb-8 leading-[1.2] tracking-[-0.24px]">What happens when Ika goes dark?</h2>
            <div className="space-y-4">
              {['Executor nodes stop processing transactions', 'User funds locked in Ika vaults on Solana',
                'No on-chain mechanism to force an exit', 'Protocol depends entirely on node liveness'].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="text-[#858585] mt-0.5 font-mono text-xs">–</span>
                  <span className="text-[#858585] text-sm leading-[1.6]">{item}</span>
                </div>
              ))}
            </div>
          </m.div>

          <m.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <p className="font-mono text-[11px] tracking-[-0.22px] uppercase text-[#CC6437] mb-6">The Solution</p>
            <h2 className="font-cond text-[24px] font-bold text-white mb-8 leading-[1.2] tracking-[-0.24px]">Apoptosis activates the exit.</h2>
            <div className="space-y-4">
              {['On-chain liveness monitor catches failure instantly', 'Emergency mode auto-triggers — zero governance delay',
                'force_withdraw() lets users exit without Ika approval', 'Malicious nodes get slashed, reporters get paid'].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="text-white mt-0.5 font-mono text-xs">+</span>
                  <span className="text-white text-sm leading-[1.6]">{item}</span>
                </div>
              ))}
            </div>
          </m.div>
        </div>
      </section>

      {/* Terminal CTA */}
      <section className="py-[80px] px-6 text-center border-t border-[#272A2A]" style={{ background: '#000000' }}>
        <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-xl mx-auto">
          <div className="border border-[#272A2A] p-8 mb-10 text-left" style={{ background: '#0B0B0B' }}>
            <div className="font-mono text-[11px] text-[#858585] mb-5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#272A2A]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#272A2A]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#CC6437]/60" />
              <span className="ml-2 tracking-[-0.02em]">apoptosis.sol — terminal</span>
            </div>
            <div className="font-mono text-[13px] space-y-2 tracking-[-0.02em]">
              <div><span className="text-[#858585]">$ </span><span className="text-white">anchor deploy apoptosis_protocol</span></div>
              <div className="text-[#CECECE]">✓ Program deployed to devnet</div>
              <div><span className="text-[#858585]">$ </span><span className="text-white">anchor call liveness_monitor --heartbeat</span></div>
              <div className="text-[#CECECE]">✓ Heartbeat registered — block 312,847,291</div>
              <div><span className="text-[#858585]">$ </span><span className="text-white">anchor call force_withdraw --amount 1000 USDC</span></div>
              <div className="text-[#CC6437]">✓ Funds transferred — no Ika approval required</div>
              <div className="flex items-center gap-1">
                <span className="text-[#858585]">$</span>
                <span className="animate-blink text-white">▌</span>
              </div>
            </div>
          </div>
          <h2 className="font-cond text-[32px] font-bold text-white mb-4 tracking-[-0.64px]">Ready to audit the code?</h2>
          <p className="text-[#858585] mb-8 text-sm leading-[1.6]">Full Anchor program, test suite, and architecture docs available on GitHub.</p>
          <Link to="/how-it-works"
            className="px-[18px] py-[10px] border border-white/60 text-white font-cond text-sm font-bold tracking-[-0.02em] uppercase rounded-full hover:bg-white hover:text-[#0B0B0B] transition-all duration-200 inline-block">
            EXPLORE ARCHITECTURE →
          </Link>
        </m.div>
      </section>

      <footer className="border-t border-[#272A2A] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <span className="font-mono text-[11px] text-[#272A2A]">Solana · FHE · Rust/Anchor</span>
        </div>
      </footer>
    </div>
  )
}
