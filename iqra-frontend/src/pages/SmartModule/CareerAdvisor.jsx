import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";
import "./CareerAdvisor.css";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const API_BASE = "http://localhost:8000/api";

const NIVEAUX = [
  "1ère année collège", "2ème année collège", "3ème année collège",
  "Tronc commun", "1ère BAC", "2BAC SM A", "2BAC SPC", "2BAC SVT",
  "2bac Sciences Économiques", "2bac Sciences de Gestion Comptable",
  "2bac lettre", "2BAC S HUMAIN"
];

const FILIERES_BAC = {
  "2BAC SM A": ["Sciences Mathématiques A"],
  "2BAC SPC": ["Sciences Physiques et Chimiques"],
  "2BAC SVT": ["Sciences de la Vie et de la Terre"],
  "2bac Sciences Économiques": ["Sciences Économiques"],
  "2bac Sciences de Gestion Comptable": ["Sciences de Gestion Comptable"],
  "2bac lettre": ["Lettres"],
  "2BAC S HUMAIN": ["Sciences Humaines"],
};

const ENCOURAGEMENTS = {
  3:  "Tu avances bien, continue — il n'y a pas de mauvaise réponse ici. 💙",
  7:  "Tu fais preuve de vraie réflexion. C'est exactement ce qu'il faut. ✨",
  10: "Presque fini ! Ces dernières questions sont les plus importantes. 🌟",
};

const SCREEN = {
  AMORCE:            "amorce",
  LOADING_QUESTIONS: "loading_questions",
  QUESTIONNAIRE:     "questionnaire",
  LOADING_ANALYSE:   "loading_analyse",
  RESULTATS:         "resultats",
};

// ─── Composant Radar filières ───────────────────────────────
function RadarFilieres({ scores_radar }) {
  const labels = Object.keys(scores_radar);
  const values = Object.values(scores_radar);

  const data = {
    labels,
    datasets: [{
      label: "Compatibilité (%)",
      data: values,
      backgroundColor: "rgba(123, 47, 190, 0.15)",
      borderColor: "#7B2FBE",
      borderWidth: 2,
      pointBackgroundColor: "#7B2FBE",
      pointBorderColor: "#fff",
      pointHoverBackgroundColor: "#F5A623",
      pointRadius: 5,
    }],
  };

  const options = {
    responsive: true,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          font: { size: 11 },
          color: "#999",
        },
        pointLabels: {
          font: { size: 12, weight: "600" },
          color: "#1A1A1A",
        },
        grid:     { color: "rgba(0,0,0,0.08)" },
        angleLines:{ color: "rgba(0,0,0,0.08)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw}% compatible`,
        },
      },
    },
  };

  return (
    <div className="chart-wrapper">
      <Radar data={data} options={options} />
    </div>
  );
}

// ─── Composant Barres dimensions psycho ────────────────────
function BarresDimensionsPsycho({ dimensions_psycho }) {
  const LABELS_FR = {
    curiosite:          "Curiosité intellectuelle",
    resilience:         "Résilience",
    estime_de_soi:      "Estime de soi",
    motivation:         "Motivation intrinsèque",
    creativite:         "Créativité",
    rigueur:            "Rigueur / Méthode",
    sociabilite:        "Sociabilité",
    peur_echec:         "Peur de l'échec",
    autonomie:          "Autonomie",
    empathie:           "Empathie",
  };

  const labels = Object.keys(dimensions_psycho).map(
    (k) => LABELS_FR[k] || k
  );
  const values = Object.values(dimensions_psycho);

  // Couleur différente si peur_echec (négatif) vs reste (positif)
  const bgColors = Object.keys(dimensions_psycho).map((k) =>
    k === "peur_echec"
      ? "rgba(245, 166, 35, 0.75)"
      : "rgba(123, 47, 190, 0.75)"
  );

  const data = {
    labels,
    datasets: [{
      label: "Score",
      data: values,
      backgroundColor: bgColors,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    indexAxis: "y",
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          callback: (v) => `${v}%`,
          font: { size: 11 },
          color: "#999",
        },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
      y: {
        ticks: {
          font: { size: 12 },
          color: "#1A1A1A",
        },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw}/100`,
        },
      },
    },
  };

  return (
    <div className="chart-wrapper">
      <Bar data={data} options={options} />
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────
export default function CareerAdvisor() {
  const [screen,    setScreen]    = useState(SCREEN.AMORCE);
  const [amorce,    setAmorce]    = useState({ niveau: "", filiere: "", description: "" });
  const [questions, setQuestions] = useState([]);
  const [reponses,  setReponses]  = useState({});
  const [currentQ,  setCurrentQ]  = useState(0);
  const [resultats, setResultats] = useState(null);
  const [error,     setError]     = useState("");

  const resultatsRef = useRef(null);

  // Scroll auto vers les résultats
  useEffect(() => {
    if (screen === SCREEN.RESULTATS && resultatsRef.current) {
      resultatsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [screen]);

  // ── Étape 0 : soumettre formulaire d'amorce ──────────────
  const handleAmorceSubmit = async () => {
    if (!amorce.niveau) {
      setError("Merci de choisir ton niveau scolaire.");
      return;
    }
    setError("");
    setScreen(SCREEN.LOADING_QUESTIONS);

    try {
      const res = await axios.post(`${API_BASE}/orientation/generate-questions/`, {
        niveau:      amorce.niveau,
        filiere:     amorce.filiere,
        description: amorce.description,
      });

      const qs = res.data.questions || [];
      if (qs.length < 12) throw new Error("Nombre de questions insuffisant.");

      setQuestions(qs);
      setCurrentQ(0);
      setReponses({});
      setScreen(SCREEN.QUESTIONNAIRE);
    } catch {
      setError("Erreur lors de la génération des questions. Réessaie.");
      setScreen(SCREEN.AMORCE);
    }
  };

  // ── Étape 1 : navigation questionnaire ───────────────────
  const handleReponseChange = (qId, value) => {
    setReponses((prev) => ({ ...prev, [qId]: value }));
  };

  const handleNext = () => {
    const q = questions[currentQ];
    if (!reponses[q.id] || reponses[q.id].trim() === "") {
      setError("Merci d'écrire quelque chose avant de continuer.");
      return;
    }
    setError("");
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      handleSubmitQuestionnaire();
    }
  };

  const handleBack = () => {
    setError("");
    if (currentQ > 0) setCurrentQ(currentQ - 1);
    else setScreen(SCREEN.AMORCE);
  };

  // ── Étape 2 : soumettre le questionnaire complet ─────────
  const handleSubmitQuestionnaire = async () => {
    setScreen(SCREEN.LOADING_ANALYSE);

    const reponsesArray = questions.map((q) => ({
      question_id: q.id,
      question:    q.texte,
      reponse:     reponses[q.id] || "",
    }));

    try {
      const res = await axios.post(`${API_BASE}/orientation/`, {
        contexte_amorce: amorce,
        reponses:        reponsesArray,
      });
      setResultats(res.data);
      setScreen(SCREEN.RESULTATS);
    } catch {
      setError("Erreur lors de l'analyse. Réessaie.");
      setScreen(SCREEN.QUESTIONNAIRE);
    }
  };

  const handleRecommencer = () => {
    setScreen(SCREEN.AMORCE);
    setAmorce({ niveau: "", filiere: "", description: "" });
    setQuestions([]);
    setReponses({});
    setCurrentQ(0);
    setResultats(null);
    setError("");
  };

  // ════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════

  // ÉCRAN 1 — Formulaire d'amorce
  if (screen === SCREEN.AMORCE) {
    return (
      <div className="career-container">
        <div className="career-header">
          <span className="career-icon">🧭</span>
          <h2>مستشار المسار المهني</h2>
          <p className="career-subtitle">
            Découvre ton profil, tes forces cachées, et les filières qui te correspondent vraiment.
          </p>
        </div>

        <div className="career-card">
          <h3>Pour commencer, parle-moi un peu de toi</h3>

          <div className="form-group">
            <label>Ton niveau scolaire *</label>
            <select
              value={amorce.niveau}
              onChange={(e) => setAmorce({ ...amorce, niveau: e.target.value, filiere: "" })}
            >
              <option value="">-- Choisis ton niveau --</option>
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {FILIERES_BAC[amorce.niveau] && (
            <div className="form-group">
              <label>Ta filière (optionnel)</label>
              <select
                value={amorce.filiere}
                onChange={(e) => setAmorce({ ...amorce, filiere: e.target.value })}
              >
                <option value="">-- Non précisée --</option>
                {FILIERES_BAC[amorce.niveau].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Décris-toi en quelques mots (optionnel)</label>
            <textarea
              rows={4}
              placeholder="Ex : je suis timide, j'aime les maths mais je doute souvent de moi..."
              value={amorce.description}
              onChange={(e) => setAmorce({ ...amorce, description: e.target.value })}
              maxLength={500}
            />
            <span className="char-count">{amorce.description.length}/500</span>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="btn-primary" onClick={handleAmorceSubmit}>
            Commencer mon orientation →
          </button>
        </div>
      </div>
    );
  }

  // ÉCRAN 2 — Loading questions
  if (screen === SCREEN.LOADING_QUESTIONS) {
    return (
      <div className="career-container">
        <div className="career-loading">
          <div className="loading-spinner" />
          <h3>Préparation de tes questions personnalisées…</h3>
          <p>Notre IA analyse ton profil pour créer un questionnaire qui te correspond vraiment.</p>
        </div>
      </div>
    );
  }

  // ÉCRAN 3 — Questionnaire
  if (screen === SCREEN.QUESTIONNAIRE && questions.length > 0) {
    const q = questions[currentQ];
    const progressPct = Math.round(((currentQ + 1) / questions.length) * 100);
    const encouragement = ENCOURAGEMENTS[currentQ + 1];

    return (
      <div className="career-container">
        <div className="career-header">
          <h2>Questionnaire d'orientation</h2>
        </div>

        <div className="progress-bar-wrapper">
          <div className="progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="progress-label">Question {currentQ + 1} / {questions.length}</p>

        {encouragement && (
          <div className="encouragement-box">{encouragement}</div>
        )}

        <div className="career-card question-card">
          <p className="question-text">{q.texte}</p>
          <textarea
            rows={5}
            placeholder="Écris ta réponse ici, prends ton temps..."
            value={reponses[q.id] || ""}
            onChange={(e) => handleReponseChange(q.id, e.target.value)}
          />
          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="nav-buttons">
          <button className="btn-secondary" onClick={handleBack}>← Retour</button>
          <button className="btn-primary"   onClick={handleNext}>
            {currentQ < questions.length - 1 ? "Suivant →" : "Terminer →"}
          </button>
        </div>
      </div>
    );
  }

  // ÉCRAN 4 — Loading analyse
  if (screen === SCREEN.LOADING_ANALYSE) {
    return (
      <div className="career-container">
        <div className="career-loading">
          <div className="loading-spinner" />
          <h3>Analyse de ton profil en cours…</h3>
          <p>Notre IA explore tes réponses pour déceler tes forces cachées et les filières qui te correspondent.</p>
        </div>
      </div>
    );
  }

  // ÉCRAN 5 — Résultats
  if (screen === SCREEN.RESULTATS && resultats) {
    const {
      message_intro,
      forces_cachees        = [],
      croyances_limitantes  = [],
      style_apprentissage,
      top_filieres          = [],
      scores_radar          = {},
      dimensions_psycho     = {},
      message_cloture,
    } = resultats;

    const hasRadar  = Object.keys(scores_radar).length >= 3;
    const hasBarres = Object.keys(dimensions_psycho).length >= 2;

    return (
      <div className="career-container" ref={resultatsRef}>
        <div className="career-header">
          <span className="career-icon">🌟</span>
          <h2>Ton profil d'orientation</h2>
        </div>

        {/* ── Message intro ── */}
        {message_intro && (
          <div className="result-intro-card">
            <p>{message_intro}</p>
          </div>
        )}

        {/* ── Forces cachées ── */}
        {forces_cachees.length > 0 && (
          <div className="result-section">
            <h3>💪 Tes forces cachées</h3>
            <ul>
              {forces_cachees.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        {/* ── Croyances limitantes ── */}
        {croyances_limitantes.length > 0 && (
          <div className="result-section limiting">
            <h3>🔓 Ce qui te freine peut-être</h3>
            <ul>
              {croyances_limitantes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        {/* ── Style d'apprentissage ── */}
        {style_apprentissage && (
          <div className="result-section">
            <h3>📚 Ton style d'apprentissage</h3>
            <p>{style_apprentissage}</p>
          </div>
        )}

        {/* ── Graphique Radar filières ── */}
        {hasRadar && (
          <div className="result-section">
            <h3>📊 Compatibilité avec les filières</h3>
            <p className="chart-subtitle">
              Ce graphique montre ton niveau de compatibilité avec plusieurs filières selon ton profil.
            </p>
            <RadarFilieres scores_radar={scores_radar} />
          </div>
        )}

        {/* ── Top 3 filières ── */}
        {top_filieres.length > 0 && (
          <div className="result-section">
            <h3>🎯 Tes 3 filières recommandées</h3>
            {top_filieres.map((f, i) => (
              <div key={i} className="filiere-card">
                <div className="filiere-header">
                  <span className="filiere-rank">#{i + 1}</span>
                  <h4>{f.filiere}</h4>
                  <span className="filiere-score">{f.score}% compatible</span>
                </div>
                <div className="filiere-bar-wrapper">
                  <div className="filiere-bar" style={{ width: `${f.score}%` }} />
                </div>
                {f.pourquoi && (
                  <p><strong>Pourquoi :</strong> {f.pourquoi}</p>
                )}
                {f.realites_maroc && (
                  <p><strong>Réalités au Maroc :</strong> {f.realites_maroc}</p>
                )}
                {f.defi_personnel && (
                  <p><strong>Ton défi :</strong> {f.defi_personnel}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Graphique Barres dimensions psycho ── */}
        {hasBarres && (
          <div className="result-section">
            <h3>🧠 Tes dimensions psychologiques</h3>
            <p className="chart-subtitle">
              Ces dimensions ont été détectées à travers tes réponses. En violet : tes atouts. En orange : ce qui mérite attention.
            </p>
            <BarresDimensionsPsycho dimensions_psycho={dimensions_psycho} />
          </div>
        )}

        {/* ── Message de clôture ── */}
        {message_cloture && (
          <div className="result-cloture-card">
            <p>{message_cloture}</p>
          </div>
        )}

        <button className="btn-secondary" onClick={handleRecommencer}>
          🔄 Recommencer l'orientation
        </button>
      </div>
    );
  }

  return null;
}