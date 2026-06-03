import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import './VerifyEmail.css';

const VerifyEmail = () => {
  const [codes, setCodes]         = useState(['', '', '', '', '', '']);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs  = useRef([]);
  const navigate   = useNavigate();
  const location   = useLocation();
  const { onVerified } = useAuth();
  const { t } = useTranslation();
  const email = location.state?.email || '';

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...codes]; next[i] = v.slice(-1); setCodes(next);
    if (v && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !codes[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setCodes(p.split('')); inputRefs.current[5]?.focus(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = codes.join('');
    if (code.length < 6) { setError(t('verify.confirm')); return; }
    setIsSubmitting(true); setError('');
    try {
      const res = await axiosInstance.post('/api/auth/verify-email/', { email, code });
      onVerified(res.data);
      setSuccess(t('verify.success'));
      setTimeout(() => navigate('/smart'), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || t('verify.confirm'));
    } finally { setIsSubmitting(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await axiosInstance.post('/api/auth/resend-verification/', { email });
      setSuccess(`${t('verify.resend')} → ${email}`);
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur.');
    }
  };

  return (
    <div className="page-verify">
      <div className="verify-card">
        <div className="verify-icon">✉️</div>
        <h1>{t('verify.title')}</h1>
        <p className="verify-subtitle">
          {t('verify.subtitle')}<br /><strong>{email}</strong>
        </p>
        <form onSubmit={handleSubmit} className="verify-form">
          <div className="code-inputs" onPaste={handlePaste}>
            {codes.map((d, i) => (
              <input key={i} ref={el => inputRefs.current[i] = el}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`code-box ${error ? 'code-error' : ''}`}
                aria-label={`Digit ${i + 1}`} disabled={isSubmitting}
              />
            ))}
          </div>
          {error   && <p className="verify-error"  role="alert">{error}</p>}
          {success && <p className="verify-success" role="status">{success}</p>}
          <button type="submit" className="btn-verify" disabled={isSubmitting || codes.join('').length < 6}>
            {isSubmitting ? t('verify.confirming') : t('verify.confirm')}
          </button>
        </form>
        <p className="verify-resend">
          {t('verify.no_code')}{' '}
          <button className="btn-resend" onClick={handleResend} disabled={resendCooldown > 0}>
            {resendCooldown > 0 ? t('verify.resend_cooldown', { count: resendCooldown }) : t('verify.resend')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
