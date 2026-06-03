import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Footer.css'

const Footer = () => {
  const { t } = useTranslation()

  return (
    <footer className="footer">
      <div className="footer-container">

        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-brand-logo">
            <img src="/favicon.svg" alt="IQRA" className="footer-logo" />
            <span className="footer-logo-text">IQRA</span>
          </div>
          <p className="footer-tagline">{t('footer.tagline')}</p>
          <div className="footer-socials">
            <a href="#" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="#" aria-label="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div className="footer-col">
          <h4>{t('footer.navigation')}</h4>
          <ul>
            <li><Link to="/">{t('footer.home')}</Link></li>
            <li><Link to="/study-plan">{t('nav.study_plan')}</Link></li>
            <li><Link to="/visual-learning">{t('nav.visual_learning')}</Link></li>
            <li><Link to="/career-advisor">{t('nav.career_advisor')}</Link></li>
            <li><Link to="/contact">{t('footer.contact')}</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">{t('footer.terms')}</a></li>
            <li><a href="#">{t('footer.privacy')}</a></li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        <span>© 2026 IQRA Inc. All rights reserved.</span>
        <div className="footer-bottom-right">
          <span className="footer-made">Made with ♥ for Moroccan students</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
