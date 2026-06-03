import React from 'react'
import './Platform.css'

const Platform = () => {
  return (
    <div className="page-platform">

      <section className="platform-hero">
        <h1>Réussir À L'école Commence Par<br/>Un Bon Accompagnement.</h1>
        <p>Cours, exercices, IA éducative et coaching scolaire pour les élèves marocains.</p>
        <button className="btn-dark">En savoir plus ↗</button>
      </section>

      <section className="platform-feature">
        <div className="feature-text">
          <h2>Cours Vidéo Interactifs</h2>
          <p>Une large bibliothèque de cours vidéo courts et pratiques pour une meilleure compréhension.</p>
          <ul>
            <li>Vidéos courtes et efficaces</li>
            <li>Explications en Français et en Darija</li>
            <li>Adaptées à chaque niveau scolaire</li>
          </ul>
        </div>
        <div className="feature-mockup">📱</div>
      </section>

      <section className="platform-feature reverse">
        <div className="feature-text">
          <h2>Exercices & Quiz Intelligents</h2>
          <p>Des exercices interactifs qui s'adaptent à votre niveau pour une progression optimale.</p>
          <ul>
            <li>Exercices par chapitre</li>
            <li>Corrections instantanées</li>
            <li>Renforcement des acquis</li>
          </ul>
        </div>
        <div className="feature-mockup">📱</div>
      </section>

      <section className="platform-feature">
        <div className="feature-text">
          <h2>Intelligence Artificielle Éducative</h2>
          <p>Un assistant IA disponible 24h/24 pour vous accompagner et corriger vos erreurs.</p>
          <ul>
            <li>Aide personnalisée</li>
            <li>Corrections instantanées</li>
            <li>Disponible à tout moment</li>
          </ul>
        </div>
        <div className="feature-mockup">📱</div>
      </section>

      <section className="platform-feature reverse">
        <div className="feature-text">
          <h2>Classement & Motivation</h2>
          <p>Grâce au système de classement, restez motivé et suivez votre progression.</p>
          <ul>
            <li>Classement des élèves</li>
            <li>Points et récompenses</li>
            <li>Motivation continue</li>
          </ul>
        </div>
        <div className="feature-mockup">📱</div>
      </section>

      <section className="platform-cta">
        <h2>Votre Réussite Commence Aujourd'hui</h2>
        <p>Téléchargez l'application IQRA et commencez à apprendre autrement.</p>
        <div className="cta-btns">
          <button className="btn-purple">Télécharger sur App Store</button>
          <button className="btn-outline">Télécharger sur Google Play</button>
        </div>
      </section>

    </div>
  )
}

export default Platform
