import React from 'react'
import './AboutUs.css'

const AboutUs = () => {
  return (
    <div className="page-about">

      <section className="about-hero">
        <h1>À Propos De IQRA</h1>
        <p>IQRA, plateforme edtech marocaine, des vidéos interactives et apprentissage ludique avec des XP gagnables.</p>
      </section>

      <section className="about-histoire">
        <div className="about-text">
          <h2>Notre Histoire</h2>
          <p>IQRA est née d'une vision simple : rendre l'éducation accessible à tous les élèves marocains en combinant technologie et pédagogie.</p>
          <ul>
            <li>Des cours vidéo de qualité</li>
            <li>Des exercices interactifs intelligents</li>
            <li>Un accompagnement pédagogique humain</li>
            <li>Une intelligence artificielle</li>
          </ul>
        </div>
        <div className="about-image">👩‍🎓</div>
      </section>

      <section className="about-mission">
        <h2>Notre Mission</h2>
        <p>Donner à chaque élève les outils, le soutien et la confiance nécessaires pour réussir son parcours éducatif.</p>
        <button className="btn-dark">Commencer gratuitement</button>
      </section>

      <section className="about-vision">
        <h2>Notre Vision</h2>
        <p>IQRA aspire à devenir une référence dans l'éducation en Afrique du Nord.</p>
        <div className="vision-cards">
          <div className="vision-card">La technologie renforme l'apprentissage au fil de la pratique</div>
          <div className="vision-card">Les projets sont responsables et éthiques</div>
          <div className="vision-card">L'éducation devient le levier de transformation sociale</div>
          <div className="vision-card">Chaque élève bénéficie d'un accompagnement personnalisé</div>
        </div>
      </section>

      <section className="about-different">
        <h2>Ce Qui Rend IQRA Différente</h2>
        <div className="different-grid">
          <div className="diff-card">Des services pédagogiques de haute qualité</div>
          <div className="diff-card">Des assistants IA et mémoires</div>
          <div className="diff-card">Un guide de progression gentille</div>
          <div className="diff-card">Un classement motivant richesse</div>
          <div className="diff-card">Un coaching pédagogique gratuit</div>
        </div>
      </section>

      <section className="about-cta">
        <h2><em>Apprenez partout.<br/>Suivez vos progrès.<br/>Progressez chaque jour.</em></h2>
        <div className="cta-btns">
          <button className="btn-purple">Télécharger l'App</button>
        </div>
      </section>

    </div>
  )
}

export default AboutUs
