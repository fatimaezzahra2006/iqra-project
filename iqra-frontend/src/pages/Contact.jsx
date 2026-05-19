import React, { useState } from 'react'
import './Contact.css'

const Contact = () => {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', tel: '', sujet: 'General Inquiry', message: '' })

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = e => {
    e.preventDefault()
    alert('Message envoyé !')
  }

  return (
    <div className="page-contact">

      <section className="contact-hero">
        <h1>Contactez-nous</h1>
        <p>Des questions ou des remarques ? N'hésitez pas à nous écrire !</p>
      </section>

      <section className="contact-body">
        <div className="contact-info">
          <h3>Coordonnées</h3>
          <p>Dites quelque chose pour démarrer une discussion en direct !</p>
          <div className="info-item">📞 +212 5224-34648</div>
          <div className="info-item">✉️ info@iqra.ma</div>
          <div className="info-item">📍 Angle boulevard de la corniche rue de la cimetière, Immeuble A, 6ème étage, Bureau numéro 52, Casablanca.</div>
          <div className="social-links">
            <span>🐦</span>
            <span>📸</span>
            <span>💬</span>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Prénom</label>
              <input name="prenom" placeholder="I" value={form.prenom} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Nom de famille</label>
              <input name="nom" placeholder="Doe" value={form.nom} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Numéro de téléphone</label>
              <input name="tel" placeholder="+212 00 00 00 00" value={form.tel} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Sélectionner un sujet ?</label>
            <div className="radio-group">
              {['General Inquiry','Support','Partenariat','Autre'].map(s => (
                <label key={s} className="radio-label">
                  <input type="radio" name="sujet" value={s} checked={form.sujet === s} onChange={handleChange} />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea name="message" placeholder="Rédigez votre message..." rows={5} value={form.message} onChange={handleChange} />
          </div>
          <div className="form-submit">
            <button type="submit" className="btn-purple">Envoyer un message</button>
          </div>
        </form>
      </section>

    </div>
  )
}

export default Contact