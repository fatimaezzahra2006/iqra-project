import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './Contact.css'

const SUBJECTS = ['General Inquiry', 'Support', 'Partenariat', 'Autre']

const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6.29 6.29l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const IconPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IconFb = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const IconIg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
)

const IconLi = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
)

export default function Contact() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', tel: '', sujet: 'General Inquiry', message: ''
  })
  const [sent, setSent] = useState(false)

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })
  const handleSubmit = e => {
    e.preventDefault()
    setSent(true)
    setTimeout(() => setSent(false), 4000)
    setForm({ prenom: '', nom: '', email: '', tel: '', sujet: 'General Inquiry', message: '' })
  }

  return (
    <div className="ct-root">

      {/* ── Hero ── */}
      <section className="ct-hero">
        <div className="ct-hero-inner">
          <span className="ct-label">{t('contact.title')}</span>
          <h1 className="ct-hero-title">{t('contact.title')}</h1>
          <p className="ct-hero-sub">{t('contact.subtitle')}</p>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="ct-body">
        <div className="ct-container">

          {/* Left — Info panel */}
          <aside className="ct-info">
            <div className="ct-info-top">
              <h3>{t('contact.info_title')}</h3>
              <p>{t('contact.info_sub')}</p>
            </div>

            <div className="ct-info-items">
              <div className="ct-info-item">
                <span className="ct-info-icon"><IconPhone /></span>
                <span>+212 5224-34648</span>
              </div>
              <div className="ct-info-item">
                <span className="ct-info-icon"><IconMail /></span>
                <span>info@iqra.ma</span>
              </div>
              <div className="ct-info-item">
                <span className="ct-info-icon"><IconPin /></span>
                <span>Angle boulevard de la corniche, Casablanca</span>
              </div>
            </div>

            <div className="ct-socials">
              <a href="#" aria-label="Facebook"  className="ct-social"><IconFb /></a>
              <a href="#" aria-label="Instagram" className="ct-social"><IconIg /></a>
              <a href="#" aria-label="LinkedIn"  className="ct-social"><IconLi /></a>
            </div>

            <div className="ct-info-deco" />
          </aside>

          {/* Right — Form */}
          <form className="ct-form" onSubmit={handleSubmit}>

            <div className="ct-form-row">
              <div className="ct-field">
                <label>{t('contact.first_name')}</label>
                <input
                  name="prenom" value={form.prenom}
                  placeholder="Mohammed"
                  onChange={handleChange} required
                />
              </div>
              <div className="ct-field">
                <label>{t('contact.last_name')}</label>
                <input
                  name="nom" value={form.nom}
                  placeholder="El Fassi"
                  onChange={handleChange} required
                />
              </div>
            </div>

            <div className="ct-form-row">
              <div className="ct-field">
                <label>{t('contact.email')}</label>
                <input
                  name="email" type="email" value={form.email}
                  placeholder="exemple@email.com"
                  onChange={handleChange} required
                />
              </div>
              <div className="ct-field">
                <label>{t('contact.phone')}</label>
                <input
                  name="tel" value={form.tel}
                  placeholder="+212 06 00 00 00"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="ct-field">
              <label>{t('contact.subject')}</label>
              <div className="ct-chips">
                {SUBJECTS.map(s => (
                  <button
                    key={s} type="button"
                    className={`ct-chip${form.sujet === s ? ' ct-chip--active' : ''}`}
                    onClick={() => setForm({ ...form, sujet: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="ct-field">
              <label>{t('contact.message')}</label>
              <textarea
                name="message" rows={5}
                placeholder={t('contact.message_ph')}
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>

            <div className="ct-form-footer">
              {sent && <span className="ct-success">✓ {t('contact.sent')}</span>}
              <button type="submit" className="ct-btn-submit">
                {t('contact.send')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

          </form>

        </div>
      </section>

    </div>
  )
}
