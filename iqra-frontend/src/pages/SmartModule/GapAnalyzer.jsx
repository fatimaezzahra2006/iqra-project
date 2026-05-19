// ══════════════════════════════════════════════════════════════
// GapAnalyzer.jsx — AI Tutor conversationnel v5
// Utilise GapAnalyzer.css (classes ga3-*)
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import "./GapAnalyzer.css";

// ──────────────────────────────────────────
// CONSTANTES
// ──────────────────────────────────────────

const API_URL = "http://localhost:8000/api/analyze-image/";
const MAX_IMAGES = 3;

const NIVEAUX = [
  "2BAC SM A", "2BAC SPC", "2BAC SVT",
  "2bac Sciences Économiques", "2bac Sciences de Gestion Comptable",
  "2bac lettre", "2BAC S HUMAIN",
  "1BAC", "3ème Collège", "Autre",
];

const MATIERES_PAR_NIVEAU = {
  "2BAC SM A":                          ["MATH", "PC"],
  "2BAC SPC":                           ["MATH", "PC"],
  "2BAC SVT":                           ["MATH", "PC", "SVT"],
  "2bac Sciences Économiques":          ["Comptabilité et Mathématiques financières", "Économie générale et Statistiques"],
  "2bac Sciences de Gestion Comptable": ["Comptabilité et Mathématiques financières", "Économie générale et Statistiques"],
  "2bac lettre":                        ["arab", "geographie"],
  "2BAC S HUMAIN":                      ["AR", "GEOGRAPHIQUE"],
};

const LANGUE_OPTIONS = [
  { value: "fr",     label: "Français",  flag: "🇫🇷" },
  { value: "ar",     label: "العربية",   flag: "📖" },
  { value: "darija", label: "Darija",    flag: "🇲🇦" },
];

// Stage metadata — labels + couleur CSS pour le header
const STAGE_META = {
  diagnostic:         { label: "Diagnostic",     color: "#e05c6a", emoji: "🔍" },
  guided_explanation: { label: "Explication",    color: "#4a9eff", emoji: "💡" },
  student_attempt:    { label: "À toi !",        color: "#2ecc71", emoji: "✏️" },
  correction:         { label: "Correction",     color: "#e8a020", emoji: "✅" },
  retry:              { label: "Réessai",        color: "#f59e0b", emoji: "🔄" },
  mastery_check:      { label: "Vérification",   color: "#9d4de8", emoji: "🎯" },
  completed:          { label: "Maîtrisé !",     color: "#22c55e", emoji: "🏆" },
};

const STAGE_ORDER = [
  "diagnostic", "guided_explanation", "student_attempt",
  "correction", "mastery_check", "completed",
];

// Suggestions initiales selon la langue
const INITIAL_SUGGESTIONS = {
  fr:     ["Je ne comprends pas l'énoncé", "Je bloque sur le calcul", "Je ne sais pas par où commencer", "Donne-moi un indice"],
  ar:     ["لا أفهم السؤال", "أحتاج مساعدة في الحساب", "لا أعرف من أين أبدأ", "أعطني تلميحاً"],
  darija: ["مافهمتش السؤال", "عندي مشكل فالحساب", "ما3raftch mn fin nbda", "عطيني إشارة"],
};

// ──────────────────────────────────────────
// HELPERS FICHIERS
// ──────────────────────────────────────────

const toBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = (e) => res(e.target.result.split(",")[1]);
    r.onerror = () => rej(new Error("Lecture fichier échouée"));
    r.readAsDataURL(file);
  });

const toPreview = (file) =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsDataURL(file);
  });

// ══════════════════════════════════════════
// COMPOSANT — SetupScreen
// ══════════════════════════════════════════

function SetupScreen({ onBack, onStart }) {
  const [niveau,   setNiveau]   = useState("");
  const [matiere,  setMatiere]  = useState("");
  const [language, setLanguage] = useState("fr");

  const matieres = MATIERES_PAR_NIVEAU[niveau] || [];
  const canStart = niveau.trim() && matiere.trim();

  return (
    <div className="ga3-root ga3-setup">
      <button className="ga3-back ga3-setup__back" onClick={onBack}>← Retour</button>

      <div className="ga3-setup__card">
        <div className="ga3-setup__icon-wrap">
          <div className="ga3-setup__icon">🔍</div>
        </div>

        <h1 className="ga3-setup__title">محلل الفجوات المعرفية</h1>
        <p className="ga3-setup__sub">
          Envoie une photo de ton exercice. Je détecte exactement où tu bloques
          et je t'accompagne étape par étape — comme un vrai prof.
        </p>

        <div className="ga3-setup__form">

          {/* Niveau */}
          <div className="ga3-field">
            <label className="ga3-field__label">Niveau scolaire</label>
            <select
              className="ga3-select"
              value={niveau}
              onChange={(e) => { setNiveau(e.target.value); setMatiere(""); }}
            >
              <option value="">— Choisir ton niveau —</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Matière */}
          <div className="ga3-field">
            <label className="ga3-field__label">Matière</label>
            {matieres.length > 0 ? (
              <div className="ga3-chips">
                {matieres.map((m) => (
                  <button
                    key={m}
                    className={`ga3-chip${matiere === m ? " is-active" : ""}`}
                    onClick={() => setMatiere(m)}
                  >{m}</button>
                ))}
              </div>
            ) : (
              <input
                className="ga3-input"
                type="text"
                placeholder="Ex : Mathématiques, Physique, Arabe..."
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
              />
            )}
          </div>

          {/* Langue de réponse */}
          <div className="ga3-field">
            <label className="ga3-field__label">Je veux les réponses en</label>
            <div className="ga3-chips">
              {LANGUE_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  className={`ga3-chip${language === l.value ? " is-active" : ""}`}
                  onClick={() => setLanguage(l.value)}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="ga3-cta"
            disabled={!canStart}
            onClick={() => onStart({ niveau, matiere, language })}
          >
            Démarrer la session →
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT — StageIndicator
// ══════════════════════════════════════════

function StageIndicator({ currentStage }) {
  const stages = ["diagnostic", "guided_explanation", "student_attempt", "correction", "completed"];
  const currentIdx = stages.indexOf(currentStage);

  return (
    <div className="ga3-stage-indicator">
      {stages.map((s, i) => {
        const meta = STAGE_META[s];
        const isPast   = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div
            key={s}
            className={`ga3-stage-step${isPast ? " is-past" : ""}${isActive ? " is-active" : ""}`}
          >
            <div className="ga3-stage-step__dot">
              {isPast ? "✓" : meta.emoji}
            </div>
            <span className="ga3-stage-step__label">{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT — ExerciseCard
// ══════════════════════════════════════════

function ExerciseCard({ info }) {
  if (!info?.sujet) return null;
  return (
    <div className="ga3-exercise-card">
      <span className="ga3-exercise-card__icon">📋</span>
      <div className="ga3-exercise-card__detail">
        <div className="ga3-exercise-card__subject">{info.sujet}</div>
        {info.chapitre && (
          <div className="ga3-exercise-card__meta">
            {info.chapitre}
            {info.type_blocage && info.type_blocage !== "inconnue" && ` · ${info.type_blocage}`}
          </div>
        )}
      </div>
      {info.difficulte && (
        <span className="ga3-diff-badge" data-diff={info.difficulte}>
          {info.difficulte}
        </span>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT — AttemptPrompt
// ══════════════════════════════════════════

function AttemptPrompt({ language }) {
  const labels = {
    fr:     { title: "À toi maintenant !",        sub: "Écris ta réponse ou ton raisonnement ci-dessous" },
    ar:     { title: "الآن دورك !",               sub: "اكتب إجابتك أو تفكيرك أدناه" },
    darija: { title: "دابا جي دورك !",            sub: "كتب جوابك أو تفكيرك هنا" },
  };
  const l = labels[language] || labels.fr;
  return (
    <div className="ga3-attempt-prompt">
      <span className="ga3-attempt-prompt__icon">✏️</span>
      <div className="ga3-attempt-prompt__text">
        <div className="ga3-attempt-prompt__label">{l.title}</div>
        <div className="ga3-attempt-prompt__sub">{l.sub}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT — ScaffoldCard
// ══════════════════════════════════════════

function ScaffoldCard({ helpLevel }) {
  if (helpLevel <= 1) return null;
  const labels = ["", "Indice", "Question guidée", "Aide partielle", "Solution complète"];
  return (
    <div className="ga3-scaffold-card">
      <div className="ga3-scaffold-card__header">
        <span>🆘</span> Niveau d'aide
      </div>
      <div className="ga3-scaffold-levels">
        {[1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className={`ga3-scaffold-level${l < helpLevel ? " is-past" : ""}${l === helpLevel ? " is-hint" : ""}`}
            title={labels[l]}
          />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT — IqraCard (mention naturelle)
// ══════════════════════════════════════════

function IqraCard({ text }) {
  if (!text) return null;
  return (
    <div className="ga3-iqra-card">
      <span className="ga3-iqra-card__logo">IQRA</span>
      <div className="ga3-iqra-card__text">{text}</div>
    </div>
  );
}

// ══════════════════════════════════════════
// HOOK — formatage du texte d'une bulle
// Détecte les mentions IQRA pour les extraire
// ══════════════════════════════════════════

function extractIqraMention(text) {
  if (!text) return { mainText: text, iqraText: null };
  // Détecte une phrase contenant "IQRA" et l'extrait
  const sentences = text.split(/(?<=[.!?])\s+/);
  const iqraIdx = sentences.findIndex((s) => s.includes("IQRA") || s.includes("iqra"));
  if (iqraIdx === -1) return { mainText: text, iqraText: null };
  const iqraText = sentences[iqraIdx];
  const mainText = sentences.filter((_, i) => i !== iqraIdx).join(" ").trim();
  return { mainText, iqraText };
}

// ══════════════════════════════════════════
// COMPOSANT — MessageBubble
// ══════════════════════════════════════════

function MessageBubble({ message, isUser, images = [], animDelay = 0, showIqra = false }) {
  const [visible, setVisible] = useState(animDelay === 0);

  useEffect(() => {
    if (animDelay > 0) {
      const t = setTimeout(() => setVisible(true), animDelay);
      return () => clearTimeout(t);
    }
  }, [animDelay]);

  if (!visible) return null;

  if (isUser) {
    return (
      <div className="ga3-row ga3-row--user" style={{ animationDelay: `${animDelay}ms` }}>
        <div className="ga3-avatar ga3-avatar--user">🎓</div>
        <div className="ga3-message-content" style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: "72%" }}>
          {images.length > 0 && (
            <div className="ga3-msg-images" style={{ justifyContent: "flex-end" }}>
              {images.map((src, i) => (
                <img key={i} src={src} alt={`img ${i + 1}`} className="ga3-msg-img" />
              ))}
            </div>
          )}
          {message && (
            <div className="ga3-bubble ga3-bubble--user">{message}</div>
          )}
        </div>
      </div>
    );
  }

  // Bulle bot — extrait mention IQRA si présente
  const { mainText, iqraText } = extractIqraMention(message);

  return (
    <>
      <div className="ga3-row" style={{ animationDelay: `${animDelay}ms` }}>
        <div className="ga3-avatar ga3-avatar--bot">🤖</div>
        <div className="ga3-bubble ga3-bubble--bot">{mainText || message}</div>
      </div>
      {iqraText && showIqra && <IqraCard text={iqraText} />}
    </>
  );
}

// ══════════════════════════════════════════
// COMPOSANT PRINCIPAL — GapAnalyzer
// ══════════════════════════════════════════

function GapAnalyzer({ onBack }) {
  // ── Navigation ──
  const [screen, setScreen] = useState("setup"); // "setup" | "chat"

  // ── Config session (défini au setup) ──
  const [config, setConfig] = useState({ niveau: "", matiere: "", language: "fr" });

  // ── Messages UI ──
  const [messages,  setMessages]  = useState([]);
  const [isTyping,  setIsTyping]  = useState(false);

  // ── Input ──
  const [inputText,      setInputText]      = useState("");
  const [attachedImages, setAttachedImages] = useState([]); // [{preview, base64}]
  const [inputError,     setInputError]     = useState("");
  const [isDragging,     setIsDragging]     = useState(false);

  // ── État pédagogique (synchronisé avec backend) ──
  const [sessionId,          setSessionId]          = useState(null);
  const [analysisCount,      setAnalysisCount]      = useState(0);
  const [conversationStage,  setConversationStage]  = useState("diagnostic");
  const [helpLevel,          setHelpLevel]          = useState(1);
  const [turnInStage,        setTurnInStage]        = useState(0);
  const [exerciseInfo,       setExerciseInfo]       = useState(null);
  const [suggestions,        setSuggestions]        = useState([]);

  const fileInputRef   = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Scroll auto ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Suggestions initiales selon langue ──
  useEffect(() => {
    if (config.language) {
      setSuggestions(INITIAL_SUGGESTIONS[config.language] || INITIAL_SUGGESTIONS.fr);
    }
  }, [config.language]);

  // ──────────────────────────────────────────
  // GESTION IMAGES
  // ──────────────────────────────────────────

  const addFiles = useCallback(async (files) => {
    setInputError("");
    const list = Array.from(files);

    if (attachedImages.length + list.length > MAX_IMAGES) {
      setInputError(`Maximum ${MAX_IMAGES} images.`);
      return;
    }
    if (list.some((f) => !f.type.startsWith("image/"))) {
      setInputError("Seules les images sont acceptées (JPG, PNG, WEBP).");
      return;
    }
    if (list.some((f) => f.size > 5 * 1024 * 1024)) {
      setInputError("Chaque image doit faire moins de 5 Mo.");
      return;
    }

    const entries = await Promise.all(
      list.map(async (f) => ({
        preview: await toPreview(f),
        base64:  await toBase64(f),
      }))
    );
    setAttachedImages((prev) => [...prev, ...entries]);
  }, [attachedImages.length]);

  const removeImage = (idx) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ──────────────────────────────────────────
  // ENVOI MESSAGE
  // ──────────────────────────────────────────

  const isFirstMessage = messages.length === 0;
  const canSend = (inputText.trim() || attachedImages.length > 0) && !isTyping;

  const sendMessage = useCallback(async (overrideText = null) => {
    const text   = (overrideText ?? inputText).trim();
    const imgs   = [...attachedImages];

    // Validation : premier message doit avoir une image
    if (isFirstMessage && imgs.length === 0) {
      setInputError("Pour démarrer, envoie au moins une photo de ton exercice 📸");
      return;
    }
    if (!text && imgs.length === 0) return;

    // Optimistic UI — message utilisateur
    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id:     userMsgId,
        role:   "user",
        text:   text || null,
        images: imgs.map((i) => i.preview),
      },
    ]);

    setInputText("");
    setAttachedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsTyping(true);
    setSuggestions([]);
    setInputError("");

    try {
      const { data } = await axios.post(API_URL, {
        images:             imgs.map((i) => i.base64),
        niveau:             config.niveau,
        matiere:            config.matiere,
        description:        text,
        session_id:         sessionId,
        analysis_count:     analysisCount,
        language:           config.language,
        conversation_stage: conversationStage,
        help_level:         helpLevel,
        turn_in_stage:      turnInStage,
      });

      // ── Mise à jour état pédagogique ──
      if (data.session_id)   setSessionId(data.session_id);
      if (data.next_stage)   setConversationStage(data.next_stage);
      if (data.help_level !== undefined) setHelpLevel(data.help_level);
      if (data.turn_in_stage !== undefined) setTurnInStage(data.turn_in_stage);
      if (data.exercise_info && data.exercise_info.sujet) setExerciseInfo(data.exercise_info);
      if (data.suggestions)  setSuggestions(data.suggestions);
      setAnalysisCount((c) => c + 1);

      // ── Affichage multi-bulles avec délai progressif ──
      const botMessages = data.messages || [];
      setIsTyping(false);

      setMessages((prev) => [
        ...prev,
        ...botMessages.map((msg, i) => ({
          id:         Date.now() + i + 1,
          role:       "assistant",
          text:       msg,
          animDelay:  i * 550,
          showIqra:   i === botMessages.length - 1, // IQRA card sur la dernière bulle
        })),
      ]);

    } catch (err) {
      setIsTyping(false);
      const errMsg = err.response?.data?.error || "Erreur réseau — réessaie dans quelques secondes.";
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", text: errMsg, isError: true },
      ]);
    }
  }, [
    inputText, attachedImages, isFirstMessage,
    sessionId, analysisCount, config,
    conversationStage, helpLevel, turnInStage,
  ]);

  // ── Keyboard ──
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendMessage();
    }
  };

  // ──────────────────────────────────────────
  // RESET
  // ──────────────────────────────────────────

  const handleReset = () => {
    setMessages([]);
    setSessionId(null);
    setAnalysisCount(0);
    setConversationStage("diagnostic");
    setHelpLevel(1);
    setTurnInStage(0);
    setExerciseInfo(null);
    setSuggestions(INITIAL_SUGGESTIONS[config.language] || INITIAL_SUGGESTIONS.fr);
    setAttachedImages([]);
    setInputText("");
    setInputError("");
    setIsTyping(false);
  };

  // ──────────────────────────────────────────
  // PLACEHOLDER TEXTAREA selon stage
  // ──────────────────────────────────────────

  const getPlaceholder = () => {
    if (isFirstMessage) return "Envoie une photo de ton exercice 📸 (ou décris ton problème)";
    const placeholders = {
      diagnostic:         { fr: "Dis-moi où exactement tu bloques...", ar: "أخبرني أين تواجه صعوبة...", darija: "قول لي فين بالضبط كتبلوك..." },
      guided_explanation: { fr: "Pose ta question...",                 ar: "اطرح سؤالك...",             darija: "سول سوالك..." },
      student_attempt:    { fr: "Écris ta tentative ici 📝",           ar: "اكتب محاولتك هنا 📝",       darija: "كتب محاولتك هنا 📝" },
      correction:         { fr: "Réponds ou pose une question...",     ar: "أجب أو اسأل...",            darija: "جاوب ولا سول..." },
      mastery_check:      { fr: "Essaie la question de vérification!", ar: "حاول سؤال التحقق!",         darija: "jarrab su2al lverification!" },
      completed:          { fr: "Nouveau problème ou nouvelle question ?", ar: "مسألة جديدة؟",         darija: "مسألة جديدة؟" },
    };
    const p = placeholders[conversationStage] || placeholders.guided_explanation;
    return p[config.language] || p.fr;
  };

  // ──────────────────────────────────────────
  // COULEUR STAGE pour le header
  // ──────────────────────────────────────────

  const stageMeta  = STAGE_META[conversationStage] || STAGE_META.diagnostic;
  const stageColor = stageMeta.color;

  // ══════════════════════════════════════════
  // RENDU — SETUP
  // ══════════════════════════════════════════

  if (screen === "setup") {
    return (
      <SetupScreen
        onBack={onBack}
        onStart={(cfg) => {
          setConfig(cfg);
          setSuggestions(INITIAL_SUGGESTIONS[cfg.language] || INITIAL_SUGGESTIONS.fr);
          setScreen("chat");
        }}
      />
    );
  }

  // ══════════════════════════════════════════
  // RENDU — CHAT
  // ══════════════════════════════════════════

  return (
    <div className="ga3-root ga3-chat">

      {/* ── Header ── */}
      <div
        className="ga3-header"
        style={{ "--iq-stage-color": stageColor }}
      >
        <button className="ga3-back" onClick={() => setScreen("setup")}>←</button>

        <div className="ga3-header__avatar" />

        <div className="ga3-header__info">
          <span className="ga3-header__name">Tuteur IQRA</span>
          <span className="ga3-header__ctx">
            {config.niveau} · {config.matiere}
            {exerciseInfo?.chapitre ? ` · ${exerciseInfo.chapitre}` : ""}
          </span>
        </div>

        {analysisCount > 0 && (
          <div className="ga3-stage-badge" data-stage={conversationStage}>
            {stageMeta.emoji} {stageMeta.label}
          </div>
        )}

        {analysisCount > 0 && (
          <button className="ga3-reset-btn" onClick={handleReset} title="Nouvelle session">↺</button>
        )}
      </div>

      {/* ── Progress bar ── */}
      {analysisCount > 0 && (
        <div className="ga3-progress-track">
          <div
            className="ga3-progress-fill"
            style={{
              "--progress-w": `${(STAGE_ORDER.indexOf(conversationStage) / (STAGE_ORDER.length - 1)) * 100}%`,
              width: `${(STAGE_ORDER.indexOf(conversationStage) / (STAGE_ORDER.length - 1)) * 100}%`,
            }}
          />
        </div>
      )}

      {/* ── Zone messages ── */}
      <div className="ga3-messages">

        {/* ── Écran de bienvenue ── */}
        {messages.length === 0 && (
          <div className="ga3-welcome">
            <div className="ga3-welcome__hero">
              <div className="ga3-welcome__orb">🔍</div>
              <div className="ga3-welcome__title">
                {config.language === "ar"     && "مرحباً ! أنا مساعدك التعليمي في IQRA"}
                {config.language === "darija" && "أهلاً ! أنا المساعد التعليمي ديال IQRA"}
                {config.language === "fr"     && "Salut ! Je suis ton tuteur IQRA"}
              </div>
              <p className="ga3-welcome__sub">
                {config.language === "fr"     && "Envoie une photo de l'exercice qui te pose problème. Je vais t'aider à comprendre exactement où tu bloques — étape par étape."}
                {config.language === "ar"     && "أرسل صورة للتمرين الذي يسبب لك مشكلة. سأساعدك لتفهم بالضبط أين تقف — خطوة بخطوة."}
                {config.language === "darija" && "صاوب صورة ديال التمرين اللي كيعيقك. غادي نعاونك تفهم فين بالضبط كتبلوك — خطوة خطوة."}
              </p>
              <div className="ga3-welcome__caps">
                {["🎯 Diagnostic précis", "💡 Explication étape par étape", "✏️ Active learning", "✅ Correction bienveillante"].map((c) => (
                  <span key={c} className="ga3-welcome__cap">{c}</span>
                ))}
              </div>
            </div>

            {/* Suggestions initiales */}
            <div className="ga3-suggestions ga3-suggestions--initial">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="ga3-suggestion"
                  onClick={() => setInputText(s)}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg.text}
            isUser={msg.role === "user"}
            images={msg.images || []}
            animDelay={msg.animDelay || 0}
            showIqra={msg.showIqra || false}
          />
        ))}

        {/* ── Stage indicator (après le premier échange) ── */}
        {analysisCount === 1 && messages.length >= 2 && (
          <StageIndicator currentStage={conversationStage} />
        )}

        {/* ── Exercise card (après analyse initiale) ── */}
        {exerciseInfo?.sujet && analysisCount === 1 && (
          <ExerciseCard info={exerciseInfo} />
        )}

        {/* ── Scaffold card (si help_level > 1) ── */}
        {helpLevel > 1 && analysisCount > 0 && (
          <ScaffoldCard helpLevel={helpLevel} />
        )}

        {/* ── Prompt "À toi" (stage student_attempt) ── */}
        {conversationStage === "student_attempt" && !isTyping && (
          <AttemptPrompt language={config.language} />
        )}

        {/* ── Typing indicator ── */}
        {isTyping && (
          <div className="ga3-row">
            <div className="ga3-avatar ga3-avatar--bot">🤖</div>
            <div className="ga3-bubble ga3-bubble--bot ga3-typing">
              <div className="ga3-dot" />
              <div className="ga3-dot" />
              <div className="ga3-dot" />
            </div>
          </div>
        )}

        {/* ── Suggestions de suivi ── */}
        {!isTyping && suggestions.length > 0 && messages.length > 0 && (
          <div className="ga3-suggestions" style={{ paddingLeft: 39 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="ga3-suggestion"
                onClick={() => sendMessage(s)}
              >{s}</button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Barre d'entrée ── */}
      <div className="ga3-input-area">

        {/* Aperçu images */}
        {attachedImages.length > 0 && (
          <div className="ga3-attached">
            {attachedImages.map((img, i) => (
              <div key={i} className="ga3-attached__thumb">
                <img src={img.preview} alt="" className="ga3-attached__img" />
                <button className="ga3-attached__remove" onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Erreur */}
        {inputError && <div className="ga3-input-err">{inputError}</div>}

        {/* Barre principale */}
        <div
          className={`ga3-bar${isDragging ? " is-dragging" : ""}`}
          data-stage={conversationStage}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
        >
          {/* Attach */}
          <button
            className="ga3-attach-btn"
            disabled={attachedImages.length >= MAX_IMAGES || isTyping}
            onClick={() => fileInputRef.current?.click()}
            title="Joindre une image"
          >
            📎
            {attachedImages.length > 0 && (
              <span className="ga3-attach-count">{attachedImages.length}</span>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
          />

          {/* Textarea */}
          <textarea
            className="ga3-textarea"
            placeholder={getPlaceholder()}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isTyping}
          />

          {/* Send */}
          <button
            className={`ga3-send-btn${canSend ? " is-ready" : ""}`}
            onClick={() => canSend && sendMessage()}
            disabled={!canSend}
            aria-label="Envoyer"
          >→</button>
        </div>

        <p className="ga3-bar-hint">
          Entrée pour envoyer · Shift+Entrée pour nouvelle ligne · 📎 pour joindre une image
        </p>
      </div>
    </div>
  );
}

export default GapAnalyzer;