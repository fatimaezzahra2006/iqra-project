import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../utils/AuthContext'
import './Navbar.css'

const GlobeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

const LANGS = [
  { code: 'fr',     label: 'Français' },
  { code: 'en',     label: 'English' },
  { code: 'ar',     label: 'العربية' },
  { code: 'darija', label: 'الدارجة' },
]

const Navbar = () => {
  const [menuOpen, setMenuOpen]         = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [langOpen, setLangOpen]         = useState(false)
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const dropdownRef = useRef(null)
  const langRef     = useRef(null)

  const initials    = user ? `${user.first_name?.[0]||''}${user.last_name?.[0]||''}`.toUpperCase() || '?' : ''
  const currentLang = LANGS.find(l => l.code === i18n.language) || LANGS[0]

  // Nav links built with translations
  const NAV_LINKS = [
    { path: '/',                label: t('nav.home') },
    { path: '/study-plan',      label: t('nav.study_plan') },
    { path: '/visual-learning', label: t('nav.visual_learning') },
    { path: '/career-advisor',  label: t('nav.career_advisor') },
    { path: '/contact',         label: t('nav.contact') },
  ]

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
      if (langRef.current     && !langRef.current.contains(e.target))     setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => { setDropdownOpen(false); await logout() }

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <Link to={isAuthenticated ? '/dashboard' : '/'} className="navbar-logo">
          <img src="/favicon.svg" alt="IQRA" />
          <span>IQRA</span>
        </Link>

        <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {NAV_LINKS.map(link => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={location.pathname === link.path ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="navbar-buttons">
          {/* Language dropdown */}
          <div className="lang-dropdown" ref={langRef}>
            <button className="lang-toggle" onClick={() => setLangOpen(o => !o)}>
              <GlobeIcon />
              <span>{currentLang.label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {langOpen && (
              <div className="lang-menu">
                {LANGS.map(l => (
                  <button key={l.code}
                    className={`lang-option ${i18n.language === l.code ? 'lang-option--active' : ''}`}
                    onClick={() => { i18n.changeLanguage(l.code); setLangOpen(false) }}
                  >
                    {l.label}
                    {i18n.language === l.code && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="navbar-user" ref={dropdownRef}>
              <button className="navbar-avatar" onClick={() => setDropdownOpen(o => !o)}>
                {initials}
              </button>
              {dropdownOpen && (
                <div className="navbar-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar-sm">{initials}</div>
                    <div className="dropdown-header-info">
                      <span className="dropdown-name">{user?.first_name} {user?.last_name}</span>
                      <span className="dropdown-email">{user?.email}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    {t('nav.dashboard')}
                  </Link>
                  <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    {t('nav.profile')}
                  </Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"  className="btn-login">{t('nav.login')}</Link>
              <Link to="/signup" className="btn-signup">{t('nav.signup')}</Link>
            </>
          )}
        </div>

        <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>

      </div>
    </nav>
  )
}

export default Navbar
