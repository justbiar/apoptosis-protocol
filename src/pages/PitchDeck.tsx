import { useState } from 'react'
import { m, AnimatePresence, type Transition } from 'framer-motion'
import { Link } from 'react-router-dom'

type Phase = 'active' | 'silent' | 'emergency' | 'exit'
type Lang = 'en' | 'tr'

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: EASE } as Transition,
})

const CFG: Record<Phase, { icon: string; color: string; bg: string; border: string; next: Phase }> = {
  active:    { icon: '◎', color: '#22c55e', bg: 'rgba(34,197,94,0.055)',   border: 'rgba(34,197,94,0.22)',   next: 'silent'    },
  silent:    { icon: '⚠', color: '#eab308', bg: 'rgba(234,179,8,0.055)',   border: 'rgba(234,179,8,0.22)',   next: 'emergency' },
  emergency: { icon: '⚡', color: '#CC6437', bg: 'rgba(204,100,55,0.055)',  border: 'rgba(204,100,55,0.28)',  next: 'exit'      },
  exit:      { icon: '✓', color: '#3b82f6', bg: 'rgba(59,130,246,0.055)',  border: 'rgba(59,130,246,0.22)',  next: 'active'    },
}

const PHASE_ORDER: Phase[] = ['active', 'silent', 'emergency', 'exit']

const CODE: Record<Phase, string> = {
  active:
`pub fn register_heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
    let monitor = &mut ctx.accounts.liveness_monitor;
    monitor.last_seen_slot = Clock::get()?.slot;
    monitor.total_heartbeats += 1;
    emit!(HeartbeatEvent { slot: monitor.last_seen_slot });
    Ok(())
}`,
  silent:
`// Liveness violation detected:
// current_slot > last_seen_slot + liveness_threshold
//
// Any Solana account can call trigger_emergency().
// No governance vote, multisig, or delay required.
// Pure on-chain math.`,
  emergency:
`pub fn trigger_emergency(ctx: Context<TriggerEmergency>) -> Result<()> {
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
  exit:
`pub fn force_withdraw(ctx: Context<ForceWithdraw>) -> Result<()> {
    let state = &ctx.accounts.protocol_state;
    require!(state.mode == ProtocolMode::Emergency, ApoptosisError::NotInEmergency);

    let vault = &mut ctx.accounts.user_vault;
    let amount = vault.locked_amount;
    // No Ika/Encrypt signature — PDA ownership only
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;
    vault.locked_amount = 0;
    emit!(ForceWithdrawEvent { user: ctx.accounts.user.key(), amount });
    Ok(())
}`,
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  en: {
    nav: [['#sec-problem','Problem'],['#sec-flow','Flow'],['#sec-economy','Economy'],['#sec-edge','Solutions']] as [string,string][],
    badge: 'Superteam Encrypt Bounty 2025',
    heroDesc: () => (
      <>Autonomous escape hatch for <span className="text-white">centralized FHE Executors</span> on <span className="text-[#CC6437]">Solana</span></>
    ),
    sec1Label: 'FHE Bottleneck',
    executor: {
      badge: 'Centralized ⚠', title: 'Executor', sub: 'NVIDIA H100 GPU · FHE Compute',
      points: ['~$25,000+ hardware cost', 'Only large operators can run', 'Single point of failure (SPOF)', 'Offline = funds permanently locked'],
      footer: 'Critical dependency',
    },
    gap: {
      desc: 'When the Executor goes offline, user funds are locked',
      sub: 'Decryptors only decrypt — they cannot route funds',
      badge: 'No exit path',
    },
    decryptor: {
      badge: 'Decentralized ✓', title: 'Decryptor', sub: 'MPC Network · Threshold Decryption',
      points: ['2/3 majority threshold (MPC)', 'Truly decentralized', 'Handles decryption', 'Cannot route funds'],
      footer: 'Good — but insufficient',
    },
    warnTitle: 'Critical Vulnerability — No Existing Solution',
    warnDesc: () => (
      <>Even if the Decrypt network is 100% operational, when Executors go offline, user funds remain indefinitely locked in Ika vaults. <span className="text-white">No exit mechanism currently exists.</span> <span className="text-[#CC6437]">Apoptosis Protocol closes this gap.</span></>
    ),
    sec2Label: 'Interactive Simulation',
    sec2Title: 'Apoptosis Flow',
    sec2Sub: 'Simulate protocol state transitions step by step',
    codeFile: 'apoptosis_protocol.rs — active function',
    phases: {
      active:    { label: 'Active',    title: 'System Active — Heartbeat Flowing',      desc: 'Executor nodes submit a heartbeat to Solana every ~60 seconds. User funds are safe in vaults, protocol is in nominal state.',                                                   btn: 'Fast Forward'      },
      silent:    { label: 'Silent',    title: 'Executor Silent — Liveness Violation!',  desc: 'No heartbeat for 150+ blocks. Any user can trigger the emergency — no governance vote required.',                                                                              btn: 'Trigger Emergency' },
      emergency: { label: 'Emergency', title: 'Emergency Active — Vaults Frozen!',      desc: 'New deposits halted. Executor stake ready for slashing. Users can exit directly via PDA.',                                                                                    btn: 'Force Withdraw'    },
      exit:      { label: 'Exit',      title: 'Safe Exit Complete',                     desc: 'User called force_withdraw(). Funds transferred to wallet via PDA. No Ika/Encrypt node signature required.',                                                                   btn: 'Reset'             },
    },
    activeStats: [['2s ago','Last Heartbeat'],['#312,847,291','Slot Number'],['150 slots','Liveness Threshold']] as [string,string][],
    emergencyGrid: [['⊘ HALTED','New Deposits',false],['⊘ FROZEN','Vaults',false],['✓ ACTIVE','Force Withdraw',true],['✓ READY','Slash Mechanism',true]] as [string,string,boolean][],
    silentViolation: '→ Violation!',
    exitLines: ['anchor call force_withdraw --vault user_pda','✓ 1,000 USDC → transferred to your wallet','✓ No Ika/Encrypt signature required','✓ PDA ownership cryptographically verified'],
    sec3Label: 'Economic Incentive Model',
    sec3Title: 'Slash & Bounty Calculator',
    sec3Sub: 'Rational ecosystem watching the network 24/7 against bad actors',
    paramTitle: 'Parameters',
    stakeLabel: 'Executor Stake Amount',
    slashLabel: 'Slash Rate',
    modelNote: 'Ensures watchers are rational actors. The larger the executor stake, the more costly a violation becomes.',
    resultTitle: 'Result',
    totalSlash: 'Total Slash Amount',
    burnedLabel: 'Burned',
    burnedNote: 'SOL · 50% burned',
    watcherLabel: 'Watcher Bounty',
    watcherNote: 'SOL · 50% reward',
    barLeft: '50% Burned (Deflation)',
    barRight: '50% Watcher Reward',
    sec4Label: 'Engineering Decisions',
    sec4Title: 'Critical Solutions',
    sec4Sub: 'Edge cases and engineering responses',
    problemLbl: 'Problem',
    solutionLbl: 'Solution',
    ctaBadge: 'Superteam Bounty',
    ctaTitle: 'Ready?',
    ctaDesc: 'Full Anchor program, test suite, and architecture documentation available on GitHub.',
    ctaHome: '← Home',
    ctaTech: 'Technical Details →',
    footerLeft: 'Apoptosis Protocol — Superteam Encrypt Bounty 2025',
    footerRight: 'Solana · FHE · Rust/Anchor',
    edges: [
      { icon: '⚡', title: 'Network Congestion', sub: 'Solana Congestion',
        p: 'During high traffic, heartbeat transactions may be delayed, increasing false-positive emergency trigger risk.',
        s: 'A dynamic tolerance curve replaces the fixed slot threshold. liveness_threshold auto-adjusts based on the congestion index.' },
      { icon: '◈', title: 'Complex DeFi States', sub: 'DeFi State Complexity',
        p: 'Composite positions across multiple protocols can create a difficult-to-unwind state during force_withdraw.',
        s: 'Only Base Vaults are protected in phase one. Composite positions added via staged roadmap, not all at once.' },
      { icon: '◎', title: 'System Integration', sub: 'Encrypt / Ika Compatibility',
        p: 'Forking the Encrypt protocol would break existing security assumptions and user trust.',
        s: "Apoptosis doesn't fork — it's a Wrapper/Middleware. An independent security layer without touching a single line of Encrypt." },
    ],
  },
  tr: {
    nav: [['#sec-problem','Problem'],['#sec-flow','Akış'],['#sec-economy','Ekonomi'],['#sec-edge','Çözümler']] as [string,string][],
    badge: 'Superteam Encrypt Bounty 2025',
    heroDesc: () => (
      <>Solana üzerindeki <span className="text-white">merkezi FHE Executor</span>'ları için <span className="text-[#CC6437]">Otonom Kaçış Kapağı</span></>
    ),
    sec1Label: 'FHE Darboğazı',
    executor: {
      badge: 'Merkezi ⚠', title: 'Executor', sub: 'NVIDIA H100 GPU · FHE Hesaplama',
      points: ['~25.000$+ donanım maliyeti', 'Sadece büyük operatörler çalıştırabilir', 'Tek nokta arıza riski (SPOF)', 'Kapalıysa fonlar kalıcı kilitlenir'],
      footer: 'Kritik bağımlılık',
    },
    gap: {
      desc: "Executor çöktüğünde kullanıcı fonları kilitlenir",
      sub: "Decryptor'lar yalnızca şifre çözer, fon yönlendiremez",
      badge: 'Çıkış yolu yok',
    },
    decryptor: {
      badge: 'Merkeziyetsiz ✓', title: 'Decryptor', sub: 'MPC Ağı · Eşik Şifre Çözme',
      points: ['2/3 çoğunluk eşiği (threshold MPC)', 'Gerçekten merkeziyetsiz', 'Şifre çözme işlemi yapar', 'Ama fon yönlendiremez'],
      footer: 'İyi — ama yetersiz',
    },
    warnTitle: 'Kritik Güvenlik Açığı — Mevcut Çözüm Yok',
    warnDesc: () => (
      <>Decrypt ağı %100 çalışsa bile Executor'lar çevrimdışı olduğunda kullanıcı fonları Ika kasalarında süresiz kilitlenir. <span className="text-white">Hiçbir mevcut çıkış mekanizması yoktur.</span> <span className="text-[#CC6437]">Apoptosis Protocol bu açığı kapatır.</span></>
    ),
    sec2Label: 'İnteraktif Simülasyon',
    sec2Title: 'Apoptosis Akışı',
    sec2Sub: 'Protokol durum geçişlerini adım adım simüle edin',
    codeFile: 'apoptosis_protocol.rs — aktif fonksiyon',
    phases: {
      active:    { label: 'Aktif',      title: 'Sistem Aktif — Heartbeat Akıyor',           desc: "Executor node'ları her ~60 saniyede bir Solana'ya heartbeat gönderiyor. Kullanıcı fonları kasalarda güvende.",         btn: 'Zamanı İleri Sar'   },
      silent:    { label: 'Sessiz',     title: 'Executor Sessiz — Liveness İhlali!',         desc: "150+ blok boyunca heartbeat gelmedi. Herhangi bir kullanıcı acil durumu tetikleyebilir — yönetim oyu gerekmez.",      btn: 'Acil Durum Tetikle' },
      emergency: { label: 'Acil Durum', title: 'Acil Durum Aktif — Kasalar Donduruldu!',    desc: "Yeni yatırımlar durduruldu. Executor stake'i Slash'e hazır. Kullanıcılar PDA üzerinden doğrudan çıkış yapabilir.",   btn: 'Force Withdraw'     },
      exit:      { label: 'Çıkış',      title: 'Güvenli Çıkış Tamamlandı',                  desc: "force_withdraw() çağrıldı. Fonlar PDA üzerinden cüzdana aktarıldı. Hiçbir Ika/Encrypt imzası gerekmedi.",             btn: 'Sıfırla'            },
    },
    activeStats: [['2s önce','Son Heartbeat'],['#312,847,291','Slot Numarası'],['150 slot','Liveness Eşiği']] as [string,string][],
    emergencyGrid: [['⊘ DURDURULDU','Yeni Yatırım',false],['⊘ DONDURULDU','Kasalar',false],['✓ AKTİF','Force Withdraw',true],['✓ HAZIR','Slash Mekanizması',true]] as [string,string,boolean][],
    silentViolation: '→ İhlal!',
    exitLines: ['anchor call force_withdraw --vault user_pda','✓ 1.000 USDC → cüzdanınıza aktarıldı','✓ Ika/Encrypt imzası gerekmedi','✓ PDA sahipliği kriptografik olarak doğrulandı'],
    sec3Label: 'Ekonomik Teşvik Modeli',
    sec3Title: 'Slash & Bounty Hesaplayıcı',
    sec3Sub: 'Ağı kötü aktörlere karşı 7/24 izleyen rasyonel ekosistem',
    paramTitle: 'Parametreler',
    stakeLabel: 'Executor Stake Miktarı',
    slashLabel: 'Slash Oranı',
    modelNote: "Gözlemcilerin rasyonel aktörler olmasını sağlar. Executor ne kadar büyük stake tutarsa, ihlal etme riski o kadar pahalıya patlar.",
    resultTitle: 'Hesaplama Sonucu',
    totalSlash: 'Toplam Slash Miktarı',
    burnedLabel: 'Yakılan',
    burnedNote: 'SOL · %50 yakıldı',
    watcherLabel: 'Gözlemci Ödülü',
    watcherNote: 'SOL · %50 ödül',
    barLeft: '%50 Yakıldı (Deflasyon)',
    barRight: '%50 Gözlemci Ödülü',
    sec4Label: 'Mühendislik Kararları',
    sec4Title: 'Kritik Çözümler',
    sec4Sub: 'Sınır durumlar ve mühendislik yanıtları',
    problemLbl: 'Sorun',
    solutionLbl: 'Çözüm',
    ctaBadge: 'Superteam Bounty',
    ctaTitle: 'Hazır mısınız?',
    ctaDesc: "Tam Anchor programı, test süiti ve mimari dokümantasyonu GitHub'da mevcut.",
    ctaHome: '← Ana Sayfa',
    ctaTech: 'Teknik Detaylar →',
    footerLeft: 'Apoptosis Protocol — Superteam Encrypt Bounty 2025',
    footerRight: 'Solana · FHE · Rust/Anchor',
    edges: [
      { icon: '⚡', title: 'Ağ Tıkanıklığı', sub: 'Solana Congestion',
        p: 'Yoğun ağ trafiğinde heartbeat işlemleri gecikebilir; yanlış pozitif acil tetikleme riskini artırır.',
        s: 'Dinamik tolerans eğrisi kullanılır. liveness_threshold tıkanıklık indeksine göre otomatik genişler ve daralır.' },
      { icon: '◈', title: 'Karmaşık DeFi Durumları', sub: 'DeFi State Complexity',
        p: "Birden fazla protokole kilitli kompozit pozisyonlar force_withdraw sırasında çözülmesi güç durum oluşturabilir.",
        s: "İlk fazda yalnızca Base Vault'lar korunur. Kompozit pozisyonlar aşamalı roadmap ile eklenir." },
      { icon: '◎', title: 'Sistem Entegrasyonu', sub: 'Encrypt / Ika Uyumluluğu',
        p: "Encrypt protokolünü fork'lamak mevcut güvenlik varsayımlarını ve kullanıcı güvenini bozabilir.",
        s: "Apoptosis fork'lamaz; Wrapper/Middleware olarak çalışır. Encrypt protokolüne tek satır dokunmaz." },
    ],
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PitchDeck() {
  const [lang, setLang] = useState<Lang>('en')
  const [phase, setPhase] = useState<Phase>('active')
  const [stake, setStake] = useState(5000)
  const [slashRate, setSlashRate] = useState(20)
  const [openCard, setOpenCard] = useState<number | null>(0)

  const t = T[lang]
  const cfg = CFG[phase]
  const tp = t.phases[phase]
  const idx = PHASE_ORDER.indexOf(phase)
  const slashedTotal = (stake * slashRate) / 100
  const watcherBounty = Math.floor(slashedTotal * 0.5)
  const burnedAmount = slashedTotal - watcherBounty
  const locale = lang === 'en' ? 'en-US' : 'tr-TR'

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>

      {/* ── Language Toggle ──────────────────────────────────────────────────── */}
      <div className="fixed top-20 right-6 z-40 flex items-center gap-1 p-1 rounded-full border border-white/8"
        style={{ background: 'rgba(11,11,11,0.9)', backdropFilter: 'blur(16px)' }}>
        {(['en', 'tr'] as Lang[]).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`font-mono text-[10px] uppercase px-3 py-1.5 rounded-full transition-all duration-200 ${
              lang === l ? 'bg-[#CC6437] text-white' : 'text-white/40 hover:text-white/70'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Floating Section Nav ─────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-1 px-3 py-2 rounded-full border border-white/8"
        style={{ background: 'rgba(11,11,11,0.9)', backdropFilter: 'blur(16px)' }}>
        {t.nav.map(([href, label]) => (
          <a key={href} href={href}
            className="font-mono text-[10px] uppercase text-white/35 hover:text-white/80 transition-colors px-3 py-1.5 rounded-full hover:bg-white/5">
            {label}
          </a>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO & PROBLEM
          ══════════════════════════════════════════════════════════════════ */}
      <section id="sec-problem" className="min-h-screen flex flex-col justify-center px-6 py-32">
        <div className="max-w-6xl mx-auto w-full">

          <m.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }} className="text-center mb-24">
            <div className="inline-flex items-center gap-2 border border-white/8 rounded-full px-4 py-2 mb-10"
              style={{ background: 'rgba(204,100,55,0.05)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#CC6437] animate-pulse-dot" />
              <span className="font-mono text-[10px] text-[#CC6437] uppercase tracking-widest">{t.badge}</span>
            </div>
            <h1 className="font-cond text-[60px] md:text-[90px] lg:text-[112px] font-bold leading-[0.9] tracking-[-3px] mb-8">
              <span className="gradient-text">Apoptosis</span><br />
              <span className="text-white">Protocol</span>
            </h1>
            <p className="text-[#858585] text-[16px] md:text-[19px] max-w-xl mx-auto leading-[1.65] tracking-[-0.02em]">
              {t.heroDesc()}
            </p>
          </m.div>

          <m.div {...fade(0.2)}>
            <p className="font-mono text-[10px] uppercase text-[#858585] text-center mb-10 tracking-widest">{t.sec1Label}</p>

            <div className="grid md:grid-cols-3 gap-5 mb-5">
              {/* Executor */}
              <div className="rounded-2xl border border-[#CC6437]/30 p-7" style={{ background: 'rgba(204,100,55,0.035)' }}>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono text-[9px] uppercase text-[#CC6437] tracking-widest border border-[#CC6437]/30 px-2.5 py-1 rounded-full">{t.executor.badge}</span>
                  <span className="font-mono text-[10px] text-white/15">01</span>
                </div>
                <h3 className="font-cond text-[28px] font-bold text-white mb-1">{t.executor.title}</h3>
                <p className="font-mono text-[10px] text-[#CC6437]/60 mb-5">{t.executor.sub}</p>
                <div className="space-y-2.5 mb-5">
                  {t.executor.points.map(pt => (
                    <div key={pt} className="flex items-start gap-2">
                      <span className="text-[#CC6437] text-xs mt-0.5 flex-shrink-0">–</span>
                      <span className="font-mono text-[10px] text-[#858585] leading-[1.5]">{pt}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-[#CC6437]/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#CC6437] animate-pulse-warn" />
                  <span className="font-mono text-[10px] text-[#CC6437]">{t.executor.footer}</span>
                </div>
              </div>

              {/* Gap */}
              <div className="flex items-center justify-center py-4">
                <div className="w-full max-w-[200px] border border-white/8 rounded-2xl p-6 text-center"
                  style={{ background: 'rgba(255,255,255,0.012)' }}>
                  <div className="font-cond text-[40px] font-bold text-[#858585]/30 mb-3">?</div>
                  <p className="font-mono text-[10px] text-[#858585] mb-2 leading-[1.6]">{t.gap.desc}</p>
                  <p className="font-mono text-[9px] text-[#858585]/50 mb-4">{t.gap.sub}</p>
                  <div className="border border-[#CC6437]/30 rounded-full py-1.5 px-3 text-[#CC6437] font-mono text-[9px]">{t.gap.badge}</div>
                </div>
              </div>

              {/* Decryptor */}
              <div className="rounded-2xl border border-white/8 p-7" style={{ background: 'rgba(255,255,255,0.015)' }}>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono text-[9px] uppercase text-green-400 tracking-widest border border-green-400/25 px-2.5 py-1 rounded-full">{t.decryptor.badge}</span>
                  <span className="font-mono text-[10px] text-white/15">02</span>
                </div>
                <h3 className="font-cond text-[28px] font-bold text-white mb-1">{t.decryptor.title}</h3>
                <p className="font-mono text-[10px] text-[#858585] mb-5">{t.decryptor.sub}</p>
                <div className="space-y-2.5 mb-5">
                  {t.decryptor.points.map(pt => (
                    <div key={pt} className="flex items-start gap-2">
                      <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">+</span>
                      <span className="font-mono text-[10px] text-[#858585] leading-[1.5]">{pt}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="font-mono text-[10px] text-green-400">{t.decryptor.footer}</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="rounded-xl border border-[#CC6437]/35 p-5 flex gap-4 items-start"
              style={{ background: 'rgba(204,100,55,0.05)' }}>
              <span className="text-[#CC6437] text-lg flex-shrink-0">⚠</span>
              <div>
                <p className="font-cond text-[16px] font-bold text-white mb-1">{t.warnTitle}</p>
                <p className="text-[#858585] text-[13px] leading-[1.65]">{t.warnDesc()}</p>
              </div>
            </div>
          </m.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — STATE MACHINE SIMULATOR
          ══════════════════════════════════════════════════════════════════ */}
      <section id="sec-flow" className="px-6 py-24 border-t border-white/5" style={{ background: '#000000' }}>
        <div className="max-w-4xl mx-auto">

          <m.div {...fade()} className="text-center mb-16">
            <p className="font-mono text-[10px] uppercase text-[#858585] mb-4 tracking-widest">{t.sec2Label}</p>
            <h2 className="font-cond text-[42px] md:text-[56px] font-bold text-white leading-[1.0] tracking-[-1.2px]">{t.sec2Title}</h2>
            <p className="text-[#858585] mt-3 text-[13px] max-w-sm mx-auto">{t.sec2Sub}</p>
          </m.div>

          {/* Progress timeline */}
          <m.div {...fade(0.1)} className="flex items-center mb-10 px-2">
            {PHASE_ORDER.map((s, i) => {
              const c = CFG[s]
              const ph = t.phases[s]
              const done = i < idx
              const current = i === idx
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-500"
                      style={{ borderColor: current || done ? c.color : 'rgba(255,255,255,0.08)', background: current ? c.bg : 'transparent' }}>
                      <span style={{ color: current || done ? c.color : 'rgba(255,255,255,0.15)', fontSize: '12px' }}>{c.icon}</span>
                    </div>
                    <span className="font-mono text-[8px] uppercase tracking-wider"
                      style={{ color: current ? c.color : done ? `${c.color}66` : 'rgba(255,255,255,0.18)' }}>
                      {ph.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className="flex-1 h-px mx-1.5 transition-all duration-700"
                      style={{ background: i < idx ? `${CFG[PHASE_ORDER[i]].color}44` : 'rgba(255,255,255,0.06)' }} />
                  )}
                </div>
              )
            })}
          </m.div>

          {/* State card */}
          <AnimatePresence mode="wait">
            <m.div key={`${phase}-${lang}`}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.3, ease: EASE } as Transition}
              className="rounded-2xl border p-8 mb-5"
              style={{ background: cfg.bg, borderColor: cfg.border }}>

              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" style={{ color: cfg.color }}>{cfg.icon}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest border px-3 py-1 rounded-full"
                    style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}0f` }}>
                    {tp.label}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-white/20 border border-white/8 px-2.5 py-1 rounded-full">{idx + 1} / 4</span>
              </div>

              <h3 className="font-cond text-[28px] font-bold text-white mb-3 leading-tight">{tp.title}</h3>
              <p className="text-[#858585] text-[13px] leading-[1.7] mb-7">{tp.desc}</p>

              {phase === 'active' && (
                <div className="grid grid-cols-3 gap-3 mb-7">
                  {t.activeStats.map(([v, l]) => (
                    <div key={l} className="rounded-lg p-3 text-center border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p className="font-cond text-[15px] font-bold text-white">{v}</p>
                      <p className="font-mono text-[9px] text-[#858585] uppercase mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              )}

              {phase === 'silent' && (
                <div className="rounded-lg border border-yellow-500/18 px-4 py-3 mb-7 font-mono text-[12px] flex flex-wrap gap-1 items-center"
                  style={{ background: 'rgba(234,179,8,0.04)' }}>
                  <span className="text-yellow-400">current_slot</span>
                  <span className="text-white/30 mx-1">{'>'}</span>
                  <span className="text-yellow-400">last_seen_slot</span>
                  <span className="text-white/30 mx-1">+</span>
                  <span className="text-yellow-400">liveness_threshold</span>
                  <span className="text-white ml-2">{t.silentViolation}</span>
                </div>
              )}

              {phase === 'emergency' && (
                <div className="grid grid-cols-2 gap-3 mb-7">
                  {t.emergencyGrid.map(([v, l, ok]) => (
                    <div key={String(l)} className="rounded-lg border px-4 py-3"
                      style={{ borderColor: ok ? 'rgba(34,197,94,0.18)' : 'rgba(204,100,55,0.18)', background: ok ? 'rgba(34,197,94,0.04)' : 'rgba(204,100,55,0.04)' }}>
                      <p className="font-mono text-[11px] font-bold" style={{ color: ok ? '#22c55e' : '#CC6437' }}>{v}</p>
                      <p className="font-mono text-[9px] text-[#858585] mt-1 uppercase">{l}</p>
                    </div>
                  ))}
                </div>
              )}

              {phase === 'exit' && (
                <div className="rounded-lg border border-blue-500/15 p-4 mb-7 font-mono text-[11px] space-y-2"
                  style={{ background: 'rgba(59,130,246,0.04)' }}>
                  {t.exitLines.map((line, i) => (
                    <div key={i}>
                      {i === 0
                        ? <><span className="text-[#858585]">$ </span><span className="text-white">{line}</span></>
                        : <span className="text-blue-400">{line}</span>
                      }
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <span className="text-[#858585]">$</span>
                    <span className="animate-blink text-white">▌</span>
                  </div>
                </div>
              )}

              <button onClick={() => setPhase(cfg.next)}
                className="w-full py-3.5 font-cond text-[13px] font-bold uppercase tracking-wide rounded-xl transition-opacity duration-200 hover:opacity-80"
                style={{ background: cfg.color, color: '#050505' }}>
                {tp.btn} →
              </button>
            </m.div>
          </AnimatePresence>

          {/* Rust code */}
          <m.div {...fade(0.2)} className="rounded-xl border border-white/6 overflow-hidden" style={{ background: '#0A0A0A' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>
              <span className="font-mono text-[10px] text-[#858585] ml-2">{t.codeFile}</span>
            </div>
            <AnimatePresence mode="wait">
              <m.pre key={`${phase}-code`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="p-5 text-[11px] font-mono leading-[1.85] text-[#CECECE] overflow-x-auto">
                {CODE[phase]}
              </m.pre>
            </AnimatePresence>
          </m.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — SLASH & BOUNTY CALCULATOR
          ══════════════════════════════════════════════════════════════════ */}
      <section id="sec-economy" className="px-6 py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto">

          <m.div {...fade()} className="text-center mb-16">
            <p className="font-mono text-[10px] uppercase text-[#858585] mb-4 tracking-widest">{t.sec3Label}</p>
            <h2 className="font-cond text-[42px] md:text-[56px] font-bold text-white leading-[1.0] tracking-[-1.2px]">{t.sec3Title}</h2>
            <p className="text-[#858585] mt-3 text-[13px] max-w-sm mx-auto">{t.sec3Sub}</p>
          </m.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Parameters */}
            <m.div {...fade(0.1)} className="rounded-2xl border border-white/8 p-8" style={{ background: '#0B0B0B' }}>
              <h3 className="font-cond text-[20px] font-bold text-white mb-8">{t.paramTitle}</h3>

              <div className="mb-9">
                <div className="flex justify-between items-baseline mb-3">
                  <label className="font-mono text-[10px] text-[#858585] uppercase tracking-wider">{t.stakeLabel}</label>
                  <span className="font-cond text-[22px] font-bold text-white">
                    {stake.toLocaleString(locale)} <span className="text-sm text-[#858585]">SOL</span>
                  </span>
                </div>
                <input type="range" min={1000} max={10000} step={100} value={stake}
                  onChange={e => setStake(Number(e.target.value))}
                  className="slider w-full"
                  style={{ background: `linear-gradient(90deg, #CC6437 ${((stake - 1000) / 9000) * 100}%, rgba(255,255,255,0.08) ${((stake - 1000) / 9000) * 100}%)` }}
                />
                <div className="flex justify-between mt-2">
                  <span className="font-mono text-[9px] text-white/30">{(1000).toLocaleString(locale)} SOL</span>
                  <span className="font-mono text-[9px] text-white/30">{(10000).toLocaleString(locale)} SOL</span>
                </div>
              </div>

              <div className="mb-9">
                <div className="flex justify-between items-baseline mb-3">
                  <label className="font-mono text-[10px] text-[#858585] uppercase tracking-wider">{t.slashLabel}</label>
                  <span className="font-cond text-[22px] font-bold text-[#CC6437]">
                    {lang === 'en' ? `${slashRate}%` : `%${slashRate}`}
                  </span>
                </div>
                <input type="range" min={5} max={50} step={1} value={slashRate}
                  onChange={e => setSlashRate(Number(e.target.value))}
                  className="slider w-full"
                  style={{ background: `linear-gradient(90deg, #CC6437 ${((slashRate - 5) / 45) * 100}%, rgba(255,255,255,0.08) ${((slashRate - 5) / 45) * 100}%)` }}
                />
                <div className="flex justify-between mt-2">
                  <span className="font-mono text-[9px] text-white/30">{lang === 'en' ? '5%' : '%5'}</span>
                  <span className="font-mono text-[9px] text-white/30">{lang === 'en' ? '50%' : '%50'}</span>
                </div>
              </div>

              <p className="font-mono text-[10px] text-[#858585] leading-[1.7] border-t border-white/5 pt-5">{t.modelNote}</p>
            </m.div>

            {/* Results */}
            <m.div {...fade(0.15)} className="rounded-2xl border border-[#CC6437]/18 p-8 flex flex-col gap-5"
              style={{ background: 'rgba(204,100,55,0.022)' }}>
              <h3 className="font-cond text-[20px] font-bold text-white">{t.resultTitle}</h3>

              <div className="rounded-xl border border-white/5 p-5" style={{ background: '#0B0B0B' }}>
                <p className="font-mono text-[9px] text-[#858585] uppercase tracking-wider mb-2">{t.totalSlash}</p>
                <AnimatePresence mode="wait">
                  <m.p key={slashedTotal} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="font-cond text-[44px] font-bold text-white leading-none">
                    {slashedTotal.toLocaleString(locale)}<span className="text-xl text-[#858585] ml-2">SOL</span>
                  </m.p>
                </AnimatePresence>
                <p className="font-mono text-[9px] text-[#858585] mt-2">
                  {stake.toLocaleString(locale)} SOL × {lang === 'en' ? `${slashRate}%` : `%${slashRate}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#CC6437]/18 p-4" style={{ background: 'rgba(204,100,55,0.04)' }}>
                  <p className="font-mono text-[9px] text-[#858585] uppercase tracking-wider mb-2">{t.burnedLabel}</p>
                  <AnimatePresence mode="wait">
                    <m.p key={`b${burnedAmount}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="font-cond text-[28px] font-bold text-[#CC6437]">
                      {burnedAmount.toLocaleString(locale)}
                    </m.p>
                  </AnimatePresence>
                  <p className="font-mono text-[9px] text-[#858585] mt-1">{t.burnedNote}</p>
                </div>
                <div className="rounded-xl border border-green-500/18 p-4" style={{ background: 'rgba(34,197,94,0.03)' }}>
                  <p className="font-mono text-[9px] text-[#858585] uppercase tracking-wider mb-2">{t.watcherLabel}</p>
                  <AnimatePresence mode="wait">
                    <m.p key={`w${watcherBounty}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="font-cond text-[28px] font-bold text-green-400">
                      {watcherBounty.toLocaleString(locale)}
                    </m.p>
                  </AnimatePresence>
                  <p className="font-mono text-[9px] text-[#858585] mt-1">{t.watcherNote}</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/5 p-3" style={{ background: '#0B0B0B' }}>
                <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-full bg-[#CC6437]" style={{ width: '50%' }} />
                  <div className="h-full bg-green-500" style={{ width: '50%' }} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="font-mono text-[9px] text-[#CC6437]">{t.barLeft}</span>
                  <span className="font-mono text-[9px] text-green-400">{t.barRight}</span>
                </div>
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — EDGE CASES
          ══════════════════════════════════════════════════════════════════ */}
      <section id="sec-edge" className="px-6 py-24 border-t border-white/5" style={{ background: '#000000' }}>
        <div className="max-w-4xl mx-auto">

          <m.div {...fade()} className="text-center mb-16">
            <p className="font-mono text-[10px] uppercase text-[#858585] mb-4 tracking-widest">{t.sec4Label}</p>
            <h2 className="font-cond text-[42px] md:text-[56px] font-bold text-white leading-[1.0] tracking-[-1.2px]">{t.sec4Title}</h2>
            <p className="text-[#858585] mt-3 text-[13px] max-w-sm mx-auto">{t.sec4Sub}</p>
          </m.div>

          <div className="space-y-3">
            {t.edges.map((item, i) => (
              <m.div key={`${i}-${lang}`} {...fade(i * 0.1)}>
                <div className="rounded-xl border border-white/8 overflow-hidden"
                  style={{ background: openCard === i ? '#0F0F0F' : '#0B0B0B' }}>
                  <button className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                    onClick={() => setOpenCard(openCard === i ? null : i)}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full border border-[#CC6437]/25 flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(204,100,55,0.06)' }}>
                        <span className="text-[#CC6437] text-sm">{item.icon}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-cond text-[18px] font-bold text-white leading-tight">{item.title}</p>
                        <p className="font-mono text-[9px] text-[#858585] mt-0.5 uppercase tracking-wider">{item.sub}</p>
                      </div>
                    </div>
                    <span className="text-[#858585] font-mono text-lg flex-shrink-0 transition-transform duration-300 leading-none"
                      style={{ transform: openCard === i ? 'rotate(45deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                      +
                    </span>
                  </button>

                  <AnimatePresence>
                    {openCard === i && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        style={{ overflow: 'hidden' }}>
                        <div className="px-6 pb-6 pt-2 border-t border-white/5 grid md:grid-cols-2 gap-6">
                          <div>
                            <p className="font-mono text-[9px] uppercase text-[#CC6437] mb-2.5 tracking-widest">{t.problemLbl}</p>
                            <p className="text-[#858585] text-[13px] leading-[1.65]">{item.p}</p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] uppercase text-green-400 mb-2.5 tracking-widest">{t.solutionLbl}</p>
                            <p className="text-white text-[13px] leading-[1.65]">{item.s}</p>
                          </div>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </m.div>
            ))}
          </div>

          {/* CTA */}
          <m.div {...fade(0.35)} className="mt-16 rounded-2xl border border-[#CC6437]/20 p-10 text-center"
            style={{ background: 'rgba(204,100,55,0.03)' }}>
            <div className="inline-flex items-center gap-2 border border-[#CC6437]/20 rounded-full px-4 py-2 mb-6"
              style={{ background: 'rgba(204,100,55,0.06)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#CC6437]" />
              <span className="font-mono text-[9px] uppercase text-[#CC6437] tracking-widest">{t.ctaBadge}</span>
            </div>
            <h2 className="font-cond text-[36px] font-bold text-white mb-4 tracking-[-0.5px]">{t.ctaTitle}</h2>
            <p className="text-[#858585] mb-8 max-w-md mx-auto text-[13px] leading-[1.65]">{t.ctaDesc}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/" className="px-5 py-2.5 border border-white/25 text-white font-cond text-[13px] font-bold uppercase rounded-full hover:bg-white hover:text-[#050505] transition-all">
                {t.ctaHome}
              </Link>
              <Link to="/how-it-works" className="px-5 py-2.5 bg-[#CC6437] text-white font-cond text-[13px] font-bold uppercase rounded-full hover:opacity-80 transition-opacity">
                {t.ctaTech}
              </Link>
            </div>
          </m.div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <span className="font-mono text-[10px] text-white/10">{t.footerRight}</span>
        </div>
      </footer>

    </div>
  )
}
