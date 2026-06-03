import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './PageShell.css'

/**
 * PageShell — Wraps every smart page with a translated hero band.
 *
 * Props:
 *  pageKey  — one of: "study" | "visual" | "career"
 *             Used to look up translations from pageshell.* keys.
 *  emoji    — emoji icon shown in the hero
 *  color    — accent hex color for the hero gradient
 *  children — the actual page content
 */
const PageShell = ({ pageKey, emoji, color = '#8e55a1', children }) => {
  const { t } = useTranslation()

  const title = t(`pageshell.${pageKey}_title`)
  const tag   = t(`pageshell.${pageKey}_tag`)
  const desc  = t(`pageshell.${pageKey}_desc`)
  const home  = t('pageshell.home')

  return (
    <div className="ps-root">

      {/* ── Hero band ── */}
      <div
        className="ps-hero"
        style={{
          background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
          borderBottom: `1px solid ${color}22`,
        }}
      >
        <div className="ps-hero-inner">

          {/* Breadcrumb */}
          <div className="ps-breadcrumb">
            <Link to="/" className="ps-breadcrumb-link">{home}</Link>
            <span className="ps-breadcrumb-sep">›</span>
            <span className="ps-breadcrumb-current">{title}</span>
          </div>

          {/* Content */}
          <div className="ps-hero-content">
            <div className="ps-hero-text">
              {tag && (
                <span
                  className="ps-tag"
                  style={{ color, background: color + '15', border: `1px solid ${color}30` }}
                >
                  {tag}
                </span>
              )}
              <h1 className="ps-title">{title}</h1>
              {desc && <p className="ps-desc">{desc}</p>}
            </div>
            {emoji && (
              <div className="ps-emoji" style={{ background: color + '15' }}>
                {emoji}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="ps-body">
        {children}
      </div>

    </div>
  )
}

export default PageShell
