import React from 'react'
import './Home.css'

const Home = () => {
  return (
    <div className="page-home">

      {/* HERO */}
      <section className="hero">
        <p className="hero-tag">Application éducative d'excellence</p>
        <h1>Transformez Votre Avenir Avec<br/>
          <span className="purple-text">IQRA Education</span>
        </h1>
        <p className="hero-sub">
          Réussir à l'école commence par un bon accompagnement.<br/>
          Apprenez mieux, progressez plus vite et choisissez votre avenir avec IQRA.
        </p>
        <div className="hero-btns">
          <button className="btn-purple">Commencer gratuitement</button>
          <button className="btn-outline">Télécharger l'app</button>
        </div>
      </section>

      {/* SECTION 2 */}
      <section className="section-reussir">
        <h2>Réussir À L'école Commence<br/>Par Un Bon Accompagnement.</h2>
        <p>Cours, exercices, IA éducative et coaching scolaire pour les élèves marocains.</p>
        <button className="btn-dark">En savoir plus ↗</button>

        <div className="pourquoi-card">
          <div className="pourquoi-text">
            <h3>Pourquoi IQRA ?</h3>
            <h4>Une éducation moderne, accessible à tous</h4>
            <p>IQRA est une plateforme éducative marocaine conçue pour accompagner l'élève à chaque étape de son parcours scolaire, du primaire au lycée.</p>
            <ul>
              <li>Programmes conformes au système marocain</li>
              <li>Apprentissage progressif et structuré</li>
              <li>Suivi pédagogique intelligent</li>
              <li>Accompagnement pour l'élève et la famille</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 3 - CE QUE VOUS TROUVEREZ */}
      <section className="section-trouverez">
        <div className="trouverez-box">
          <h2>Ce Que Vous Trouverez Sur IQRA</h2>
          <ul>
            <li>Des cours clairs en Français & Darija</li>
            <li>Des exercices corrigés par niveau</li>
            <li>Une IA éducative disponible 24/7</li>
            <li>Coaching scolaire et orientation</li>
            <li>Système de points & classement motivant</li>
          </ul>
        </div>
        <div className="stats-box">
          <h4>Certains Comptes Qui Comptent</h4>
          <div className="stats-row">
            <div className="stat"><strong>+10k</strong><span>IQRA Exercices</span></div>
            <div className="stat"><strong>+2k</strong><span>Video Animés</span></div>
            <div className="stat"><strong>+1k</strong><span>Resume De Cours</span></div>
            <div className="stat"><strong>2</strong><span>Deux Langues</span></div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - VIDÉOS */}
      <section className="section-videos">
        <h2>Apprenez Avec Des Vidéos Courtes,<br/>Claires Et Efficaces</h2>
        <p>Des leçons expliquées simplement, adaptées au niveau de chaque élève.</p>
        <button className="btn-outline-dark">En savoir plus →</button>
        <div className="videos-row">
          {['Philo','Physique','English'].map((s,i) => (
            <div key={i} className="video-card">
              <div className="video-thumb"><span className="play-btn">▶</span></div>
              <p className="video-subject">{s}</p>
              <p className="video-title">Lorem ipsum dolor sit amet consectetur.</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5 - EXERCICES */}
      <section className="section-exercices">
        <div className="exercices-left">
          <h2>Des Exercices Interactifs Pour Progresser Chaque Jour</h2>
          <p>Pratiquez avec des exercices adaptés à votre niveau et recevez un feedback immédiat.</p>
          <ul>
            <li>Mathématiques, Physique, SVT…</li>
            <li>Niveaux progressifs</li>
            <li>Corrections détaillées</li>
          </ul>
          <button className="btn-purple">En savoir plus ↗</button>
        </div>
        <div className="exercices-right">
          <div className="quiz-mockup">
            <p className="quiz-q">1. Pourquoi les ondes ultrasonores sont des ondes mécaniques ?</p>
            {['a','b','c','d'].map((l,i) => (
              <div key={i} className="quiz-opt">
                <span>{l}</span>
                <p>Beaucoup d'animaux utilisent les ondes sonores...</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 - IA */}
      <section className="section-ia">
        <h2>Une Intelligence Artificielle Au Service De Votre Réussite</h2>
        <p>Posez vos questions à tout moment. L'IA IQRA vous aide à comprendre les exercices.</p>
        <button className="btn-outline-dark">En savoir plus →</button>
      </section>

      {/* SECTION 7 - CLASSEMENT */}
      <section className="section-classement">
        <div className="classement-left">
          <h2>Classement & Motivation Chaque Mois</h2>
          <p>Gagnez des points en apprenant, progressez dans le classement.</p>
          <ul>
            <li>Progressez à votre rythme</li>
            <li>Relevez des défis éducatifs chaque mois</li>
            <li>Restez motivé grâce à une compétition saine</li>
          </ul>
        </div>
        <div className="classement-right">
          <div className="cadeau-card">
            <h3>LE CADEAU DE CE MOIS-CI</h3>
            <p className="cadeau-emoji">🎮</p>
            <p className="cadeau-timer">20 : 12 : 25 : 55</p>
            <p>Temps restant avant la fin de la compétition</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-cta">
        <div className="cta-left">
          <h2>Votre Réussite Commence Aujourd'hui</h2>
          <p>Téléchargez l'application IQRA et commencez à apprendre autrement.</p>
          <div className="cta-btns">
            <button className="btn-purple">Télécharger sur App Store</button>
            <button className="btn-outline">Télécharger sur Google Play</button>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home