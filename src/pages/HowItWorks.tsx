import { Link } from 'react-router-dom'
import { m, type Transition } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: EASE } as Transition,
})

function highlightRust(code: string) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\b(pub|fn|let|mut|Ok|require|struct|impl|use|Result)\b/g, "<span style='color:#CECECE'>$1</span>")
    .replace(/\b(Context|Clock|u64|bool|String|u128)\b/g, "<span style='color:#fff'>$1</span>")
    .replace(/(\/\/[^\n]*)/g, "<span style='color:#858585'>$1</span>")
    .replace(/"([^"]*)"/g, "<span style='color:#CC6437'>\"$1\"</span>")
}

/* ── Mac Terminal code block ── */
function Terminal({ title, highlighted }: { title: string; highlighted: string }) {
  return (
    <m.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: EASE } as Transition}
      className="rounded-xl border border-[#272A2A]/60 overflow-hidden shadow-2xl"
      style={{ background: '#111' }}
    >
      <div className="flex items-center px-4 py-3 bg-[#1C1C1C] border-b border-[#272A2A]/50">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
        </div>
        <span className="flex-1 text-center font-mono text-[11px] text-[#858585] tracking-wide">
          {title}
        </span>
      </div>
      <pre className="p-5 text-[12px] font-mono overflow-x-auto leading-[1.75] text-[#CECECE]">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </m.div>
  )
}

/* ── step data (highlighting pre-computed at module load) ── */
const steps = [
  {
    n: '01', tag: 'LIVENESS MONITOR', title: 'The Network Watches',
    sub: 'Continuous heartbeat verification on Solana',
    desc: 'Every time the Encrypt executor network processes an FHE computation, it must submit a heartbeat transaction to the Apoptosis Program on Solana.',
    details: [
      'Executor nodes call register_heartbeat() after each computation batch',
      'The program records the current Solana slot number on-chain',
      'A configurable liveness_threshold (e.g. 150 slots ≈ 60s) defines the silence window',
      'Any account on Solana can read this timestamp — full transparency',
    ],
    code: `pub fn register_heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
    let monitor = &mut ctx.accounts.liveness_monitor;
    monitor.last_seen_slot = Clock::get()?.slot;
    monitor.total_heartbeats += 1;
    emit!(HeartbeatEvent { slot: monitor.last_seen_slot });
    Ok(())
}`,
    emergency: false,
  },
  {
    n: '02', tag: 'EMERGENCY MODE', title: 'Silence Triggers the Protocol',
    sub: 'Automatic state transition — no governance required',
    desc: 'If the current Solana slot exceeds last_seen_slot + liveness_threshold, any user can call trigger_emergency(). This is a permissionless action — pure math.',
    details: [
      'trigger_emergency() is callable by any Solana account',
      'The program verifies: current_slot > last_seen_slot + liveness_threshold',
      'Protocol state transitions from Active → Emergency atomically',
      'All vaults are immediately frozen for deposits',
      'The triggering account is registered as the bounty recipient',
    ],
    code: `pub fn trigger_emergency(ctx: Context<TriggerEmergency>) -> Result<()> {
    let monitor = &ctx.accounts.liveness_monitor;
    let clock = Clock::get()?;

    require!(
        clock.slot > monitor.last_seen_slot + monitor.liveness_threshold,
        ApoptosisError::StillAlive
    );

    let state = &mut ctx.accounts.protocol_state;
    state.mode = ProtocolMode::Emergency;
    state.emergency_triggered_at = clock.slot;
    state.bounty_recipient = ctx.accounts.reporter.key();

    emit!(EmergencyActivatedEvent { slot: clock.slot });
    Ok(())
}`,
    emergency: true,
  },
  {
    n: '03', tag: 'ESCAPE HATCH', title: 'Users Exit Without Permission',
    sub: 'force_withdraw() — no Encrypt signature needed',
    desc: 'In Emergency mode, users call force_withdraw() directly against their vault PDA on Solana. Encrypt nodes are completely bypassed.',
    details: [
      'Vault PDAs are derived from [user_pubkey, vault_id] seeds',
      'force_withdraw() checks protocol_state.mode == Emergency',
      'Transfers the full vault balance back to the user wallet',
      'Works for SOL, USDC, and any SPL token held in the vault',
      'Idempotent — double-calling is safe (vault is zeroed after first call)',
    ],
    code: `pub fn force_withdraw(ctx: Context<ForceWithdraw>) -> Result<()> {
    let state = &ctx.accounts.protocol_state;
    require!(
        state.mode == ProtocolMode::Emergency,
        ApoptosisError::NotInEmergency
    );

    let vault = &mut ctx.accounts.user_vault;
    let amount = vault.locked_amount;

    // Transfer SOL/SPL back to user — no Encrypt approval
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;

    vault.locked_amount = 0;
    vault.withdrawn_in_emergency = true;

    emit!(ForceWithdrawEvent { user: ctx.accounts.user.key(), amount });
    Ok(())
}`,
    emergency: false,
  },
  {
    n: '04', tag: 'SLASH & BOUNTY', title: 'Bad Actors Get Burned',
    sub: 'Economic punishment + reporter reward',
    desc: 'Once Emergency mode is confirmed, the protocol slashes the collateral staked by the offline executor nodes. A portion is distributed to the reporter.',
    details: [
      'Executor nodes must stake collateral when joining the network',
      'slash_executor() burns a percentage of stake (e.g. 30%)',
      'Remaining slash proceeds fund the bounty pool',
      'The bounty_recipient from step 02 claims the reward',
      'Slash parameters are governance-configurable',
    ],
    code: `pub fn slash_executor(ctx: Context<SlashExecutor>) -> Result<()> {
    let state = &ctx.accounts.protocol_state;
    require!(state.mode == ProtocolMode::Emergency, ApoptosisError::NotInEmergency);

    let stake = &mut ctx.accounts.executor_stake;
    let slash_amount = stake.collateral
        .checked_mul(SLASH_BPS).unwrap()
        .checked_div(10_000).unwrap();

    burn_tokens(ctx.accounts.burn_ctx(), slash_amount)?;
    transfer_to_bounty(ctx.accounts.bounty_ctx(), stake.collateral - slash_amount)?;

    stake.collateral = 0;
    stake.slashed = true;

    emit!(SlashEvent { executor: stake.executor, amount: slash_amount });
    Ok(())
}`,
    emergency: false,
  },
].map(s => ({ ...s, highlighted: highlightRust(s.code) }))

/* ══════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function HowItWorks() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative text-center px-6 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />
        <m.div {...fade(0.1)} className="mb-5">
          <Link to="/" className="font-mono text-[11px] tracking-wide text-[#858585] hover:text-white transition-colors uppercase">← Back to Home</Link>
        </m.div>
        <m.div {...fade(0.15)} className="mb-5">
          <span className="font-mono text-[11px] uppercase text-[#CECECE] border border-white/20 px-3 py-1.5 rounded-full inline-block">Technical Architecture</span>
        </m.div>
        <m.h1 {...fade(0.25)} className="font-cond text-[42px] md:text-[62px] font-bold text-white mb-4 leading-[1.05] tracking-[-1.24px]">How Apoptosis Works</m.h1>
        <m.p {...fade(0.35)} className="text-[#858585] text-[15px] max-w-xl mx-auto leading-[1.6]">
          Four on-chain primitives that form a complete safety net for the Encrypt FHE network. Permissionless, automatic, and economically incentivized.
        </m.p>
      </section>

      {/* Protocol State Machine */}
      <section className="border-y border-[#272A2A] py-20" style={{ background: '#000' }}>
        <div className="max-w-5xl mx-auto px-6">
          <m.p {...fade(0)} className="font-mono text-[11px] text-[#858585] uppercase text-center mb-3 tracking-widest">Protocol State Machine</m.p>
          <m.h2 {...fade(0.05)} className="font-cond text-[28px] md:text-[36px] font-bold text-white text-center mb-6 tracking-tight">What happens when Executors go offline?</m.h2>
          <m.p {...fade(0.1)} className="text-[#858585] text-sm text-center max-w-lg mx-auto mb-16 leading-relaxed">Encrypt's FHE executors run on centralized H100 GPUs. If they stop — Apoptosis activates.</m.p>

          <div className="grid md:grid-cols-2 gap-6">
            <m.div {...fade(0.1)} className="rounded-xl border border-[#272A2A] p-7" style={{ background: '#0B0B0B' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="font-mono text-lg text-white animate-pulse-dot">◎</span>
                  </div>
                  <div><h3 className="font-cond text-lg font-bold text-white leading-tight">Active</h3><p className="font-mono text-[10px] text-[#858585] uppercase tracking-wider">Heartbeats flowing</p></div>
                </div>
                <span className="font-mono text-[10px] text-[#858585] border border-[#272A2A] px-2.5 py-1 rounded-full">01</span>
              </div>
              <div className="space-y-3">
                {['Executors process FHE computations on H100 GPUs','Heartbeats sent to Solana every ~60 seconds','User funds secured in vault PDAs'].map((t,i)=>(
                  <div key={t} className="flex items-center gap-3 px-3 py-2.5 rounded-md" style={{ background: '#000' }}>
                    <div className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0 animate-pulse-dot" style={{ animationDelay: `${i * 0.6}s` }} />
                    <span className="font-mono text-[11px] text-[#CECECE]">{t}</span>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[10px] text-[#858585] mt-5 border-t border-[#272A2A] pt-4">Apoptosis monitors <span className="text-white">last_seen_slot</span> in the background.</p>
            </m.div>

            <m.div {...fade(0.15)} className="rounded-xl border border-[#CC6437]/30 p-7" style={{ background: 'rgba(204,100,55,0.03)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-[#CC6437]/30 flex items-center justify-center" style={{ background: 'rgba(204,100,55,0.06)' }}>
                    <span className="font-mono text-lg text-[#CC6437] animate-pulse-warn">⚠</span>
                  </div>
                  <div><h3 className="font-cond text-lg font-bold text-white leading-tight">Silent</h3><p className="font-mono text-[10px] text-[#CC6437] uppercase tracking-wider">Heartbeats stopped</p></div>
                </div>
                <span className="font-mono text-[10px] text-[#CC6437] border border-[#CC6437]/30 px-2.5 py-1 rounded-full">02</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md" style={{ background: '#000' }}>
                  <div className="w-2 h-2 rounded-full bg-[#CC6437] flex-shrink-0 animate-pulse-warn" />
                  <span className="font-mono text-[11px] text-[#CECECE]">No heartbeat for <span className="text-[#CC6437]">150+ blocks</span> (~60s)</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md" style={{ background: '#000' }}><span className="w-2 h-2 rounded-full bg-[#858585]/40 flex-shrink-0" /><span className="font-mono text-[11px] text-[#858585]">H100 GPUs crashed, network issue, or malicious action</span></div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md" style={{ background: '#000' }}><span className="w-2 h-2 rounded-full bg-[#858585]/40 flex-shrink-0" /><span className="font-mono text-[11px] text-[#858585]">Funds locked — normal exit path unavailable</span></div>
              </div>
              <p className="font-mono text-[10px] text-[#CC6437] mt-5 border-t border-[#CC6437]/15 pt-4">Anyone can detect this by reading <span className="text-white">last_seen_slot</span>.</p>
            </m.div>

            <m.div {...fade(0.2)} className="rounded-xl border border-[#CC6437]/40 p-7" style={{ background: 'rgba(204,100,55,0.04)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-[#CC6437]/40 flex items-center justify-center" style={{ background: 'rgba(204,100,55,0.08)' }}>
                    <span className="font-mono text-lg text-[#CC6437] animate-scale-pulse">⚡</span>
                  </div>
                  <div><h3 className="font-cond text-lg font-bold text-white leading-tight">Emergency</h3><p className="font-mono text-[10px] text-[#CC6437] uppercase tracking-wider">Protocol activates</p></div>
                </div>
                <span className="font-mono text-[10px] text-[#CC6437] border border-[#CC6437]/30 px-2.5 py-1 rounded-full">03</span>
              </div>
              <div className="space-y-3">
                {['Any user calls trigger_emergency()','All vault deposits frozen atomically','Reporter address saved for bounty payout'].map(t=>(
                  <div key={t} className="flex items-center gap-3 px-3 py-2.5 rounded-md" style={{ background: '#000' }}>
                    <span className="font-mono text-[11px] text-[#CC6437] flex-shrink-0">▸</span>
                    <span className="font-mono text-[11px] text-[#CECECE]">{t}</span>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[10px] text-[#CC6437] mt-5 border-t border-[#CC6437]/15 pt-4">No governance vote. No multisig. <span className="text-white">Pure on-chain math.</span></p>
            </m.div>

            <m.div {...fade(0.25)} className="rounded-xl border border-[#272A2A] p-7" style={{ background: '#0B0B0B' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="font-mono text-lg text-white animate-float-up">↗</span>
                  </div>
                  <div><h3 className="font-cond text-lg font-bold text-white leading-tight">Exit</h3><p className="font-mono text-[10px] text-[#858585] uppercase tracking-wider">Funds returned safely</p></div>
                </div>
                <span className="font-mono text-[10px] text-[#858585] border border-[#272A2A] px-2.5 py-1 rounded-full">04</span>
              </div>
              <div className="space-y-3">
                {['Users call force_withdraw() — full balance returned','Executor stake slashed & burned on-chain','Reporter earns bounty from slashed collateral'].map(t=>(
                  <div key={t} className="flex items-center gap-3 px-3 py-2.5 rounded-md" style={{ background: '#000' }}>
                    <span className="font-mono text-[11px] text-white flex-shrink-0">▸</span>
                    <span className="font-mono text-[11px] text-[#CECECE]">{t}</span>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[10px] text-[#858585] mt-5 border-t border-[#272A2A] pt-4">No Encrypt signature needed. <span className="text-white">Your keys, your coins.</span></p>
            </m.div>
          </div>

          <m.div {...fade(0.3)} className="mt-12 max-w-3xl mx-auto border border-dashed border-[#272A2A] rounded-xl p-6 md:p-8 flex items-start gap-5" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <div className="w-11 h-11 rounded-full border border-[#CC6437]/25 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(204,100,55,0.06)' }}>
              <span className="font-mono text-sm text-[#CC6437]">◈</span>
            </div>
            <div>
              <h4 className="font-cond text-base text-white font-bold mb-2">Why can't Decryptors help?</h4>
              <p className="text-[#858585] text-sm leading-relaxed">
                Encrypt's <span className="text-white">Decryptors are decentralized</span> (2/3 threshold MPC) — but they only handle decryption. They <span className="text-white">cannot release locked funds</span> from vaults. When centralized Executors go offline, there is no exit. <span className="text-[#CC6437]">Apoptosis</span> is the missing safety layer.
              </p>
            </div>
          </m.div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-5xl mx-auto px-6 py-20 space-y-16">
        {steps.map((step, i) => (
          <m.div key={step.n} {...fade(0.08 * i)} className="border border-[#272A2A] overflow-hidden rounded-2xl" style={{ background: step.emergency ? 'rgba(204,100,55,0.03)' : '#0B0B0B' }}>
            <div className="p-6 md:p-8 border-b border-[#272A2A]">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center" style={{ borderColor: step.emergency ? '#CC6437' : 'rgba(255,255,255,0.15)', background: step.emergency ? 'rgba(204,100,55,0.08)' : 'rgba(255,255,255,0.03)' }}>
                  <span className="font-mono text-xs font-bold" style={{ color: step.emergency ? '#CC6437' : '#CECECE' }}>{step.n}</span>
                </div>
                <div className="flex-1">
                  <span className="font-mono text-[10px] uppercase px-2.5 py-1 rounded-full inline-block mb-2" style={{ color: step.emergency ? '#CC6437' : '#858585', background: step.emergency ? 'rgba(204,100,55,0.1)' : '#272A2A' }}>{step.tag}</span>
                  <h2 className="font-cond text-[24px] md:text-[28px] font-bold text-white mb-1 leading-tight">{step.title}</h2>
                  <p className="font-mono text-[11px]" style={{ color: step.emergency ? '#CC6437' : '#858585' }}>{step.sub}</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-[#858585] text-sm leading-[1.7] mb-6">{step.desc}</p>
                <ul className="space-y-3">
                  {step.details.map(d => (<li key={d} className="flex items-start gap-3"><span className="mt-1 font-mono text-[11px] text-[#858585]">▸</span><span className="text-[#CECECE] text-sm leading-[1.6]">{d}</span></li>))}
                </ul>
              </div>
              <Terminal title={`~/${step.tag.toLowerCase().replace(/ /g, '_')} — vim apoptosis_protocol.rs`} highlighted={step.highlighted} />
            </div>
          </m.div>
        ))}
      </section>

      {/* Security */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <m.div {...fade(0)} className="text-center mb-12">
          <p className="font-mono text-[11px] uppercase text-[#858585] mb-3 tracking-widest">Security Properties</p>
          <h2 className="font-cond text-[28px] md:text-[32px] font-bold text-white">What Apoptosis guarantees</h2>
        </m.div>
        <div className="grid md:grid-cols-3 gap-px bg-[#272A2A]">
          {[
            { icon: '↺', title: 'Liveness', desc: "If Encrypt's executor network fails, users are never permanently locked out." },
            { icon: '⊘', title: 'Censorship Resistance', desc: 'force_withdraw() requires only a valid Solana keypair. No node can block the exit.' },
            { icon: '◈', title: 'Incentive Alignment', desc: 'Reporters are paid to watch. Slashing makes attacks economically irrational.' },
          ].map((p, i) => (
            <m.div key={p.title} {...fade(i * 0.1)} className="p-8 transition-colors duration-300 cursor-default" style={{ background: '#0B0B0B' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#272A2A' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0B0B0B' }}>
              <div className="font-mono text-xl text-[#CC6437] mb-4">{p.icon}</div>
              <h3 className="font-cond text-[20px] font-bold text-white mb-3">{p.title}</h3>
              <p className="text-[#858585] text-sm leading-[1.7]">{p.desc}</p>
            </m.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#272A2A] py-20 px-6 text-center" style={{ background: '#000' }}>
        <m.div {...fade(0)}>
          <h2 className="font-cond text-[32px] font-bold text-white mb-4">Ready to go deeper?</h2>
          <p className="text-[#858585] mb-8 max-w-md mx-auto text-sm leading-[1.6]">Read the full Anchor program source, run the test suite, or check the bounty submission on Superteam.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/" className="px-5 py-2.5 border border-white/40 text-white font-cond text-sm font-bold uppercase rounded-full hover:bg-white hover:text-[#0B0B0B] transition-all">← HOME</Link>
            <a href="https://github.com/justbiar/apoptosis-protocol" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-white text-[#0B0B0B] font-cond text-sm font-bold uppercase rounded-full hover:bg-[#CECECE] transition-colors">GITHUB REPO ↗</a>
          </div>
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
