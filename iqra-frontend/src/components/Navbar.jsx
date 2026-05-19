import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const links = [
    { path: '/', label: 'Home' },
    { path: '/platform', label: 'IQRA-Platform' },
    { path: '/about', label: 'About Us' },
    { path: '/contact', label: 'Contact Us' },
  ]

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <Link to="/" className="navbar-logo">
          <img src="/favicon.svg" alt="IQRA" />
          <span>IQRA</span>
        </Link>

        <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {links.map((link) => (
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
          <Link to="/login" className="btn-login">Log In</Link>
          <Link to="/signup" className="btn-signup">Sign Up</Link>
        </div>

        <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

      </div>
    </nav>
  )
}

export default Navbar