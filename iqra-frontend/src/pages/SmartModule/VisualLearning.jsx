import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { saveVisualSession } from "../../utils/activity";
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
  const { t } = useTranslation();
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
          <p>{t('visual.uploadHint')}</p>
          <span>{t('visual.uploadOr')}</span>
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  const { t } = useTranslation();
  const messages = [
    t('visual.loading1'), t('visual.loading2'), t('visual.loading3'),
    t('visual.loading4'), t('visual.loading5'),
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
      <span className="vl-loading-sub">{t('visual.loadingSub')}</span>
    </div>
  );
}

function EtapesPlayer({ etapes, notion }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const videoRef = useRef(null);
  const etape = etapes[current];
  const total = etapes.length;

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
      <div className="vl-etapes-nav">
        {etapes.map((e, i) => (
          <button key={i}
            className={`vl-etape-dot ${i === current ? "active" : ""} ${i < current ? "done" : ""}`}
            onClick={() => setCurrent(i)} title={e.titre}>
            <span className="vl-etape-dot-num">{i + 1}</span>
            <span className="vl-etape-dot-label">{e.titre}</span>
          </button>
        ))}
      </div>

      <div className="vl-etape-content">
        <div className="vl-etape-header">
          <div className="vl-etape-badge">
            <span className="vl-etape-num-big">{current + 1}</span>
            <span className="vl-etape-total">/ {total}</span>
          </div>
          <h3 className="vl-etape-titre">{etape.titre}</h3>
        </div>

        <div className="vl-etape-grid">
          <div className="vl-etape-video-col">
            {etape.video_url ? (
              <div className="vl-video-wrapper">
                <video ref={videoRef} controls autoPlay className="vl-video"
                  src={`http://localhost:8000${etape.video_url}`}>
                  {t('visual.videoUnsupported')}
                </video>
              </div>
            ) : (
              <div className="vl-no-video">
                <span className="vl-no-video-icon">🎬</span>
                <p>{t('visual.noVideo')}</p>
                <span>{t('visual.noVideoSub')}</span>
              </div>
            )}
          </div>
          <div className="vl-etape-text-col">
            <div className="vl-etape-explication">
              <div className="vl-explication-icon">💡</div>
              <p className="vl-explication-text">{etape.explication}</p>
            </div>
            <div className="vl-notion-chip">
              <span>📌</span><span>{notion}</span>
            </div>
          </div>
        </div>

        <div className="vl-etape-controls">
          <button className="vl-btn-prev" onClick={goPrev} disabled={current === 0}>
            ← {t('visual.prevStep')}
          </button>
          <div className="vl-progress-bar-wrapper">
            <div className="vl-progress-bar-fill"
              style={{ width: `${((current + 1) / total) * 100}%` }} />
          </div>
          {current < total - 1 ? (
            <button className="vl-btn-next" onClick={goNext}>
              {t('visual.nextStep')} →
            </button>
          ) : (
            <div className="vl-completed-badge">✓ {t('visual.allDone')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VisualLearning() {
  const { t, i18n } = useTranslation();
  const [niveau, setNiveau]     = useState("");
  const [matiere, setMatiere]   = useState("");
  const [question, setQuestion] = useState("");
  const [image, setImage]       = useState(null);
  const [step, setStep]         = useState("form");
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(null);

  const language = ['ar','darija'].includes(i18n.language) ? i18n.language : 'fr';
  const canSubmit = niveau && matiere && (question.trim() || image);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null); setStep("loading");
    try {
      const res = await axios.post(API_URL, {
        question: question.trim(), niveau, matiere, language,
        ...(image ? { image: image.base64 } : {}),
      });
      setResult(res.data);
      saveVisualSession({ title: res.data.notion_cle || question.trim(), matiere });
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.error || t('visual.errorGeneric'));
      setStep("form");
    }
  }, [canSubmit, question, niveau, matiere, language, image, t]);

  const handleReset = () => {
    setStep("form"); setResult(null); setError(null);
    setQuestion(""); setImage(null);
  };

  if (step === "form") {
    return (
      <div className="vl-container">
        <div className="vl-stepper">
          <StepBadge step={1} label={t('visual.step1')} active done={false} />
          <div className="vl-stepper-line" />
          <StepBadge step={2} label={t('visual.step2')} active={false} done={false} />
          <div className="vl-stepper-line" />
          <StepBadge step={3} label={t('visual.step3')} active={false} done={false} />
        </div>

        <div className="vl-form-card">
          <div className="vl-form-row">
            <div className="vl-form-group">
              <label>{t('visual.levelLabel')} *</label>
              <select value={niveau} onChange={e => setNiveau(e.target.value)}>
                <option value="">{t('visual.selectLevel')}</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="vl-form-group">
              <label>{t('visual.subjectLabel')} *</label>
              <select value={matiere} onChange={e => setMatiere(e.target.value)}>
                <option value="">{t('visual.selectSubject')}</option>
                {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="vl-form-group">
            <label>
              {t('visual.questionLabel')}
              {!image && <span className="vl-required"> *</span>}
            </label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
              placeholder={t('visual.questionPlaceholder')} rows={4} />
          </div>

          <div className="vl-form-group">
            <label>{t('visual.imageLabel')} <span className="vl-optional">({t('visual.optional')})</span></label>
            <ImageUploadZone image={image} onImageChange={setImage} onImageRemove={() => setImage(null)} />
          </div>

          {error && <div className="vl-error"><span>⚠️</span> {error}</div>}

          <button className="vl-btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
            <span>{t('visual.generate')}</span>
            <span className="vl-btn-arrow">→</span>
          </button>
        </div>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="vl-container">
        <div className="vl-stepper">
          <StepBadge step={1} label={t('visual.step1')} active={false} done />
          <div className="vl-stepper-line active" />
          <StepBadge step={2} label={t('visual.step2')} active done={false} />
          <div className="vl-stepper-line" />
          <StepBadge step={3} label={t('visual.step3')} active={false} done={false} />
        </div>
        <LoadingScreen />
      </div>
    );
  }

  if (step === "result" && result) {
    const etapes = result.etapes || [];
    return (
      <div className="vl-container">
        <div className="vl-stepper">
          <StepBadge step={1} label={t('visual.step1')} active={false} done />
          <div className="vl-stepper-line active" />
          <StepBadge step={2} label={t('visual.step2')} active={false} done />
          <div className="vl-stepper-line active" />
          <StepBadge step={3} label={t('visual.step3')} active done={false} />
        </div>

        <div className="vl-notion-banner">
          <span className="vl-notion-label">{t('visual.notionLabel')}</span>
          <h2 className="vl-notion-text">{result.notion_cle}</h2>
          <span className="vl-etapes-count">{etapes.length} {t('visual.steps')}</span>
        </div>

        {etapes.length > 0 ? (
          <EtapesPlayer etapes={etapes} notion={result.notion_cle} />
        ) : (
          <div className="vl-empty">{t('visual.noSteps')}</div>
        )}

        {result.questions_comprehension?.length > 0 && (
          <section className="vl-section vl-section-questions">
            <h3 className="vl-section-title">
              <span className="vl-section-icon">🧠</span> {t('visual.comprehension')}
            </h3>
            <div className="vl-questions-list">
              {result.questions_comprehension.map((q, i) => (
                <div key={i} className="vl-question-item">
                  <span className="vl-q-num">Q{i + 1}</span><p>{q}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {result.ressources_iqra?.length > 0 && (
          <section className="vl-section vl-section-ressources">
            <h3 className="vl-section-title">
              <span className="vl-section-icon">📚</span> {t('visual.resources')}
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
            ← {t('visual.newQuestion')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
