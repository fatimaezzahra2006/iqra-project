import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';
import './auth.css';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);
const IconUser  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IconEmail = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>;
const IconLock  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

const FieldError = ({ error }) => error
  ? <span className="field-error">{Array.isArray(error) ? error.join(' ') : error}</span>
  : null;

const Signup = () => {
  const { signup, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', password: '', confirm_password: '' });
  const [errors, setErrors]     = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/smart" replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    try {
      await signup(formData);
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err) {
      const data = err.response?.data;
      setErrors(data && typeof data === 'object' ? data : { detail: 'Une erreur est survenue.' });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-form-panel">
          <h1 className="auth-heading">{t('auth.signup_title')}</h1>
          <p className="auth-sub">{t('auth.signup_sub')}</p>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {errors.detail && <div className="global-error">{errors.detail}</div>}
            <div className="form-row">
              <div className="form-group">
                <label>{t('auth.first_name')}</label>
                <div className={`input-wrap ${errors.first_name ? 'has-error' : ''}`}>
                  <span className="input-icon"><IconUser /></span>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required autoComplete="given-name" />
                </div>
                <FieldError error={errors.first_name} />
              </div>
              <div className="form-group">
                <label>{t('auth.last_name')}</label>
                <div className={`input-wrap ${errors.last_name ? 'has-error' : ''}`}>
                  <span className="input-icon"><IconUser /></span>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required autoComplete="family-name" />
                </div>
                <FieldError error={errors.last_name} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('auth.email')}</label>
              <div className={`input-wrap ${errors.email ? 'has-error' : ''}`}>
                <span className="input-icon"><IconEmail /></span>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email" />
              </div>
              <FieldError error={errors.email} />
            </div>
            <div className="form-group">
              <label>{t('auth.password')}</label>
              <div className={`input-wrap ${errors.password ? 'has-error' : ''}`}>
                <span className="input-icon"><IconLock /></span>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
              </div>
              <FieldError error={errors.password} />
            </div>
            <div className="form-group">
              <label>{t('auth.confirm_password')}</label>
              <div className={`input-wrap ${errors.confirm_password ? 'has-error' : ''}`}>
                <span className="input-icon"><IconLock /></span>
                <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} required autoComplete="new-password" />
              </div>
              <FieldError error={errors.confirm_password} />
            </div>
            <button type="submit" className="btn-auth-submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.signing_up') : t('auth.btn_signup')}
            </button>
            <div className="auth-divider">{t('auth.or')}</div>
            <a href="http://localhost:8000/api/auth/google/" className="btn-google">
              <GoogleIcon /> {t('auth.btn_google')}
            </a>
          </form>
          <p className="auth-footer" style={{ marginTop: 20 }}>
            {t('auth.have_account')} <Link to="/login">{t('auth.btn_login')}</Link>
          </p>
        </div>
        <div className="auth-visual-panel" />
      </div>
    </div>
  );
};

export default Signup;
