import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../utils/AuthContext'
import './Home.css'

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const Check = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const Star = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

export default function Home() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/signup')

  const TOOLS = [
    {
      id: 'study',
      emoji: '📚',
      accent: '#8e55a1',
      gradient: 'linear-gradient(135deg,#f5eeff,#ede0ff)',
      tag: t('home.feat1_tag'),
      title: t('home.feat1_title'),
      desc: t('home.feat1_desc'),
      perks: [t('home.feat1_p1'), t('home.feat1_p2'), t('home.feat1_p3')],
      path: '/study-plan',
    },
    {
      id: 'visual',
      emoji: '🎥',
      accent: '#0ea5e9',
      gradient: 'linear-gradient(135deg,#e0f5ff,#cceeff)',
      tag: t('home.feat2_tag'),
      title: t('home.feat2_title'),
      desc: t('home.feat2_desc'),
      perks: [t('home.feat2_p1'), t('home.feat2_p2'), t('home.feat2_p3')],
      path: '/visual-learning',
    },
    {
      id: 'career',
      emoji: '🎯',
      accent: '#f59e0b',
      gradient: 'linear-gradient(135deg,#fff8e0,#ffefc0)',
      tag: t('home.feat3_tag'),
      title: t('home.feat3_title'),
      desc: t('home.feat3_desc'),
      perks: [t('home.feat3_p1'), t('home.feat3_p2'), t('home.feat3_p3')],
      path: '/career-advisor',
    },
  ]

  const STEPS = [
    { n: '01', title: t('home.step1_title'), desc: t('home.step1_desc'), icon: '✍️' },
    { n: '02', title: t('home.step2_title'), desc: t('home.step2_desc'), icon: '🛠️' },
    { n: '03', title: t('home.step3_title'), desc: t('home.step3_desc'), icon: '🚀' },
  ]

  const STATS = [
    { value: '10K+', label: t('home.stat1') },
    { value: '3',    label: t('home.stat2') },
    { value: '3',    label: t('home.stat3') },
  ]

  return (
    <main className="hp">

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="hp-hero">
        {/* Background shapes */}
        <div className="hp-hero-blob hp-hero-blob--1" />
        <div className="hp-hero-blob hp-hero-blob--2" />

        <div className="hp-hero-inner">
          {/* Left */}
          <div className="hp-hero-copy">
            <div className="hp-pill">
              <span className="hp-pill-dot" />
              {t('home.badge')}
            </div>

            <h1 className="hp-h1">
              {t('home.headline1')}
              <br />
              <span className="hp-h1-purple">{t('home.headline2')}</span>
            </h1>

            <p className="hp-hero-desc">{t('home.desc')}</p>

            <div className="hp-hero-ctas">
              <button className="hp-cta-main" onClick={go}>
                {isAuthenticated ? t('home.cta_dash') : t('home.cta_btn')}
                <ArrowRight />
              </button>
              <Link to="/contact" className="hp-cta-ghost">{t('nav.contact')}</Link>
            </div>

            <div className="hp-trust">
              {[t('home.trust1'), t('home.trust2'), t('home.trust3')].map(item => (
                <span key={item} className="hp-trust-item">
                  <span className="hp-trust-check"><Check /></span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right — visual */}
          <div className="hp-hero-visual">
            {/* Main card */}
            <div className="hp-vis-main">
              <div className="hp-vis-main-header">
                <div className="hp-vis-avatar">AI</div>
                <div>
                  <p className="hp-vis-name">IQRA Smart</p>
                  <p className="hp-vis-status">
                    <span className="hp-vis-dot" /> Online
                  </p>
                </div>
                <div className="hp-vis-stars">
                  {[1,2,3,4,5].map(i => <Star key={i} />)}
                </div>
              </div>
              <div className="hp-vis-tools">
                {TOOLS.map(tool => (
                  <div
                    key={tool.id}
                    className="hp-vis-tool"
                    style={{ background: tool.gradient }}
                    onClick={() => navigate(tool.path)}
                  >
                    <span className="hp-vis-tool-emoji">{tool.emoji}</span>
                    <span className="hp-vis-tool-name">{tool.title}</span>
                    <ArrowRight />
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="hp-vis-badge hp-vis-badge--tl">
              <span className="hp-vis-badge-icon">🏆</span>
              <div>
                <p className="hp-vis-badge-val">+50K</p>
                <p className="hp-vis-badge-lbl">{t('home.stat1')}</p>
              </div>
            </div>

            <div className="hp-vis-badge hp-vis-badge--br">
              <span className="hp-vis-badge-icon">⚡</span>
              <div>
                <p className="hp-vis-badge-val">100%</p>
                <p className="hp-vis-badge-lbl">{t('home.free')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="hp-stats-bar">
          {STATS.map((s, i) => (
            <div key={i} className="hp-stat">
              <span className="hp-stat-val">{s.value}</span>
              <span className="hp-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          TOOLS
      ══════════════════════════════════════ */}
      <section className="hp-tools">
        <div className="hp-tools-inner">
          <div className="hp-section-head">
            <span className="hp-eyebrow">{t('home.feat_label')}</span>
            <h2 className="hp-h2">{t('home.feat_title')}</h2>
            <p className="hp-h2-sub">{t('home.feat_desc')}</p>
          </div>

          <div className="hp-tools-grid">
            {TOOLS.map((tool, i) => (
              <article
                key={tool.id}
                className={`hp-tool-card${i === 1 ? ' hp-tool-card--featured' : ''}`}
                style={{ '--accent': tool.accent, '--grad': tool.gradient }}
                onClick={() => navigate(tool.path)}
              >
                <div className="hp-tool-icon-wrap">
                  <span className="hp-tool-icon">{tool.emoji}</span>
                </div>
                <span className="hp-tool-tag">{tool.tag}</span>
                <h3 className="hp-tool-title">{tool.title}</h3>
                <p className="hp-tool-desc">{tool.desc}</p>
                <ul className="hp-tool-perks">
                  {tool.perks.map(p => (
                    <li key={p}>
                      <span className="hp-tool-dot" style={{ background: tool.accent }} />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="hp-tool-footer">
                  <span style={{ color: tool.accent }}>{t('home.feat_start')}</span>
                  <span className="hp-tool-arrow" style={{ color: tool.accent }}><ArrowRight /></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section className="hp-how">
        <div className="hp-how-inner">
          <div className="hp-section-head hp-section-head--light">
            <span className="hp-eyebrow hp-eyebrow--light">{t('home.how_label')}</span>
            <h2 className="hp-h2 hp-h2--light">{t('home.how_title')}</h2>
          </div>

          <div className="hp-steps">
            {STEPS.map((s, i) => (
              <div key={i} className="hp-step">
                <div className="hp-step-icon">{s.icon}</div>
                <div className="hp-step-num">{s.n}</div>
                <h3 className="hp-step-title">{s.title}</h3>
                <p className="hp-step-desc">{s.desc}</p>
                {i < STEPS.length - 1 && <div className="hp-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════ */}
      <section className="hp-cta">
        <div className="hp-cta-inner">
          <span className="hp-cta-emoji">🎓</span>
          <h2 className="hp-cta-title">{t('home.cta_title')}</h2>
          <p className="hp-cta-sub">{t('home.cta_sub')}</p>
          <button className="hp-cta-btn" onClick={go}>
            {isAuthenticated ? t('home.cta_dash') : t('home.cta_btn')}
            <ArrowRight />
          </button>
        </div>
      </section>

    </main>
  )
}
