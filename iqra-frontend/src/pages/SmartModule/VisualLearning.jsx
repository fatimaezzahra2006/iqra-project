// src/pages/SmartModule/VisualLearning.jsx
// Version 2 — Une vidéo par étape, navigation étape suivante

import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import "./VisualLearning.css";

const API_URL = "http://localhost:8000/api/visual-learning/";

const NIVEAUX = [
  "1ère année collège","2ème année collège","3ème année collège",
  "Tronc commun","1BAC","2BAC SM A","2BAC SPC","2BAC SVT",
  "2bac Sciences Économiques","2bac Sciences de Gestion Comptable",
  "2bac lettre","2BAC S HUMAIN","Autre",
];

const MATIERES = [
  "Mathématiques","Physique-Chimie","SVT","Français","Arabe",
  "Anglais","Histoire-Géographie","Philosophie","Économie",
  "Comptabilité","Informatique","Autre",
];

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "darija", label: "الدارجة" },
];

// ══════════════════════════════════════════
// SOUS-COMPOSANTS
// ══════════════════════════════════════════

function StepBadge({ step, label, active, done }) {
  return (
    <div className={`vl-step-badge ${active ? "active" : ""} ${done ? "done" : ""}`}>
      <div className="vl-step-circle">
        {done ? <span className="vl-check">✓</span> : <span>{step}</span>}
      </div>
      <span className="vl-step-label">{label}</span>
    </div>
  );
}

function ImageUploadZone({ image, onImageChange, onImageRemove }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      onImageChange({ preview: e.target.result, base64, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`vl-upload-zone ${dragging ? "dragging" : ""} ${image ? "has-image" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => !image && fileInputRef.current?.click()}
    >
      <input ref={fileInputRef} type="file" accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />
      {image ? (
        <div className="vl-image-preview">
          <img src={image.preview} alt="exercice" />
          <button className="vl-remove-img"
            onClick={(e) => { e.stopPropagation(); onImageRemove(); }}>✕</button>
          <span className="vl-img-name">{image.name}</span>
        </div>
      ) : (
        <div className="vl-upload-placeholder">
          <div className="vl-upload-icon">📷</div>
          <p>Glisse une photo d'exercice ici</p>
          <span>ou clique pour choisir</span>
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  const messages = [
    "Analyse de ta question…",
    "Recherche dans les cours IQRA…",
    "Génération des explications…",
    "Création des animations Manim…",
    "Rendu des vidéos en cours…",
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % messages.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="vl-loading">
      <div className="vl-loading-orbs">
        <div className="vl-orb vl-orb-1" />
        <div className="vl-orb vl-orb-2" />
        <div className="vl-orb vl-orb-3" />
      </div>
      <p className="vl-loading-msg">{messages[idx]}</p>
      <span className="vl-loading-sub">
        Chaque étape génère sa propre animation — cela peut prendre 30–60 secondes
      </span>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT ÉTAPES — cœur de la v2
// ══════════════════════════════════════════

function EtapesPlayer({ etapes, notion }) {
  const [current, setCurrent] = useState(0);
  const videoRef = useRef(null);
  const etape = etapes[current];
  const total = etapes.length;

  // Recharge la vidéo quand l'étape change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  const goNext = () => { if (current < total - 1) setCurrent(c => c + 1); };
  const goPrev = () => { if (current > 0) setCurrent(c => c - 1); };

  return (
    <div className="vl-etapes-player">

      {/* Barre de progression des étapes */}
      <div className="vl-etapes-nav">
        {etapes.map((e, i) => (
          <button
            key={i}
            className={`vl-etape-dot ${i === current ? "active" : ""} ${i < current ? "done" : ""}`}
            onClick={() => setCurrent(i)}
            title={e.titre}
          >
            <span className="vl-etape-dot-num">{i + 1}</span>
            <span className="vl-etape-dot-label">{e.titre}</span>
          </button>
        ))}
      </div>

      {/* Contenu de l'étape courante */}
      <div className="vl-etape-content">

        {/* En-tête étape */}
        <div className="vl-etape-header">
          <div className="vl-etape-badge">
            <span className="vl-etape-num-big">{current + 1}</span>
            <span className="vl-etape-total">/ {total}</span>
          </div>
          <h3 className="vl-etape-titre">{etape.titre}</h3>
        </div>

        {/* Grid : vidéo + explication */}
        <div className="vl-etape-grid">

          {/* Vidéo */}
          <div className="vl-etape-video-col">
            {etape.video_url ? (
              <div className="vl-video-wrapper">
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  className="vl-video"
                  src={`http://localhost:8000${etape.video_url}`}
                >
                  Votre navigateur ne supporte pas la vidéo HTML5.
                </video>
              </div>
            ) : (
              <div className="vl-no-video">
                <span className="vl-no-video-icon">🎬</span>
                <p>Animation non disponible pour cette étape</p>
                <span>L'explication textuelle reste disponible</span>
              </div>
            )}
          </div>

          {/* Explication textuelle */}
          <div className="vl-etape-text-col">
            <div className="vl-etape-explication">
              <div className="vl-explication-icon">💡</div>
              <p className="vl-explication-text">{etape.explication}</p>
            </div>

            {/* Notion rappel */}
            <div className="vl-notion-chip">
              <span>📌</span>
              <span>{notion}</span>
            </div>
          </div>

        </div>

        {/* Navigation */}
        <div className="vl-etape-controls">
          <button
            className="vl-btn-prev"
            onClick={goPrev}
            disabled={current === 0}
          >
            ← Étape précédente
          </button>

          <div className="vl-progress-bar-wrapper">
            <div
              className="vl-progress-bar-fill"
              style={{ width: `${((current + 1) / total) * 100}%` }}
            />
          </div>

          {current < total - 1 ? (
            <button className="vl-btn-next" onClick={goNext}>
              Étape suivante →
            </button>
          ) : (
            <div className="vl-completed-badge">
              ✓ Toutes les étapes vues !
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════

export default function VisualLearning() {
  const [niveau, setNiveau]     = useState("");
  const [matiere, setMatiere]   = useState("");
  const [question, setQuestion] = useState("");
  const [image, setImage]       = useState(null);
  const [language, setLanguage] = useState("fr");
  const [step, setStep]         = useState("form"); // form | loading | result
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(null);

  const canSubmit = niveau && matiere && (question.trim() || image);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setStep("loading");
    try {
      const payload = {
        question: question.trim(),
        niveau,
        matiere,
        language,
        ...(image ? { image: image.base64 } : {}),
      };
      const res = await axios.post(API_URL, payload);
      setResult(res.data);
      setStep("result");
    } catch (err) {
      const msg = err.response?.data?.error ||
        "Une erreur s'est produite. Vérifie que le backend Django est lancé.";
      setError(msg);
      setStep("form");
    }
  }, [canSubmit, question, niveau, matiere, language, image]);

  const handleReset = () => {
    setStep("form");
    setResult(null);
    setError(null);
    setQuestion("");
    setImage(null);
  };

  // ── FORMULAIRE ──────────────────────────
  if (step === "form") {
    return (
      <div className="vl-container">
        <header className="vl-header">
          <h1 className="vl-title">
            <span className="vl-title-ar">تعلم بالذكاء الاصطناعي</span>
            <span className="vl-title-fr">Apprendre avec l'IA</span>
          </h1>
          <p className="vl-subtitle">
            Pose une question — l'IA génère une explication étape par étape
            avec <strong>une animation pour chaque étape</strong>.
          </p>
        </header>

        <div className="vl-stepper">
          <StepBadge step={1} label="Ta question" active={true} done={false} />
          <div className="vl-stepper-line" />
          <StepBadge step={2} label="Génération" active={false} done={false} />
          <div className="vl-stepper-line" />
          <StepBadge step={3} label="Résultat" active={false} done={false} />
        </div>

        <div className="vl-form-card">
          <div className="vl-form-row">
            <div className="vl-form-group">
              <label htmlFor="vl-niveau">Niveau scolaire *</label>
              <select id="vl-niveau" value={niveau} onChange={e => setNiveau(e.target.value)}>
                <option value="">Sélectionne ton niveau</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="vl-form-group">
              <label htmlFor="vl-matiere">Matière *</label>
              <select id="vl-matiere" value={matiere} onChange={e => setMatiere(e.target.value)}>
                <option value="">Sélectionne la matière</option>
                {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="vl-form-group">
            <label htmlFor="vl-question">
              Ta question ou description du problème
              {!image && <span className="vl-required"> *</span>}
            </label>
            <textarea
              id="vl-question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ex : Comment résoudre une équation du second degré ? Comment fonctionne la photosynthèse ?"
              rows={4}
            />
          </div>

          <div className="vl-form-group">
            <label>Photo d'exercice <span className="vl-optional">(optionnel)</span></label>
            <ImageUploadZone image={image} onImageChange={setImage} onImageRemove={() => setImage(null)} />
          </div>

          <div className="vl-form-group">
            <label>Langue de l'explication</label>
            <div className="vl-lang-tabs">
              {LANGUAGES.map(l => (
                <button key={l.value}
                  className={`vl-lang-tab ${language === l.value ? "active" : ""}`}
                  onClick={() => setLanguage(l.value)} type="button">
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="vl-error"><span>⚠️</span> {error}</div>}

          <button className="vl-btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
            <span>Générer l'explication</span>
            <span className="vl-btn-arrow">→</span>
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────
  if (step === "loading") {
    return (
      <div className="vl-container">
        <div className="vl-stepper">
          <StepBadge step={1} label="Ta question" active={false} done={true} />
          <div className="vl-stepper-line active" />
          <StepBadge step={2} label="Génération" active={true} done={false} />
          <div className="vl-stepper-line" />
          <StepBadge step={3} label="Résultat" active={false} done={false} />
        </div>
        <LoadingScreen />
      </div>
    );
  }

  // ── RÉSULTAT ─────────────────────────────
  if (step === "result" && result) {
    const etapes = result.etapes || [];
    return (
      <div className="vl-container">
        <div className="vl-stepper">
          <StepBadge step={1} label="Ta question" active={false} done={true} />
          <div className="vl-stepper-line active" />
          <StepBadge step={2} label="Génération" active={false} done={true} />
          <div className="vl-stepper-line active" />
          <StepBadge step={3} label="Résultat" active={true} done={false} />
        </div>

        {/* Notion clé */}
        <div className="vl-notion-banner">
          <span className="vl-notion-label">Notion identifiée</span>
          <h2 className="vl-notion-text">{result.notion_cle}</h2>
          <span className="vl-etapes-count">{etapes.length} étapes</span>
        </div>

        {/* Player étapes */}
        {etapes.length > 0 ? (
          <EtapesPlayer etapes={etapes} notion={result.notion_cle} />
        ) : (
          <div className="vl-empty">Aucune étape générée.</div>
        )}

        {/* Questions de compréhension */}
        {result.questions_comprehension?.length > 0 && (
          <section className="vl-section vl-section-questions">
            <h3 className="vl-section-title">
              <span className="vl-section-icon">🧠</span>
              Vérifie ta compréhension
            </h3>
            <div className="vl-questions-list">
              {result.questions_comprehension.map((q, i) => (
                <div key={i} className="vl-question-item">
                  <span className="vl-q-num">Q{i + 1}</span>
                  <p>{q}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ressources IQRA */}
        {result.ressources_iqra?.length > 0 && (
          <section className="vl-section vl-section-ressources">
            <h3 className="vl-section-title">
              <span className="vl-section-icon">📚</span>
              Ressources IQRA associées
            </h3>
            <ul className="vl-ressources-list">
              {result.ressources_iqra.map((r, i) => (
                <li key={i} className="vl-ressource-item">
                  <span className="vl-ressource-dot" />{r}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="vl-result-actions">
          <button className="vl-btn-secondary" onClick={handleReset}>
            ← Nouvelle question
          </button>
        </div>
      </div>
    );
  }

  return null;
}