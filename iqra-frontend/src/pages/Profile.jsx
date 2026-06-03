import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import './Profile.css';

const IconEdit   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconSave   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;
const IconCancel = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconLogout = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconDelete = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>;

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [editing, setEditing]       = useState(false);
  const [formData, setFormData]     = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState({ text: '', type: '' });
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const setMsg = (text, type = 'success') => setMessage({ text, type });

  const handleSave = async () => {
    setSaving(true); setMessage({ text: '', type: '' });
    try {
      const res = await axiosInstance.patch('/api/auth/profile/', formData);
      if (typeof updateUser === 'function') updateUser(res.data);
      setMsg(t('profile.update_success')); setEditing(false);
    } catch { setMsg('Erreur.', 'error'); } finally { setSaving(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axiosInstance.delete('/api/auth/delete-account/');
      await logout(); navigate('/');
    } catch { setMsg('Erreur.', 'error'); setDeleting(false); setShowDelete(false); }
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';
  const joinDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div className="pf-page">
      <div className="pf-container">

        <h1 className="pf-page-title">{t('profile.edit')?.replace('Modifier le ', 'Mon ') || 'Mon Profil'}</h1>

        {/* ── Header card ── */}
        <div className="pf-header-card">
          <div className="pf-avatar">{initials}</div>
          <div className="pf-header-info">
            <h2 className="pf-name">{user?.first_name} {user?.last_name}</h2>
            <p className="pf-role">Étudiant IQRA</p>
            <p className="pf-location">{user?.email}</p>
          </div>
          <div className={`pf-status-badge ${user?.is_email_verified ? 'verified' : 'unverified'}`}>
            {user?.is_email_verified ? t('profile.verified') : t('profile.unverified')}
          </div>
        </div>

        {/* ── Personal Information ── */}
        <div className="pf-section">
          <div className="pf-section-header">
            <h3>Personal Information</h3>
            {!editing && (
              <button className="pf-btn-edit" onClick={() => setEditing(true)}>
                <IconEdit /> Edit
              </button>
            )}
          </div>

          {message.text && <p className={`pf-message ${message.type}`}>{message.text}</p>}

          {!editing ? (
            <div className="pf-grid">
              <div className="pf-field">
                <span className="pf-label">{t('profile.first_name')}</span>
                <span className="pf-value">{user?.first_name || '—'}</span>
              </div>
              <div className="pf-field">
                <span className="pf-label">{t('profile.last_name')}</span>
                <span className="pf-value">{user?.last_name || '—'}</span>
              </div>
              <div className="pf-field">
                <span className="pf-label">{t('profile.member_since')}</span>
                <span className="pf-value">{joinDate}</span>
              </div>
              <div className="pf-field">
                <span className="pf-label">Email Address</span>
                <span className="pf-value">{user?.email}</span>
              </div>
              <div className="pf-field">
                <span className="pf-label">User Role</span>
                <span className="pf-value">Étudiant</span>
              </div>
              <div className="pf-field">
                <span className="pf-label">Email Status</span>
                <span className={`pf-value pf-status ${user?.is_email_verified ? 'ok' : 'warn'}`}>
                  {user?.is_email_verified ? 'Vérifié' : 'Non vérifié'}
                </span>
              </div>
            </div>
          ) : (
            <div className="pf-edit-form">
              <div className="pf-grid">
                <div className="pf-field">
                  <label className="pf-label">{t('profile.first_name')}</label>
                  <input className="pf-input" type="text" value={formData.first_name}
                    onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="pf-field">
                  <label className="pf-label">{t('profile.last_name')}</label>
                  <input className="pf-input" type="text" value={formData.last_name}
                    onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="pf-edit-actions">
                <button className="pf-btn-save" onClick={handleSave} disabled={saving}>
                  <IconSave /> {saving ? '...' : t('profile.save')}
                </button>
                <button className="pf-btn-cancel" onClick={() => { setEditing(false); setMessage({ text: '', type: '' }); }}>
                  <IconCancel /> {t('profile.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Account Actions ── */}
        <div className="pf-section">
          <div className="pf-section-header">
            <h3>Account</h3>
          </div>
          <div className="pf-actions-row">
            {!user?.is_email_verified && (
              <Link to="/verify-email" state={{ email: user?.email }} className="pf-action-btn pf-action-warning">
                📧 {t('profile.verify_email')}
              </Link>
            )}
            <button className="pf-action-btn pf-action-logout" onClick={handleLogout}>
              <IconLogout /> {t('profile.logout')}
            </button>
            {!showDelete ? (
              <button className="pf-action-btn pf-action-delete" onClick={() => setShowDelete(true)}>
                <IconDelete /> {t('profile.delete')}
              </button>
            ) : (
              <div className="pf-delete-confirm">
                <p><strong>{t('profile.delete_confirm_title')}</strong> — {t('profile.delete_confirm_text')}</p>
                <div className="pf-edit-actions">
                  <button className="pf-btn-save pf-btn-danger" onClick={handleDelete} disabled={deleting}>
                    <IconDelete /> {deleting ? '...' : t('profile.delete_yes')}
                  </button>
                  <button className="pf-btn-cancel" onClick={() => setShowDelete(false)}>
                    <IconCancel /> {t('profile.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
