import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

            <div className="footer-brand">
            <img src="/favicon.svg" alt="IQRA" className="footer-logo" />
            <span className="footer-logo-text">IQRA</span>
            <p>
                Posez vos questions à tout moment. Notre assistant IA vous aide
                à comprendre les leçons et résoudre les exercices étape par étape.
            </p>
            </div>

            <div className="footer-col">
            <h4>Navigation</h4>
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/platform">IQRA-Platform</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
            </ul>
            </div>

            <div className="footer-col">
            <h4>Follow Us</h4>
            <ul>
                <li><a href="#">Facebook</a></li>
                <li><a href="#">Instagram</a></li>
                <li><a href="#">LinkedIn</a></li>
                <li><a href="#">Youtube</a></li>
            </ul>
            </div>

        </div>

        <div className="footer-bottom">
            <span>2026 IQRA Inc.</span>
            <div className="footer-bottom-links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Cookie Policy</a>
            <a href="#">Accessibility</a>
            </div>
      </div>
    </footer>
  )
}

export default Footer