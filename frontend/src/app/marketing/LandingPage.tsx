/**
 * Pollean marketing landing (pollean.com).
 *
 * THESIS: Manager-first conversion — notebook chaos → digital group records — without a dual hero.
 * OWN-WORLD: Warm hive cream/charcoal with rare Pollean Gold; Montserrat + JetBrains Mono; honeycomb decor.
 * STORY: Organizer recognizes the pain, trusts Paystack/Ghana truth, starts free; members find their group.
 * FIRST VIEWPORT: Brand lockup in nav, manager headline + dual CTAs, dashboard mockup as product proof.
 * FORM: Figma handoff integrated as-shipped; CTAs point at app.pollean.com.
 */
import { useState, useEffect, type CSSProperties } from "react";
import { getAppUrl } from "@/lib/app-url";

const APP = getAppUrl();
const APP_SIGNIN = `${APP}/signin`;
const APP_SIGNUP = `${APP}/signup`;
const APP_GROUP = `${APP}/group`;

/* ─── Brand tokens ─────────────────────────────────────────────────────────── */
const G = '#FFBD59'          // gold
const GL = '#FFCA7A'         // gold light
const GW = '#FFEFD6'         // gold wash
const CH = '#2E2E2E'         // charcoal
const CHL = '#474747'        // charcoal light
const CR = '#F6F1EA'         // cream
const CRA = '#EFEAE1'        // cream alt
const CARD = '#F8F6F1'       // card
const SURF = '#ECE7DF'       // surface
const BOR = '#DED8CE'        // border
const SUC = '#17823E'        // success
const DNG = '#DB2424'        // danger

const sans = "'Montserrat', sans-serif"
const mono = "'JetBrains Mono', monospace"

/* ─── Logo ─────────────────────────────────────────────────────────────────── */
function Logo({ dark = false, size = 30 }: { dark?: boolean; size?: number }) {
  const n = '#F6F1EA'
  const t = dark ? '#F6F1EA' : CH
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M16 1.5L29.5 8.25V23.75L16 30.5L2.5 23.75V8.25Z" fill={G} />
        <circle cx="16" cy="10" r="2.3" fill={n} />
        <circle cx="9.5" cy="21" r="2.3" fill={n} />
        <circle cx="22.5" cy="21" r="2.3" fill={n} />
        <line x1="16" y1="10" x2="9.5" y2="21" stroke={n} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="10" x2="22.5" y2="21" stroke={n} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9.5" y1="21" x2="22.5" y2="21" stroke={n} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: sans, fontWeight: 800, fontSize: size * 0.57, letterSpacing: '0.1em', color: t, lineHeight: 1 }}>
        POLLEAN
      </span>
    </div>
  )
}

/* ─── Decorative hex ────────────────────────────────────────────────────────── */
function HexDecor({ size = 360, opacity = 0.09, style: sx = {} }: { size?: number; opacity?: number; style?: CSSProperties }) {
  const c = size / 2
  const R = size * 0.45
  const pts = (r: number) => Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6
    return `${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ pointerEvents: 'none', userSelect: 'none', opacity, ...sx }}>
      <polygon points={pts(R)} fill="none" stroke={G} strokeWidth="1.5" />
      <polygon points={pts(R * 0.6)} fill="none" stroke={G} strokeWidth="1" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6
        return <line key={i}
          x1={(c + R * 0.6 * Math.cos(a)).toFixed(1)} y1={(c + R * 0.6 * Math.sin(a)).toFixed(1)}
          x2={(c + R * Math.cos(a)).toFixed(1)} y2={(c + R * Math.sin(a)).toFixed(1)}
          stroke={G} strokeWidth="1"
        />
      })}
    </svg>
  )
}

/* ─── Dashboard mockup ──────────────────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${BOR}`, overflow: 'hidden', boxShadow: `0 28px 64px rgba(46,46,46,0.14)`, backgroundColor: CARD, maxWidth: 540 }}>
      {/* Browser chrome */}
      <div style={{ height: 40, backgroundColor: SURF, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: `1px solid ${BOR}` }}>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {[DNG, G, SUC].map((col, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: col, opacity: 0.8 }} />)}
        </div>
        <div style={{ flex: 1, height: 22, borderRadius: 4, backgroundColor: CR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: CHL, fontFamily: sans }}>app.pollean.com/dashboard</span>
        </div>
      </div>
      {/* App header bar */}
      <div style={{ backgroundColor: CH, padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F6F1EA', fontFamily: sans }}>Adom Welfare Association</div>
          <div style={{ fontSize: 10, color: 'rgba(246,241,234,0.55)', fontFamily: sans, marginTop: 1 }}>Dashboard · June 2025</div>
        </div>
        <div style={{ backgroundColor: G, borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: CH, fontFamily: sans, letterSpacing: '0.06em' }}>ADMIN</div>
      </div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '14px 20px 10px' }}>
        {[
          { label: 'Total Collected', val: 'GH₵ 9,450', sub: '+GH₵ 600 this week', col: SUC },
          { label: 'Members', val: '14', sub: '2 pending verification', col: CHL },
          { label: 'Pending', val: 'GH₵ 1,200', sub: '4 members', col: DNG },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: CRA, borderRadius: 8, padding: '10px 12px', border: `1px solid ${BOR}` }}>
            <div style={{ fontSize: 9, color: CHL, marginBottom: 3, fontFamily: sans, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: CH, fontFamily: mono }}>{s.val}</div>
            <div style={{ fontSize: 9, color: s.col, marginTop: 2, fontFamily: sans }}>{s.sub}</div>
          </div>
        ))}
      </div>
      {/* Active funds */}
      <div style={{ padding: '2px 20px 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: CH, marginBottom: 8, fontFamily: sans }}>Active Funds</div>
        {[
          { name: 'Annual Dues Fund', pct: 60, col: '3,600', tar: '6,000' },
          { name: 'Community Event Fund', pct: 42, col: '1,260', tar: '3,000' },
        ].map((f, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: CH, fontFamily: sans }}>{f.name}</span>
              <span style={{ fontSize: 10, color: CHL, fontFamily: mono }}>{f.pct}%</span>
            </div>
            <div style={{ height: 6, backgroundColor: BOR, borderRadius: 3 }}>
              <div style={{ width: `${f.pct}%`, height: '100%', backgroundColor: G, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 9, color: CHL, marginTop: 3, fontFamily: mono }}>GH₵ {f.col} / GH₵ {f.tar}</div>
          </div>
        ))}
      </div>
      {/* Recent contributions */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: CH, marginBottom: 8, fontFamily: sans }}>Recent Contributions</div>
        {[
          { name: 'Kofi Mensah', amount: 'GH₵ 200', ok: true, date: 'Jun 28' },
          { name: 'Ama Boateng', amount: 'GH₵ 150', ok: true, date: 'Jun 27' },
          { name: 'Kwame Asante', amount: 'GH₵ 200', ok: false, date: 'Jun 25' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 2 ? `1px solid ${BOR}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: SURF, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: CH, fontFamily: sans, flexShrink: 0 }}>{r.name[0]}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: CH, fontFamily: sans }}>{r.name}</div>
                <div style={{ fontSize: 9, color: CHL, fontFamily: sans }}>{r.date}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: CH }}>{r.amount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: r.ok ? SUC : G, fontFamily: sans }}>{r.ok ? '● Confirmed' : '○ Pending'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Product tab UIs ───────────────────────────────────────────────────────── */
function FundsMockupUI() {
  return (
    <div style={{ backgroundColor: CARD, borderRadius: 12, border: `1px solid ${BOR}`, overflow: 'hidden' }}>
      <div style={{ backgroundColor: CH, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#F6F1EA', fontFamily: sans }}>Funds</span>
        <div style={{ backgroundColor: G, borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: CH, fontFamily: sans }}>+ New Fund</div>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { name: 'Annual Dues Fund', target: '6,000', col: '3,600', pct: 60, n: 14 },
          { name: 'Community Event Fund', target: '3,000', col: '1,260', pct: 42, n: 8 },
          { name: 'Welfare Support Fund', target: '2,000', col: '2,000', pct: 100, n: 14 },
        ].map((f, i) => (
          <div key={i} style={{ backgroundColor: CRA, borderRadius: 10, padding: '12px 14px', border: `1px solid ${BOR}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: CH, fontFamily: sans }}>{f.name}</div>
                <div style={{ fontSize: 10, color: CHL, fontFamily: sans }}>{f.n} members</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: f.pct === 100 ? SUC : CH }}>{f.pct === 100 ? '✓' : `${f.pct}%`}</span>
                {f.pct === 100 && <div style={{ fontSize: 9, color: SUC, fontWeight: 600, fontFamily: sans }}>Goal reached</div>}
              </div>
            </div>
            <div style={{ height: 6, backgroundColor: BOR, borderRadius: 3, marginBottom: 6 }}>
              <div style={{ width: `${f.pct}%`, height: '100%', backgroundColor: f.pct === 100 ? SUC : G, borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, fontFamily: mono, color: CHL }}>GH₵ {f.col} collected</span>
              <span style={{ fontSize: 9, fontFamily: mono, color: CHL }}>Target: GH₵ {f.target}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContributionsMockupUI() {
  const rows = [
    { name: 'Kofi Mensah', amount: 'GH₵ 200', fund: 'Annual Dues', ok: true, pledge: false, date: 'Jun 28' },
    { name: 'Ama Boateng', amount: 'GH₵ 150', fund: 'Annual Dues', ok: true, pledge: false, date: 'Jun 27' },
    { name: 'Kwame Asante', amount: 'GH₵ 200', fund: 'Annual Dues', ok: false, pledge: false, date: 'Jun 25' },
    { name: 'Abena Frimpong', amount: 'GH₵ 300', fund: 'Building Fund', ok: true, pledge: false, date: 'Jun 24' },
    { name: 'Yaw Darko', amount: 'GH₵ 150', fund: 'Annual Dues', ok: false, pledge: true, date: 'Jun 22' },
  ]
  return (
    <div style={{ backgroundColor: CARD, borderRadius: 12, border: `1px solid ${BOR}`, overflow: 'hidden' }}>
      <div style={{ backgroundColor: CH, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#F6F1EA', fontFamily: sans }}>Contributions</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {['All', 'Confirmed', 'Pending'].map((t, i) => (
            <div key={i} style={{ backgroundColor: i === 0 ? G : 'rgba(246,241,234,0.12)', borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 600, color: i === 0 ? CH : 'rgba(246,241,234,0.65)', fontFamily: sans, cursor: 'pointer' }}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: '4px 16px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < rows.length - 1 ? `1px solid ${BOR}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: SURF, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: CH, fontFamily: sans, flexShrink: 0 }}>{r.name[0]}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: CH, fontFamily: sans }}>{r.name}</div>
                <div style={{ fontSize: 9, color: CHL, fontFamily: sans }}>{r.fund} · {r.date}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: CH }}>{r.amount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, fontFamily: sans, color: r.pledge ? G : r.ok ? SUC : DNG }}>
                {r.pledge ? '✏ Pledge' : r.ok ? '● Confirmed' : '○ Pending'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MembersMockupUI() {
  const members = [
    { name: 'Kofi Mensah', role: 'Collector', paid: true, total: 'GH₵ 800' },
    { name: 'Ama Boateng', role: 'Member', paid: true, total: 'GH₵ 600' },
    { name: 'Kwame Asante', role: 'Member', paid: false, total: 'GH₵ 400' },
    { name: 'Abena Frimpong', role: 'Member', paid: true, total: 'GH₵ 1,200' },
    { name: 'Yaw Darko', role: 'Member', paid: false, total: 'GH₵ 300' },
  ]
  return (
    <div style={{ backgroundColor: CARD, borderRadius: 12, border: `1px solid ${BOR}`, overflow: 'hidden' }}>
      <div style={{ backgroundColor: CH, padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#F6F1EA', fontFamily: sans }}>Members & Reports</span>
          <div style={{ backgroundColor: G, borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 700, color: CH, fontFamily: sans }}>Export CSV</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[{ l: 'Members', v: '14' }, { l: 'Collected', v: 'GH₵ 9,450' }, { l: 'Expenses', v: 'GH₵ 2,340' }, { l: 'Net', v: 'GH₵ 7,110' }].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 9, color: 'rgba(246,241,234,0.55)', fontFamily: sans }}>{s.l}</div>
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: mono, color: '#F6F1EA' }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', padding: '6px 16px', backgroundColor: SURF, borderBottom: `1px solid ${BOR}` }}>
        {['Name', 'Status', 'Total'].map((h, i) => (
          <div key={i} style={{ fontSize: 9, fontWeight: 700, color: CHL, fontFamily: sans, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>
      {members.map((m, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', padding: '8px 16px', borderBottom: i < members.length - 1 ? `1px solid ${BOR}` : 'none', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: SURF, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: CH, fontFamily: sans, flexShrink: 0 }}>{m.name[0]}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: CH, fontFamily: sans }}>{m.name}</div>
              <div style={{ fontSize: 9, color: CHL, fontFamily: sans }}>{m.role}</div>
            </div>
          </div>
          <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, backgroundColor: m.paid ? '#E6F4EC' : '#FEF3F3', color: m.paid ? SUC : DNG, fontSize: 9, fontWeight: 600, fontFamily: sans, width: 'fit-content' }}>
            {m.paid ? '✓ Paid' : '○ Due'}
          </span>
          <div style={{ fontSize: 11, fontWeight: 700, fontFamily: mono, color: CH }}>{m.total}</div>
        </div>
      ))}
    </div>
  )
}

/* ─── Mobile portal mockup ──────────────────────────────────────────────────── */
function MobilePortalMockup() {
  return (
    <div style={{ width: 238, margin: '0 auto', flexShrink: 0 }}>
      <div style={{ borderRadius: 28, border: `2px solid ${BOR}`, backgroundColor: CARD, overflow: 'hidden', boxShadow: `0 24px 56px rgba(46,46,46,0.16)` }}>
        <div style={{ height: 38, backgroundColor: CH, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><path d="M16 1.5L29.5 8.25V23.75L16 30.5L2.5 23.75V8.25Z" fill={G} /></svg>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#F6F1EA', fontFamily: sans }}>POLLEAN</span>
        </div>
        <div style={{ padding: '14px 16px 10px', textAlign: 'center', backgroundColor: CR, borderBottom: `1px solid ${BOR}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: GW, border: `2px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CH} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M9 21V9l3-6 3 6v12M9 9h6"/>
            </svg>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: CH, fontFamily: sans }}>Grace Assembly Welfare</div>
          <div style={{ fontSize: 9, color: CHL, fontFamily: sans, marginTop: 2 }}>Accra, Ghana · 24 members</div>
        </div>
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: CH, fontFamily: sans, marginBottom: 8 }}>Active Funds</div>
          {[{ name: 'Building Fund', pct: 71, col: '7,100', tar: '10,000' }, { name: 'Annual Dues 2025', pct: 55, col: '3,300', tar: '6,000' }].map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: CH, fontFamily: sans }}>{f.name}</span>
                <span style={{ fontSize: 9, fontFamily: mono, color: CHL }}>{f.pct}%</span>
              </div>
              <div style={{ height: 5, backgroundColor: BOR, borderRadius: 3 }}>
                <div style={{ width: `${f.pct}%`, height: '100%', backgroundColor: G, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 8, color: CHL, marginTop: 2, fontFamily: mono }}>GH₵ {f.col} / GH₵ {f.tar}</div>
            </div>
          ))}
          <button style={{ width: '100%', height: 36, borderRadius: 8, backgroundColor: G, border: 'none', fontSize: 10, fontWeight: 700, color: CH, cursor: 'pointer', fontFamily: sans, letterSpacing: '0.05em', marginTop: 4 }}>
            CONTRIBUTE ONLINE
          </button>
        </div>
        <div style={{ padding: '6px 16px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: CH, fontFamily: sans, marginBottom: 6 }}>Your Contributions</div>
          {[{ month: 'Jun 2025', amount: 'GH₵ 200' }, { month: 'May 2025', amount: 'GH₵ 200' }, { month: 'Apr 2025', amount: 'GH₵ 200' }].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < 2 ? `1px solid ${BOR}` : 'none' }}>
              <span style={{ fontSize: 9, color: CHL, fontFamily: sans }}>{item.month}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 700, color: CH }}>{item.amount}</span>
                <span style={{ fontSize: 8, color: SUC, fontWeight: 600 }}>✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Nav ───────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'For members', href: '#for-members' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      backgroundColor: scrolled ? 'rgba(246,241,234,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${BOR}` : '1px solid transparent',
      transition: 'all 0.25s ease',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={28} />
        {/* Desktop links */}
        <div className="hidden md:flex" style={{ gap: 32, alignItems: 'center' }}>
          {links.map(l => (
            <a key={l.label} href={l.href} style={{ fontFamily: sans, fontWeight: 500, fontSize: 14, color: CHL, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = CH)}
              onMouseLeave={e => (e.currentTarget.style.color = CHL)}>
              {l.label}
            </a>
          ))}
        </div>
        {/* Desktop CTAs */}
        <div className="hidden md:flex" style={{ gap: 10, alignItems: 'center' }}>
          <a href={APP_SIGNIN} style={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: CHL, textDecoration: 'none', padding: '8px 16px', borderRadius: 8, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = CH)}
            onMouseLeave={e => (e.currentTarget.style.color = CHL)}>
            Log in
          </a>
          <a href={APP_SIGNUP}
            style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: CH, textDecoration: 'none', padding: '9px 20px', borderRadius: 8, backgroundColor: G, letterSpacing: '0.04em', transition: 'background-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = GL)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = G)}>
            Start free
          </a>
        </div>
        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setOpen(!open)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {open ? <><line x1="3" y1="3" x2="19" y2="19" stroke={CH} strokeWidth="2" strokeLinecap="round" /><line x1="19" y1="3" x2="3" y2="19" stroke={CH} strokeWidth="2" strokeLinecap="round" /></>
              : <><line x1="3" y1="6" x2="19" y2="6" stroke={CH} strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="11" x2="19" y2="11" stroke={CH} strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="16" x2="19" y2="16" stroke={CH} strokeWidth="2" strokeLinecap="round" /></>}
          </svg>
        </button>
      </div>
      {/* Mobile drawer */}
      {open && (
        <div style={{ backgroundColor: CR, borderTop: `1px solid ${BOR}`, padding: '16px 32px 24px' }}>
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              style={{ display: 'block', fontFamily: sans, fontWeight: 500, fontSize: 15, color: CH, textDecoration: 'none', padding: '10px 0', borderBottom: `1px solid ${BOR}` }}>
              {l.label}
            </a>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <a href={APP_SIGNIN} style={{ flex: 1, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 14, color: CH, textDecoration: 'none', padding: '11px', borderRadius: 8, border: `1.5px solid ${BOR}` }}>Log in</a>
            <a href={APP_SIGNUP} style={{ flex: 1, textAlign: 'center', fontFamily: sans, fontWeight: 700, fontSize: 14, color: CH, textDecoration: 'none', padding: '11px', borderRadius: 8, backgroundColor: G }}>Start free</a>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ─── Hero ──────────────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section style={{ position: 'relative', backgroundColor: CR, overflow: 'hidden', paddingTop: 68 }}>
      {/* Hex decorations */}
      <HexDecor size={480} opacity={0.07} style={{ position: 'absolute', top: -80, right: -80 }} />
      <HexDecor size={240} opacity={0.05} style={{ position: 'absolute', bottom: 40, left: -60 }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px 72px', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}>
        {/* Text */}
        <div style={{ flex: '1 1 400px', maxWidth: 540, position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(32px, 5vw, 52px)', color: CH, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 20px' }}>
            Run your group's contributions without the notebook chaos.
          </h1>
          <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 17, color: CHL, lineHeight: 1.65, margin: '0 0 36px', maxWidth: 460 }}>
            Replace WhatsApp chasing and paper ledgers with digital records, online payments, and a member portal your community can trust.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={APP_SIGNUP}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: G, color: CH, fontFamily: sans, fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', padding: '14px 28px', borderRadius: 10, textDecoration: 'none', transition: 'background-color 0.15s', boxShadow: `0 4px 16px rgba(255,189,89,0.35)` }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = GL)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = G)}>
              Start free <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </a>
            <a href="#for-members"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'transparent', color: CH, fontFamily: sans, fontWeight: 600, fontSize: 15, padding: '13px 24px', borderRadius: 10, textDecoration: 'none', border: `1.5px solid ${BOR}`, transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = CH)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = BOR)}>
              Find your group
            </a>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
            {['Free to start', 'Paystack-secured', 'No app required'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" fill={SUC} fillOpacity="0.15" />
                  <path d="M4 7l2 2 4-4" stroke={SUC} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 12, color: CHL }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Dashboard mockup */}
        <div className="hidden md:block" style={{ flex: '1 1 480px', position: 'relative', zIndex: 1 }}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

/* ─── Pain section ──────────────────────────────────────────────────────────── */
function PainSection() {
  const pains = [
    {
      icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
      title: 'Records live in notebooks',
      body: 'When the organiser travels, the record goes with them. Dues paid in cash get forgotten. No one knows what the real balance is.',
    },
    {
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      title: 'Members calling constantly',
      body: 'Every week the group secretary fields the same questions. There is no shared record, no portal, no way for a member to check their own standing.',
    },
    {
      icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
      title: 'Disputes erupting',
      body: 'Conflicting recollections of who paid what, when expenses were logged, and how the fund was spent. Disputes damage trust and fracture groups.',
    },
  ]
  return (
    <section style={{ backgroundColor: CRA, padding: '80px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Why groups switch</p>
          <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', color: CH, letterSpacing: '-0.02em', margin: 0 }}>
            Sound familiar?
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {pains.map((p, i) => (
            <div key={i} style={{ backgroundColor: CARD, borderRadius: 16, padding: '28px 28px', border: `1px solid ${BOR}`, boxShadow: `0 2px 12px rgba(46,46,46,0.05)` }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: GW, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: CH }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={p.icon} />
                </svg>
              </div>
              <h3 style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: CH, lineHeight: 1.3, marginBottom: 10 }}>{p.title}</h3>
              <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 14, color: CHL, lineHeight: 1.65, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ fontFamily: sans, fontWeight: 600, fontSize: 16, color: CH, margin: 0 }}>
            There is a better way. <a href={APP_SIGNUP} style={{ color: G, textDecoration: 'none', borderBottom: `2px solid ${G}` }}>Start free today →</a>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─── Trust strip ───────────────────────────────────────────────────────────── */
function TrustStrip() {
  const items = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>
        </svg>
      ),
      title: 'Powered by Paystack',
      body: 'Industry-standard payment processing, trusted by thousands of businesses in Ghana.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5"/>
        </svg>
      ),
      title: 'Mobile Money & Cards',
      body: 'Members pay with MTN MoMo, Vodafone Cash, AirtelTigo Money, or bank cards.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
        </svg>
      ),
      title: 'Built for Ghana',
      body: 'Currency in GH₵. Context that fits churches, associations, and welfare groups.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/><line x1="12" y1="15" x2="12.01" y2="15" strokeWidth="2.5"/>
        </svg>
      ),
      title: 'KYC & Settlement',
      body: 'Group funds settle to a verified bank or mobile money account after KYC.',
    },
  ]
  return (
    <section style={{ backgroundColor: CH, padding: '60px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontFamily: sans, fontWeight: 700, fontSize: 14, color: 'rgba(246,241,234,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Trusted infrastructure
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1, backgroundColor: 'rgba(246,241,234,0.08)', borderRadius: 14, overflow: 'hidden', border: `1px solid rgba(246,241,234,0.08)` }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: '28px 28px', backgroundColor: 'rgba(46,46,46,0.6)' }}>
              <div style={{ marginBottom: 14 }}>{item.icon}</div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14, color: '#F6F1EA', marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontFamily: sans, fontWeight: 400, fontSize: 13, color: 'rgba(246,241,234,0.55)', lineHeight: 1.55, textAlign: 'left' }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Product modules ───────────────────────────────────────────────────────── */
function ProductModulesSection() {
  const [tab, setTab] = useState(0)
  const tabs = [
    {
      label: 'Funds & Goals',
      title: 'Create funds, set targets, track progress.',
      body: 'Whether it is annual dues, a building project, or a special campaign. Set a target and let members see progress in real time.',
      bullets: ['Public or private fund visibility', 'Multiple active funds simultaneously', 'Progress tracked automatically as contributions arrive'],
      ui: <FundsMockupUI />,
    },
    {
      label: 'Contributions',
      title: 'Online payments and offline recording, unified.',
      body: 'Collect via the public portal (Paystack / MoMo) or manually record cash contributions. Every payment is timestamped and auditable.',
      bullets: ['Paystack-powered Ghanaian payment methods', 'Offline contributions logged by the collector', 'Pledges tracked until fulfilled'],
      ui: <ContributionsMockupUI />,
    },
    {
      label: 'Members & Reports',
      title: 'Know exactly where your group stands.',
      body: 'See the full member roster, who has paid, pending dues, expenses logged, and a net fund position, exportable any time.',
      bullets: ['Member roles: Admin, Collector, Viewer', 'Monthly and fund-level reports', 'Export to CSV for external records'],
      ui: <MembersMockupUI />,
    },
  ]
  const active = tabs[tab]

  return (
    <section id="features" style={{ backgroundColor: CR, padding: '88px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Product</p>
          <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', color: CH, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            Everything your group needs
          </h2>
          <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 16, color: CHL, margin: 0 }}>
            Dues, pledges, and fundraising. Managed in one place.
          </p>
        </div>
        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${BOR}`, marginBottom: 48, flexWrap: 'wrap' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{ fontFamily: sans, fontWeight: 600, fontSize: 14, color: tab === i ? CH : CHL, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 24px', borderBottom: tab === i ? `3px solid ${G}` : '3px solid transparent', marginBottom: -2, transition: 'color 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Tab content */}
        <div style={{ display: 'flex', gap: 56, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="hidden md:block" style={{ flex: '1 1 420px' }}>{active.ui}</div>
          <div style={{ flex: '1 1 320px' }}>
            <h3 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(20px, 3vw, 26px)', color: CH, lineHeight: 1.25, letterSpacing: '-0.01em', margin: '0 0 14px' }}>{active.title}</h3>
            <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 15, color: CHL, lineHeight: 1.65, margin: '0 0 24px' }}>{active.body}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {active.bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: GW, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 14, color: CH, lineHeight: 1.5 }}>{b}</span>
                </li>
              ))}
            </ul>
            <a href={APP_SIGNUP}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: G, color: CH, fontFamily: sans, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', padding: '12px 24px', borderRadius: 9, textDecoration: 'none' }}>
              Try it free →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── How it works ──────────────────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'Create your group', body: 'Sign up, set your group name and account details, then add members or share an invite link.' },
    { n: '02', title: 'Set up your funds', body: 'Create dues, pledge drives, or fundraising campaigns. Set targets and choose visibility.' },
    { n: '03', title: 'Collect and track', body: 'Members pay via the public link. Confirm offline payments, log expenses, and read reports.' },
  ]
  return (
    <section id="how-it-works" style={{ backgroundColor: CRA, padding: '88px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Getting started</p>
          <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', color: CH, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            How it works
          </h2>
          <p style={{ fontFamily: sans, fontWeight: 500, fontSize: 15, color: G, margin: 0 }}>
            From sign-up to first contribution in under an hour.
          </p>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {/* Connecting line (desktop) */}
          <div className="hidden md:block" style={{ position: 'absolute', top: 28, left: '16.67%', right: '16.67%', borderTop: `2px dashed ${BOR}`, zIndex: 0 }} />
          {steps.map((s, i) => (
            <div key={i} style={{ flex: '1 1 240px', textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: CH, border: `3px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontFamily: mono, fontWeight: 700, fontSize: 15, color: G }}>
                {s.n}
              </div>
              <h3 style={{ fontFamily: sans, fontWeight: 700, fontSize: 17, color: CH, marginBottom: 10, letterSpacing: '-0.01em' }}>{s.title}</h3>
              <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 14, color: CHL, lineHeight: 1.65, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 56 }}>
          <a href={APP_SIGNUP}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: G, color: CH, fontFamily: sans, fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', padding: '14px 32px', borderRadius: 10, textDecoration: 'none', boxShadow: `0 4px 16px rgba(255,189,89,0.3)` }}>
            Start free. It takes minutes.
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─── Member portal ─────────────────────────────────────────────────────────── */
function MemberPortalSection() {
  return (
    <section id="for-members" style={{ backgroundColor: CR, padding: '88px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 64, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Mobile mockup */}
        <div style={{ flex: '0 0 auto' }}>
          <MobilePortalMockup />
        </div>
        {/* Text */}
        <div style={{ flex: '1 1 360px' }}>
          <p style={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>For members</p>
          <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(24px, 3.5vw, 36px)', color: CH, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 16px' }}>
            Your members get their own portal. No app download.
          </h2>
          <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 15, color: CHL, lineHeight: 1.65, margin: '0 0 28px' }}>
            Share a public link with your group. Members can join, view fund progress, contribute online, and track their own contribution history, from any phone browser.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Join with phone number verification',
              'Contribute online via Paystack: MoMo or card',
              'View fund progress and personal history',
              'Optional expense transparency, group-controlled',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: GW, border: `1.5px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 14, color: CH, lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
          <a href={APP_GROUP}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: SURF, color: CH, fontFamily: sans, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', padding: '12px 24px', borderRadius: 10, textDecoration: 'none', border: `1px solid ${BOR}`, transition: 'background-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = GW)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = SURF)}>
            Find your group →
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─── Feature grid ──────────────────────────────────────────────────────────── */
function FeatureGridSection() {
  const features = [
    { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z', title: 'Online Payments', body: 'Paystack-powered MoMo and card contributions from the public portal.' },
    { icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 12h.01M16 12h.01M8 12h.01', title: 'Offline Recording', body: 'Log cash contributions manually. Every entry is timestamped and attributed.' },
    { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138', title: 'Pledges', body: 'Members pledge contributions; track fulfilment over time.' },
    { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8', title: 'Expense Tracking', body: 'Log outflows against funds. Net position always visible to admins.' },
    { icon: 'M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9', title: 'Public Group Page', body: 'Shareable branded portal with your group logo and colours.' },
    { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-5-5.917V5a1 1 0 1 0-2 0v.083A6 6 0 0 0 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9', title: 'SMS & Email Alerts', body: 'Automatic notifications when contributions are confirmed or pending.' },
    { icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10m14 0h.01M17 19v-3a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2z', title: 'Reports', body: 'Monthly summaries and fund-level breakdowns. Export to CSV.' },
    { icon: 'M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', title: 'Roles & Access', body: 'Admin, Collector, and Viewer roles. Bulk member upload supported.' },
  ]
  return (
    <section style={{ backgroundColor: SURF, padding: '88px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Features</p>
          <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', color: CH, letterSpacing: '-0.02em', margin: 0 }}>
            Built for real group management
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{ backgroundColor: CARD, borderRadius: 16, padding: '22px 22px', border: `1px solid ${BOR}`, transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(46,46,46,0.08)` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: GW, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: CH }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14, color: CH, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontFamily: sans, fontWeight: 400, fontSize: 13, color: CHL, lineHeight: 1.55 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Social proof ──────────────────────────────────────────────────────────── */
function SocialProofSection() {
  return (
    <section style={{ backgroundColor: CR, padding: '72px 32px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            {
              label: 'Churches',
              icon: (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={CH} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M9 22V12h6v10" />
                </svg>
              ),
            },
            {
              label: 'Associations',
              icon: (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={CH} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
            {
              label: 'Welfare Groups',
              icon: (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={CH} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              ),
            },
            {
              label: 'Cooperatives',
              icon: (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={CH} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22V12" />
                  <path d="M12 12C10 9 8 6 7 4c-1-2 1-3 3-2s2 2 2 2" />
                  <path d="M12 12c2-3 4-6 5-8 1-2-1-3-3-2s-2 2-2 2" />
                </svg>
              ),
            },
          ].map((item, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, backgroundColor: GW, border: `1px solid ${G}`, borderRadius: 20, padding: '6px 14px' }}>
              {item.icon}
              <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: CH }}>{item.label}</span>
            </div>
          ))}
        </div>
        <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(22px, 3.5vw, 32px)', color: CH, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          Trusted by churches, associations, and welfare groups across Ghana
        </h2>
        <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 15, color: CHL, lineHeight: 1.65, margin: '0 0 32px' }}>
          Pollean is your welfare and fundraising platform, built to help organisers spend less time chasing and more time serving their community.
        </p>
        <a href={APP_SIGNUP}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: G, color: CH, fontFamily: sans, fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', padding: '14px 32px', borderRadius: 10, textDecoration: 'none', boxShadow: `0 4px 16px rgba(255,189,89,0.3)` }}>
          Start your group free →
        </a>
      </div>
    </section>
  )
}

/* ─── Final CTA ─────────────────────────────────────────────────────────────── */
function FinalCTASection() {
  return (
    <section style={{ backgroundColor: CH, padding: '96px 32px', position: 'relative', overflow: 'hidden' }}>
      <HexDecor size={500} opacity={0.06} style={{ position: 'absolute', top: -100, right: -100 }} />
      <HexDecor size={280} opacity={0.04} style={{ position: 'absolute', bottom: -60, left: -40 }} />
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,189,89,0.12)', border: `1px solid rgba(255,189,89,0.25)`, borderRadius: 20, padding: '5px 14px', marginBottom: 24 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: G }} />
          <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 12, color: G, letterSpacing: '0.06em' }}>Ready to get started?</span>
        </div>
        <h2 style={{ fontFamily: sans, fontWeight: 800, fontSize: 'clamp(28px, 5vw, 48px)', color: '#F6F1EA', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 18px' }}>
          Ready to run your group online?
        </h2>
        <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 16, color: 'rgba(246,241,234,0.6)', lineHeight: 1.65, margin: '0 0 40px' }}>
          Set up your group, add members, and collect your first contribution, all in under an hour.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <a href={APP_SIGNUP}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: G, color: CH, fontFamily: sans, fontWeight: 700, fontSize: 16, letterSpacing: '0.04em', padding: '16px 36px', borderRadius: 10, textDecoration: 'none', boxShadow: `0 6px 24px rgba(255,189,89,0.3)`, transition: 'background-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = GL)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = G)}>
            Start free →
          </a>
          <a href={APP_SIGNIN}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'transparent', color: '#F6F1EA', fontFamily: sans, fontWeight: 600, fontSize: 15, padding: '15px 28px', borderRadius: 10, textDecoration: 'none', border: `1.5px solid rgba(246,241,234,0.25)`, transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(246,241,234,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(246,241,234,0.25)')}>
            Log in
          </a>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['No app required for members', 'Paystack-secured payments', 'Free to start'].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" fill="rgba(255,189,89,0.15)" />
                <path d="M4 7l2 2 4-4" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 12, color: 'rgba(246,241,234,0.5)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ────────────────────────────────────────────────────────────────── */
function FooterSection() {
  const year = new Date().getFullYear()
  return (
    <footer style={{ backgroundColor: '#1E1E1E', padding: '56px 32px 40px', borderTop: `1px solid rgba(246,241,234,0.08)` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', marginBottom: 48, justifyContent: 'space-between' }}>
          {/* Brand */}
          <div style={{ flex: '0 0 auto', maxWidth: 260 }}>
            <Logo dark size={26} />
            <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 13, color: 'rgba(246,241,234,0.45)', lineHeight: 1.6, marginTop: 14, marginBottom: 0 }}>
              Your welfare and fundraising platform. Helping community groups in Ghana manage members, funds, and contributions, with transparency everyone can trust.
            </p>
          </div>
          {/* Links */}
          {[
            { head: 'Product', links: [{ l: 'Features', h: '#features' }, { l: 'How it works', h: '#how-it-works' }, { l: 'For members', h: '#for-members' }, { l: 'Sign up free', h: APP_SIGNUP }] },
            { head: 'Company', links: [{ l: 'About', h: '#' }, { l: 'Contact', h: '#' }, { l: 'Powered by Pollean', h: '#' }] },
            { head: 'Legal', links: [{ l: 'Privacy Policy', h: '#' }, { l: 'Terms of Service', h: '#' }, { l: 'Paystack Terms', h: '#' }] },
          ].map((col, i) => (
            <div key={i} style={{ flex: '0 0 auto' }}>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 12, color: 'rgba(246,241,234,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{col.head}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => (
                  <a key={link.l} href={link.h} style={{ fontFamily: sans, fontWeight: 500, fontSize: 14, color: 'rgba(246,241,234,0.6)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#F6F1EA')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(246,241,234,0.6)')}>
                    {link.l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid rgba(246,241,234,0.08)`, paddingTop: 28, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <p style={{ fontFamily: sans, fontWeight: 400, fontSize: 13, color: 'rgba(246,241,234,0.3)', margin: 0 }}>
            © {year} Pollean. All rights reserved. Pollean is not a bank or lender.
          </p>
          <p style={{ fontFamily: sans, fontWeight: 500, fontSize: 13, color: 'rgba(246,241,234,0.3)', margin: 0 }}>
            Payments powered by <span style={{ color: G }}>Paystack</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─── App ───────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ fontFamily: sans, color: CH, backgroundColor: CR }}>
      <Nav />
      <HeroSection />
      <PainSection />
      <TrustStrip />
      <ProductModulesSection />
      <HowItWorksSection />
      <MemberPortalSection />
      <FeatureGridSection />
      <SocialProofSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  )
}
