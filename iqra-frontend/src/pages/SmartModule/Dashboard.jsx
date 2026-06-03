import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../utils/AuthContext';
import './Dashboard.css';

/* ── Activity from localStorage ── */
export const useActivity = () => {
  const stats = useMemo(() => {
    try {
      const d = JSON.parse(localStorage.getItem('iqra_activity') || '{}');
      return {
        studyPlans:     d.studyPlans     || [],
        visualSessions: d.visualSessions || [],
        careerDone:     d.careerDone     || false,
        careerResult:   d.careerResult   || null,
        lastActivity:   d.lastActivity   || null,
      };
    } catch {
      return { studyPlans: [], visualSessions: [], careerDone: false, careerResult: null, lastActivity: null };
    }
  }, []);
  return stats;
};

/* ── Icons ── */
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/* ── Dashboard ── */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { t, i18n } = useTranslation();
  const { studyPlans, visualSessions, careerDone, careerResult, lastActivity } = useActivity();

  const hasActivity = studyPlans.length > 0 || visualSessions.length > 0 || careerDone;
  const firstName   = user?.first_name || '';

  const fmtDate = iso =>
    iso ? new Date(iso).toLocaleDateString(i18n.language === 'ar' || i18n.language === 'darija' ? 'ar-MA' : 'fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) : '—';

  const initials = `${user?.first_name?.[0]||''}${user?.last_name?.[0]||''}`.toUpperCase() || '?';

  /* Tool definitions use translations */
  const TOOLS = [
    {
      emoji: '📚',
      title: t('home.feat1_title'),
      desc:  t('dashboard.tool1_desc'),
      color: '#8e55a1',
      bg:    '#f9f0ff',
      border: '#e8d5f5',
      to: '/study-plan',
    },
    {
      emoji: '🎥',
      title: t('home.feat2_title'),
      desc:  t('dashboard.tool2_desc'),
      color: '#0ea5e9',
      bg:    '#f0f9ff',
      border: '#bae6fd',
      to: '/visual-learning',
    },
    {
      emoji: '🎯',
      title: t('home.feat3_title'),
      desc:  t('dashboard.tool3_desc'),
      color: '#f59e0b',
      bg:    '#fffbeb',
      border: '#fde68a',
      to: '/career-advisor',
    },
  ];

  return (
    <div className="db2-page">

      {/* ── TOP BAR ── */}
      <div className="db2-topbar">
        <div className="db2-topbar-left">
          <h1 className="db2-topbar-title">
            {hasActivity
              ? t('dashboard.welcome_back', { name: firstName })
              : t('dashboard.welcome_new',  { name: firstName })}
          </h1>
          {hasActivity ? (
            <p className="db2-topbar-sub">
              <IconClock /> {t('dashboard.sub_activity', { date: fmtDate(lastActivity) })}
            </p>
          ) : (
            <p className="db2-topbar-sub">{t('dashboard.sub_new')}</p>
          )}
        </div>
        <Link to="/profile" className="db2-avatar" title={t('dashboard.profile_tooltip')}>{initials}</Link>
      </div>

      {/* ── STATS — always visible ── */}
      <div className="db2-stats-row">
        {[
          { icon: '📚', label: t('dashboard.stat_plans'),  value: studyPlans.length,     color: '#8e55a1', to: '/study-plan' },
          { icon: '🎥', label: t('dashboard.stat_visual'), value: visualSessions.length, color: '#0ea5e9', to: '/visual-learning' },
          { icon: '🎯', label: t('dashboard.stat_career'), value: careerDone ? 1 : 0,    color: '#f59e0b', to: '/career-advisor' },
        ].map(s => (
          <div key={s.label} className="db2-stat" style={{ '--c': s.color }}
            onClick={() => navigate(s.to)} role="button">
            <span className="db2-stat-icon">{s.icon}</span>
            <div>
              <div className="db2-stat-value">{s.value}</div>
              <div className="db2-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── WELCOME BANNER (new users) or QUICK SUMMARY (returning) ── */}
      {!hasActivity ? (
        <div className="db2-welcome">
          <div className="db2-welcome-left">
            <span className="db2-welcome-badge">{t('dashboard.welcome_badge')}</span>
            <h2>{t('dashboard.welcome_title')}</h2>
            <p>{t('dashboard.welcome_body')}</p>
            <button className="db2-welcome-cta" onClick={() => navigate('/study-plan')}>
              {t('dashboard.welcome_cta')} <IconArrow />
            </button>
          </div>
          <div className="db2-welcome-art">🎓</div>
        </div>
      ) : (
        <div className="db2-summary-bar">
          <span className="db2-summary-text">
            📅 {t('dashboard.sub_activity', { date: fmtDate(lastActivity) })}
          </span>
        </div>
      )}

      {/* ── TOOLS ── */}
      <div className="db2-section-header">
        <h2 className="db2-section-title">{t('dashboard.tools_title')}</h2>
        <p className="db2-section-sub">{t('dashboard.tools_sub')}</p>
      </div>

      <div className="db2-tools-grid">
        {TOOLS.map(tool => (
          <div
            key={tool.to}
            className="db2-tool-card"
            style={{ '--c': tool.color, '--bg': tool.bg, '--border': tool.border }}
            onClick={() => navigate(tool.to)}
          >
            <div className="db2-tool-top">
              <div className="db2-tool-emoji">{tool.emoji}</div>
              <div className="db2-tool-arrow"><IconArrow /></div>
            </div>
            <h3 className="db2-tool-title">{tool.title}</h3>
            <p className="db2-tool-desc">{tool.desc}</p>
            <button className="db2-tool-btn">{t('dashboard.tool_start')}</button>
          </div>
        ))}
      </div>

      {/* ── ACTIVE STUDY PLANS ── */}
      {studyPlans.length > 0 && (
        <section className="db2-section">
          <div className="db2-section-header">
            <h2 className="db2-section-title">{t('dashboard.plans_title')}</h2>
            <Link to="/study-plan" className="db2-section-link">
              {t('dashboard.plans_see_all')} <IconArrow />
            </Link>
          </div>
          <div className="db2-plans-grid">
            {studyPlans.slice(0, 4).map((plan, i) => (
              <div key={i} className="db2-plan-card">
                <div className="db2-plan-top">
                  <span className="db2-plan-subject">{plan.matiere || '—'}</span>
                  <span className="db2-plan-niveau">{plan.niveau || ''}</span>
                </div>
                <p className="db2-plan-date">{fmtDate(plan.createdAt)}</p>
                <div className="db2-progress-bar">
                  <div className="db2-progress-fill" style={{ width: `${plan.progress || 0}%` }} />
                </div>
                <div className="db2-plan-footer">
                  <span className="db2-plan-pct">{plan.progress || 0}%</span>
                  <Link to="/study-plan" className="db2-btn-sm">
                    {t('dashboard.plans_continue')} <IconArrow />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── VISUAL HISTORY ── */}
      {visualSessions.length > 0 && (
        <section className="db2-section">
          <div className="db2-section-header">
            <h2 className="db2-section-title">{t('dashboard.history_title')}</h2>
            <Link to="/visual-learning" className="db2-section-link">
              {t('dashboard.plans_see_all')} <IconArrow />
            </Link>
          </div>
          <div className="db2-history-list">
            {visualSessions.slice(0, 3).map((s, i) => (
              <div key={i} className="db2-history-item">
                <div className="db2-history-icon">🎥</div>
                <div className="db2-history-body">
                  <span className="db2-history-title">{s.title || t('dashboard.history_session')}</span>
                  <span className="db2-history-meta">{s.matiere} · {fmtDate(s.date)}</span>
                </div>
                <Link to="/visual-learning" className="db2-btn-sm db2-btn-sm--blue">
                  {t('dashboard.history_rewatch')}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CAREER RESULT ── */}
      {careerDone && careerResult && (
        <section className="db2-section">
          <div className="db2-section-header">
            <h2 className="db2-section-title">{t('dashboard.career_title')}</h2>
            <Link to="/career-advisor" className="db2-section-link">
              {t('dashboard.career_redo')} <IconArrow />
            </Link>
          </div>
          <div className="db2-career-card">
            <div className="db2-career-main">
              <span className="db2-career-label">{t('dashboard.career_label')}</span>
              <div className="db2-career-field">{careerResult.top_field || '—'}</div>
              <div className="db2-career-score">
                {t('dashboard.career_compat')} : <strong>{careerResult.score || '—'}%</strong>
              </div>
              {careerResult.strengths?.length > 0 && (
                <div className="db2-career-tags">
                  {careerResult.strengths.slice(0, 3).map((s, i) => (
                    <span key={i} className="db2-tag">{s}</span>
                  ))}
                </div>
              )}
              <Link to="/career-advisor" className="db2-btn-sm db2-btn-sm--amber">
                {t('dashboard.career_full')} <IconArrow />
              </Link>
            </div>
            <div className="db2-career-art">🎯</div>
          </div>
        </section>
      )}

    </div>
  );
};

export default Dashboard;
