import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { useTranslation } from 'react-i18next';
import './AppLayout.css';

const IconDashboard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
const IconProfile   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconLogout    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { path: '/profile',   label: 'Mon Profil', Icon: IconProfile },
];

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const navigate  = useNavigate();

  const initials = `${user?.first_name?.[0]||''}${user?.last_name?.[0]||''}`.toUpperCase() || '?';

  const handleLogout = async () => { await logout(); navigate('/'); };

  const LANGS = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'AR' },
    { code: 'darija', label: 'DA' },
  ];

  return (
    <div className="app-layout">

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
              title={label}
            >
              <span className="sidebar-item-icon"><Icon /></span>
              <span className="sidebar-item-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom — user + lang + logout */}
        <div className="sidebar-footer">
          {/* Lang switcher */}
          <div className="sidebar-lang">
            {LANGS.map(l => (
              <button
                key={l.code}
                className={`sidebar-lang-btn ${i18n.language === l.code ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* User row */}
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.first_name} {user?.last_name}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
            <button className="sidebar-logout" onClick={handleLogout} title="Déconnexion">
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="app-content">
        {children}
      </div>

    </div>
  );
};

export default AppLayout;
