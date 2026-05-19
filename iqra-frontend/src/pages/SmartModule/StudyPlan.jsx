import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./SmartModule.css";
import PdfTemplateSelector from "../../components/PdfTemplateSelector";
import { exportStudyPlanPDF } from "../../utils/pdfExport";

const API = "http://127.0.0.1:8000/api";

// ══════════════════════════════════════════
// PSYCHO THEMES — subtle, never announced
// ══════════════════════════════════════════
const PSYCHO_THEMES = {
  panique:        { primary: "#3B6FD4", soft: "#EEF4FF", line: "#B8D0F8", mood: "calm" },
  procrastination:{ primary: "#6B4FBB", soft: "#F0ECFF", line: "#C9BCEF", mood: "focus" },
  reseaux:        { primary: "#1A7F6E", soft: "#EDFAF6", line: "#9FD9CE", mood: "clear" },
  motivation:     { primary: "#C0571A", soft: "#FFF5EE", line: "#F4BFA0", mood: "energy" },
  default:        { primary: "#5B35A0", soft: "#F5F2FF", line: "#D6C8F5", mood: "neutral" },
};

function getTheme(facteurs) {
  if (!facteurs?.length) return PSYCHO_THEMES.default;
  if (facteurs.includes("panique"))         return PSYCHO_THEMES.panique;
  if (facteurs.includes("motivation"))      return PSYCHO_THEMES.motivation;
  if (facteurs.includes("procrastination")) return PSYCHO_THEMES.procrastination;
  if (facteurs.includes("reseaux"))         return PSYCHO_THEMES.reseaux;
  return PSYCHO_THEMES.default;
}

// ══════════════════════════════════════════
// TRANSLATIONS
// ══════════════════════════════════════════
const T = {
  fr: {
    title: "Plan de Rattrapage", subtitle: "Ton accompagnement personnalisé",
    langLabel: "Langue", next: "Continuer", back: "Retour", backHome: "← Retour",
    startChallenge: "Commencer le défi", seeMyPlan: "Créer mon plan",
    loading: "Préparation…", newPlan: "Nouveau plan", exportPdf: "Exporter PDF",
    chapPlaceholder: "Ex : suites numériques, dérivation, intégration…",
    chapHint: "Sépare les chapitres par des virgules",
    chapSuggest: "Suggestions rapides",
    weeksLabel: "Semaines", daysLabel: "Jours par semaine", hoursLabel: "Heures par jour",
    totalOk: "heures de travail", totalWarn: "Plan intensif — on optimise chaque minute",
    moreInfo: "Plus tu précises, plus le plan sera calibré pour toi",
    bloc3Title: "Où tu en es", bloc3Sub: "Une évaluation honnête aide à construire un plan réaliste",
    niveau0: "Je pars de zéro", niveau0sub: "Les bases ne sont pas encore claires",
    niveau1: "J'ai quelques bases", niveau1sub: "Mais je bloque souvent",
    niveau2: "Je comprends la théorie", niveau2sub: "Mais les exercices me résistent",
    niveau3: "Bonne maîtrise", niveau3sub: "Je manque d'entraînement",
    bloc4Title: "Ce qui freine ta progression", bloc4Sub: "On va l'intégrer et le contourner",
    proc: "La procrastination", procSub: "Difficile de démarrer",
    reseaux: "Les distractions numériques", reseauxSub: "Le téléphone capte mon attention",
    panique: "L'anxiété face à la difficulté", paniqueSub: "Le stress me paralyse",
    motiv: "Le manque de motivation", motivSub: "Du mal à trouver l'élan",
    rien: "Aucun de ces obstacles", rienSub: "J'ai juste besoin d'un plan structuré",
    quizTitle: "Évaluation diagnostique", quizSub: "5 questions pour calibrer ton plan",
    quizWarn: "Réponds à toutes les questions",
    planTitle: "Ton plan", scoreTitle: "Score",
    score5: "Excellente maîtrise — on affine les détails",
    score4: "Très bon niveau — quelques points à consolider",
    score3: "Bon niveau — le plan va renforcer les acquis",
    score2: "Des bases solides — on va les structurer",
    score1: "On part des fondations — c'est le bon moment",
    score0: "On repart de zéro — ensemble, étape par étape",
    weekLabel: "Semaine", actVideo: "Vidéo", actExercice: "Exercice", actChatbot: "Chatbot",
    momentLabel: "Quand", whyLabel: "Pourquoi", tipLabel: "Conseil",
    finalAdvice: "Pour aller plus loin", weeklyTime: "/ semaine",
    q1: "Ta filière", q2: "La matière", q3: "Les chapitres concernés", q4: "Ton temps disponible", q5: "Ton niveau actuel", q6: "Tes obstacles",
    errorComplete: "Complète cette étape pour continuer.", errorApi: "Erreur : ",
    step: "Étape", of: "sur",
    pdfGenerating: "⏳ Génération…",
  },
  ar: {
    title: "خطة الاستدراك", subtitle: "مرافقتك الشخصية",
    langLabel: "اللغة", next: "التالي", back: "رجوع", backHome: "→ رجوع",
    startChallenge: "ابدأ التحدي", seeMyPlan: "أنشئ خطتي",
    loading: "جاري التحضير…", newPlan: "خطة جديدة", exportPdf: "تصدير PDF",
    chapPlaceholder: "مثلا: المتتاليات، النهايات، التكامل…",
    chapHint: "افصل الفصول بفاصلة",
    chapSuggest: "اقتراحات",
    weeksLabel: "الأسابيع", daysLabel: "الأيام في الأسبوع", hoursLabel: "الساعات يومياً",
    totalOk: "ساعة عمل", totalWarn: "خطة مكثفة — نستثمر كل دقيقة",
    moreInfo: "كلما دققت، كانت الخطة أدق",
    bloc3Title: "مستواك الحالي", bloc3Sub: "تقييم صادق يساعد على بناء خطة واقعية",
    niveau0: "أبدأ من الصفر", niveau0sub: "الأسس لم تترسخ بعد",
    niveau1: "لدي بعض الأسس", niveau1sub: "لكن كثيرا ما أتعثر",
    niveau2: "أفهم النظرية", niveau2sub: "لكن التمارين تعيقني",
    niveau3: "إتقان جيد", niveau3sub: "أحتاج للتدرب أكثر",
    bloc4Title: "ما يعيق تقدمك", bloc4Sub: "سنأخذه بعين الاعتبار",
    proc: "المماطلة", procSub: "يصعب البدء",
    reseaux: "التشتت الرقمي", reseauxSub: "الهاتف يشغلني",
    panique: "القلق أمام الصعوبة", paniqueSub: "التوتر يشلّني",
    motiv: "غياب الدافعية", motivSub: "صعب إيجاد الحافز",
    rien: "لا شيء من هذا", rienSub: "أحتاج فقط لخطة منظمة",
    quizTitle: "التقييم التشخيصي", quizSub: "٥ أسئلة لضبط خطتك",
    quizWarn: "أجب على جميع الأسئلة",
    planTitle: "خطتك", scoreTitle: "النتيجة",
    score5: "إتقان ممتاز — نصقل التفاصيل",
    score4: "مستوى جيد جداً — بعض النقاط للتعزيز",
    score3: "مستوى جيد — الخطة ستقوي المكتسبات",
    score2: "أسس متينة — سنبنيها معاً",
    score1: "ننطلق من الأساس — الوقت مناسب",
    score0: "نبدأ من الصفر — معاً خطوة خطوة",
    weekLabel: "الأسبوع", actVideo: "فيديو", actExercice: "تمرين", actChatbot: "دردشة",
    momentLabel: "متى", whyLabel: "لماذا", tipLabel: "نصيحة",
    finalAdvice: "للمضي قُدُماً", weeklyTime: "/ أسبوع",
    q1: "مسلكك", q2: "المادة", q3: "الفصول المعنية", q4: "وقتك المتاح", q5: "مستواك الحالي", q6: "عوائقك",
    errorComplete: "أكمل هذه الخطوة للمتابعة.", errorApi: "خطأ : ",
    step: "الخطوة", of: "من",
    pdfGenerating: "⏳ جاري التوليد…",
  },
  darija: {
    title: "خطة الاستدراك", subtitle: "المرافقة الشخصية ديالك",
    langLabel: "اللغة", next: "التالي", back: "ارجع", backHome: "→ ارجع",
    startChallenge: "بدا التحدي", seeMyPlan: "دير الخطة ديالي",
    loading: "كيتحضر…", newPlan: "خطة جديدة", exportPdf: "صدر PDF",
    chapPlaceholder: "مثلا: المتتاليات، النهايات…",
    chapHint: "فرق الفصول بفاصلة",
    chapSuggest: "اقتراحات",
    weeksLabel: "الأسابيع", daysLabel: "الأيام فالأسبوع", hoursLabel: "الساعات فالنهار",
    totalOk: "ساعة ديال الخدمة", totalWarn: "خطة مكثفة — كنستغلو كل دقيقة",
    moreInfo: "قدر ما تكون دقيق، قدر ما تكون الخطة مزيانة",
    bloc3Title: "فين واصل دابا", bloc3Sub: "كون صريح — هاد الشي غيعاونك",
    niveau0: "كنبدأ من الصفر", niveau0sub: "الأساسيات ماحياش",
    niveau1: "عندي شوية أساس", niveau1sub: "ولكن كتعثر كثير",
    niveau2: "كنفهم النظرية", niveau2sub: "ولكن التمارين كيوقفوني",
    niveau3: "إتقان مزيان", niveau3sub: "محتاج التدريب أكثر",
    bloc4Title: "أشنو كيعيق تقدمك", bloc4Sub: "غنحطوه فالخطة",
    proc: "التسويف", procSub: "صعب عليّ نبدأ",
    reseaux: "التشتت الرقمي", reseauxSub: "التليفون كيشدني",
    panique: "القلق حين تصعب", paniqueSub: "الضغط كيوقفني",
    motiv: "غياب التحفيز", motivSub: "صعب نلقى الدافع",
    rien: "والو من هاد", rienSub: "محتاج غير خطة منظمة",
    quizTitle: "التقييم التشخيصي", quizSub: "٥ أسئلة باش نضبطو خطتك",
    quizWarn: "جاوب على جميع الأسئلة",
    planTitle: "الخطة ديالك", scoreTitle: "النتيجة",
    score5: "إتقان ممتاز — كنصقلو التفاصيل",
    score4: "مستوى مزيان بزاف — شوية نقاط نقوّيوها",
    score3: "مستوى مزيان — الخطة غتقوي المكتسبات",
    score2: "أساس متين — غنبنيوه مع بعضياتنا",
    score1: "كننطلقو من الأساس — الوقت مناسب",
    score0: "كنبداو من الصفر — مع بعضياتنا خطوة خطوة",
    weekLabel: "الأسبوع", actVideo: "فيديو", actExercice: "تمرين", actChatbot: "شات",
    momentLabel: "فين", whyLabel: "علاش", tipLabel: "النصيحة",
    finalAdvice: "باش تكمل", weeklyTime: "/ أسبوع",
    q1: "المسلك ديالك", q2: "المادة", q3: "الفصول المعنية", q4: "الوقت المتاح", q5: "مستواك دابا", q6: "العوائق ديالك",
    errorComplete: "كمل هاد الخطوة قبل ما تكمل.", errorApi: "خطأ : ",
    step: "الخطوة", of: "من",
    pdfGenerating: "⏳ كيتحضر…",
  },
};

// ══════════════════════════════════════════
// FILIERES
// ══════════════════════════════════════════
const FILIERES = [
  { label: "2BAC Sciences Maths A", value: "2BAC SM A",
    matieres: [{ label: "Mathématiques", value: "MATH" }, { label: "Physique-Chimie", value: "PC" }],
    chapSuggestions: { MATH: ["Suites numériques","Limites","Dérivation","Intégration","Nombres complexes","Probabilités"], PC: ["Ondes mécaniques","Circuit RLC","Dosage","Radioactivité","Lois de Newton"] } },
  { label: "2BAC Sciences Physiques et Chimiques", value: "2BAC SPC",
    matieres: [{ label: "Mathématiques", value: "MATH" }, { label: "Physique-Chimie", value: "PC" }],
    chapSuggestions: { MATH: ["Suites numériques","Limites","Dérivation","Intégration"], PC: ["Ondes mécaniques","Circuit RLC","Dosage","Radioactivité"] } },
  { label: "2BAC Sciences de la Vie et de la Terre", value: "2BAC SVT",
    matieres: [{ label: "Mathématiques", value: "MATH" }, { label: "Physique-Chimie", value: "PC" }, { label: "SVT", value: "SVT" }],
    chapSuggestions: { MATH: ["Suites numériques","Probabilités","Géométrie"], PC: ["Ondes mécaniques","Radioactivité"], SVT: ["Génétique","Immunologie","Tectonique"] } },
  { label: "2BAC Sciences Économiques", value: "2bac Sciences Économiques",
    matieres: [{ label: "Comptabilité et Mathématiques financières", value: "Comptabilité et Mathématiques financières" }, { label: "Économie générale et Statistiques", value: "Économie générale et Statistiques" }],
    chapSuggestions: { "Comptabilité et Mathématiques financières": ["Amortissements","Provisions","Analyse du bilan"], "Économie générale et Statistiques": ["Le marché","Circuit économique","Inflation"] } },
  { label: "2BAC Sciences de Gestion Comptable", value: "2bac Sciences de Gestion Comptable",
    matieres: [{ label: "Comptabilité et Mathématiques financières", value: "Comptabilité et Mathématiques financières" }, { label: "Économie générale et Statistiques", value: "Économie générale et Statistiques" }],
    chapSuggestions: { "Comptabilité et Mathématiques financières": ["Amortissements","Provisions"], "Économie générale et Statistiques": ["Le marché","Mondialisation"] } },
  { label: "2BAC Lettres", value: "2bac lettre",
    matieres: [{ label: "Langue Arabe", value: "arab" }, { label: "Géographie / Histoire", value: "geographie" }],
    chapSuggestions: { arab: ["النص الشعري","المسرحية","التعبير والإنشاء"], geographie: ["الحرب العالمية","العولمة"] } },
  { label: "2BAC Sciences Humaines", value: "2BAC S HUMAIN",
    matieres: [{ label: "Langue Arabe", value: "AR" }, { label: "Géographie / Histoire", value: "GEOGRAPHIQUE" }],
    chapSuggestions: { AR: ["النص الشعري","المسرحية"], GEOGRAPHIQUE: ["الحرب العالمية","العولمة"] } },
];

// ══════════════════════════════════════════
// PROFIL HELPER — no labels shown to user
// ══════════════════════════════════════════
function getProfil(totalH) {
  if (totalH * 60 < 60) return { code: "urgence", accent: "#C0392B" };
  if (totalH < 7)       return { code: "rapide",  accent: "#B7600F" };
  if (totalH < 21)      return { code: "normal",  accent: "#1A6FA8" };
  return                       { code: "expert",  accent: "#1A7F6E" };
}

// ══════════════════════════════════════════
// SKELETON MESSAGES
// ══════════════════════════════════════════
const SKELETON_MSGS = {
  quiz: {
    fr:     ["Analyse de tes lacunes…","Calibrage des questions…","Préparation du diagnostic…","Vérification du niveau…"],
    ar:     ["تحليل الثغرات…","معايرة الأسئلة…","تحضير التشخيص…","التحقق من المستوى…"],
    darija: ["كيتحلل فين كتبلوك…","كيتحضر التشخيص…","شوية…","قريبا…"],
  },
  plan: {
    fr:     ["Analyse de ton profil…","Construction du parcours…","Intégration des conseils…","Finalisation du plan…","Dernière touche…"],
    ar:     ["تحليل ملفك…","بناء المسار…","دمج النصائح…","إنهاء الخطة…","اللمسة الأخيرة…"],
    darija: ["كيتحلل البروفيل ديالك…","كيتبنى المسار…","كتدخل النصائح…","كيكمل الخطة…","آخر لمسة…"],
  },
};

// ══════════════════════════════════════════
// LOADING SCREEN
// ══════════════════════════════════════════
function LoadingScreen({ messages, theme }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 1600);
    return () => clearInterval(t);
  }, [messages]);
  return (
    <div className="ci-loading">
      <div className="ci-loading-orb" style={{ "--p": theme.primary }}>
        <div className="ci-orb-ring" />
        <div className="ci-orb-ring ci-orb-ring-2" />
        <span className="ci-orb-mark">iq</span>
      </div>
      <p className="ci-loading-msg">{messages[idx]}</p>
      <div className="ci-loading-bars">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="ci-loading-bar" style={{ animationDelay: `${i * 0.12}s`, "--p": theme.primary }} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ACTIVITY CARD — premium expandable
// ══════════════════════════════════════════
function ActivityCard({ act, sessionIdx, actIdx, checked, onToggle, t, theme }) {
  const [open, setOpen] = useState(false);
  const key = `${sessionIdx}-${actIdx}`;
  const typeMap = {
    video:    { icon: "▶", label: t.actVideo,    hue: "#7C5CBF" },
    exercice: { icon: "✎", label: t.actExercice, hue: "#C07B2A" },
    chatbot:  { icon: "◈", label: t.actChatbot,  hue: "#1A7F6E" },
  };
  const cfg = typeMap[act.type] || typeMap.video;
  return (
    <div className={`ci-act ${checked ? "ci-act--done" : ""} ${open ? "ci-act--open" : ""}`}
      style={{ "--act-hue": cfg.hue }}>
      <div className="ci-act-row" onClick={() => setOpen(o => !o)}>
        <button className="ci-checkbox" onClick={e => { e.stopPropagation(); onToggle(key); }}
          aria-label="Marquer comme fait">
          <span className={`ci-check-inner ${checked ? "ci-check-inner--done" : ""}`} />
        </button>
        <div className="ci-act-type">
          <span className="ci-act-glyph">{cfg.icon}</span>
          <span className="ci-act-type-label">{cfg.label}</span>
        </div>
        <p className="ci-act-title">{act.titre || "Activité"}</p>
        <div className="ci-act-meta">
          <span className="ci-act-dur">{act.duree}</span>
          <span className={`ci-chevron ${open ? "ci-chevron--up" : ""}`}>›</span>
        </div>
      </div>
      {open && (
        <div className="ci-act-details">
          {act.moment && (
            <div className="ci-detail">
              <span className="ci-detail-key">{t.momentLabel}</span>
              <span className="ci-detail-val">{act.moment}</span>
            </div>
          )}
          {act.pourquoi && (
            <div className="ci-detail">
              <span className="ci-detail-key">{t.whyLabel}</span>
              <span className="ci-detail-val">{act.pourquoi}</span>
            </div>
          )}
          {act.astuce && (
            <div className="ci-detail ci-detail--highlight">
              <span className="ci-detail-key">{t.tipLabel}</span>
              <span className="ci-detail-val">{act.astuce}</span>
            </div>
          )}
          {act.motivation && (
            <blockquote className="ci-act-quote">"{act.motivation}"</blockquote>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// PROGRESS BAR
// ══════════════════════════════════════════
function ProgressBar({ plan, checkedActs, theme }) {
  if (!plan?.sessions) return null;
  let total = 0, done = 0;
  plan.sessions.forEach((s, si) => s.activites?.forEach((_, ai) => { total++; if (checkedActs[`${si}-${ai}`]) done++; }));
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="ci-progress">
      <div className="ci-progress-track">
        <div className="ci-progress-fill" style={{ width: `${pct}%`, background: theme.primary }} />
      </div>
      <span className="ci-progress-label">{done}/{total}</span>
    </div>
  );
}

// ══════════════════════════════════════════
// LANG SWITCHER
// ══════════════════════════════════════════
function LangSwitcher({ lang, setLang, theme }) {
  return (
    <div className="ci-lang">
      {[["fr","FR"],["ar","ع"],["darija","درجة"]].map(([l, label]) => (
        <button key={l} className={`ci-lang-btn ${lang === l ? "ci-lang-btn--active" : ""}`}
          style={lang === l ? { color: theme.primary, borderColor: theme.primary } : {}}
          onClick={() => setLang(l)}>{label}</button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
// STEP INDICATOR
// ══════════════════════════════════════════
function StepIndicator({ step, total, t }) {
  return (
    <div className="ci-steps">
      <div className="ci-steps-track">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`ci-step-seg ${i < step ? "ci-step-seg--done" : i === step - 1 ? "ci-step-seg--active" : ""}`} />
        ))}
      </div>
      <span className="ci-steps-label">{t.step} {step} {t.of} {total}</span>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════
export default function StudyPlan({ onBack }) {
  const [lang, setLang] = useState("fr");
  const t = T[lang];
  const isRtl = lang === "ar" || lang === "darija";

  const [screen,       setScreen]       = useState("form");
  const [formStep,     setFormStep]     = useState(1);
  const [skeletonMsgs, setSkeletonMsgs] = useState(SKELETON_MSGS.quiz.fr);

  // Form state
  const [filiereValue,  setFiliereValue]  = useState("");
  const [matiere,       setMatiere]       = useState("");
  const [chapitres,     setChapitres]     = useState("");
  const [semaines,      setSemaines]      = useState("");
  const [joursParSem,   setJoursParSem]   = useState("");
  const [heuresParJour, setHeuresParJour] = useState("");
  const [niveauAuto,    setNiveauAuto]    = useState("");
  const [facteurs,      setFacteurs]      = useState([]);

  const filiere         = FILIERES.find(f => f.value === filiereValue);
  const matieresDispo   = filiere?.matieres || [];
  const chapSuggestions = filiere?.chapSuggestions?.[matiere] || [];
  const total           = (parseInt(semaines)||0) * (parseInt(joursParSem)||0) * (parseInt(heuresParJour)||0);
  const theme           = getTheme(facteurs);

  const [chapitresArray, setChapitresArray] = useState([]);
  const [totalHeures,    setTotalHeures]    = useState(0);
  const [profilDetecte,  setProfilDetecte]  = useState(null);
  const [activeTheme,    setActiveTheme]    = useState(PSYCHO_THEMES.default);

  const [quiz,        setQuiz]        = useState([]);
  const [answers,     setAnswers]     = useState({});
  const [score,       setScore]       = useState(null);
  const [plan,        setPlan]        = useState(null);
  const [checkedActs, setCheckedActs] = useState({});
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // ── PDF state ──
  const [showPdfSelector, setShowPdfSelector] = useState(false);
  const [pdfGenerating,   setPdfGenerating]   = useState(false);

  useEffect(() => { setSkeletonMsgs(SKELETON_MSGS.quiz[lang]); }, [lang]);

  const toggleFacteur = f => setFacteurs(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  const toggleAct     = k => setCheckedActs(p => ({ ...p, [k]: !p[k] }));

  const addSuggestion = s => {
    const cur = chapitres.trim();
    if (!cur) { setChapitres(s); return; }
    if (cur.split(",").map(c => c.trim()).includes(s)) return;
    setChapitres(cur + ", " + s);
  };

  const handleFiliereChange = v => { setFiliereValue(v); setMatiere(""); setChapitres(""); };

  const canNext = () => {
    if (formStep === 1) return filiereValue && matiere && chapitres.trim();
    if (formStep === 2) return semaines && joursParSem && heuresParJour;
    if (formStep === 3) return niveauAuto;
    return true;
  };

  const handleNext = () => {
    setError("");
    if (!canNext()) { setError(t.errorComplete); return; }
    if (formStep < 4) { setFormStep(s => s + 1); return; }
    handleFormSubmit();
  };

  const handleFormSubmit = async () => {
    const chapArray = chapitres.split(",").map(c => c.trim()).filter(Boolean);
    const p  = getProfil(total);
    const th = getTheme(facteurs);
    setChapitresArray(chapArray);
    setTotalHeures(total);
    setProfilDetecte(p);
    setActiveTheme(th);
    setSkeletonMsgs(SKELETON_MSGS.quiz[lang]);
    setLoading(true);
    setScreen("loading");
    try {
      const res = await axios.post(`${API}/quiz/`, { niveau: filiereValue, matiere, chapitres: chapArray, language: lang });
      setQuiz(res.data.quiz);
      setScreen("quiz");
    } catch (err) {
      setError(t.errorApi + (err.response?.data?.error || err.message));
      setScreen("form");
    } finally { setLoading(false); }
  };

  const handleQuizSubmit = async () => {
    let correct = 0;
    quiz.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    setScore(correct);
    setSkeletonMsgs(SKELETON_MSGS.plan[lang]);
    setLoading(true);
    setScreen("loading");
    try {
      const res = await axios.post(`${API}/study-plan/`, {
        niveau: filiereValue, matiere, chapitres: chapitresArray,
        temps_disponible: Math.max(1, Math.round(totalHeures / (parseInt(semaines) || 1))),
        score_quiz: correct, profil_plan: profilDetecte?.code,
        niveau_auto: niveauAuto, facteurs_psycho: facteurs, language: lang,
      });
      setPlan(res.data.plan);
      setScreen("plan");
    } catch (err) {
      setError(t.errorApi + (err.response?.data?.error || err.message));
      setScreen("quiz");
    } finally { setLoading(false); }
  };

  // ══════════════════════════════════════════
  // PDF EXPORT
  // ══════════════════════════════════════════
  const handlePdfExport = async (templateId) => {
    setPdfGenerating(true);
    try {
      const filiereObj = FILIERES.find(f => f.value === filiereValue);
      const matiereObj = matieresDispo.find(m => m.value === matiere);
      await exportStudyPlanPDF(
        plan,
        {
          filiereLabel:  filiereObj?.label || filiereValue,
          matiereLabel:  matiereObj?.label  || matiere,
          totalHeures,
          score,
          quizLength:    quiz.length,
          profilDetecte,
        },
        templateId,
        lang,
        facteurs,
      );
      setShowPdfSelector(false);
    } catch (err) {
      console.error("PDF export error:", err);
      setError("Erreur lors de la génération du PDF. Vérifie que jsPDF est installé : npm install jspdf");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleReset = () => {
    setScreen("form"); setFormStep(1);
    setFiliereValue(""); setMatiere(""); setChapitres("");
    setSemaines(""); setJoursParSem(""); setHeuresParJour("");
    setNiveauAuto(""); setFacteurs([]);
    setQuiz([]); setAnswers({}); setScore(null); setPlan(null);
    setProfilDetecte(null); setTotalHeures(0); setCheckedActs({});
    setActiveTheme(PSYCHO_THEMES.default); setError("");
    setShowPdfSelector(false); setPdfGenerating(false);
  };

  const scoreMsg = s => [t.score0,t.score1,t.score2,t.score3,t.score4,t.score5][Math.min(s,5)];
  const fLabel   = FILIERES.find(f => f.value === filiereValue)?.label || filiereValue;
  const mLabel   = matieresDispo.find(m => m.value === matiere)?.label || matiere;

  // ══════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════
  if (screen === "loading") return (
    <div className="ci-shell ci-shell--center" dir={isRtl ? "rtl" : "ltr"} style={{ "--p": activeTheme.primary, "--soft": activeTheme.soft }}>
      <LoadingScreen messages={skeletonMsgs} theme={activeTheme} />
    </div>
  );

  // ══════════════════════════════════════════
  // QUIZ
  // ══════════════════════════════════════════
  if (screen === "quiz") {
    const allAnswered = Object.keys(answers).length === quiz.length;
    return (
      <div className="ci-shell" dir={isRtl ? "rtl" : "ltr"} style={{ "--p": activeTheme.primary, "--soft": activeTheme.soft, "--line": activeTheme.line }}>
        <header className="ci-header">
          <button className="ci-back" onClick={onBack}>{t.backHome}</button>
          <LangSwitcher lang={lang} setLang={setLang} theme={activeTheme} />
        </header>
        <div className="ci-section-head">
          <h1 className="ci-h1">{t.quizTitle}</h1>
          <p className="ci-sub">{t.quizSub}</p>
        </div>
        {error && <div className="ci-error">{error}</div>}
        <div className="ci-quiz-list">
          {quiz.map((q, i) => (
            <div key={i} className="ci-quiz-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="ci-quiz-num">{i + 1}</div>
              <p className="ci-quiz-q">{q.question}</p>
              <div className="ci-quiz-opts">
                {q.options.map((opt, j) => (
                  <label key={j} className={`ci-opt ${answers[i] === opt[0] ? "ci-opt--sel" : ""}`}>
                    <input type="radio" name={`q${i}`} value={opt[0]}
                      onChange={() => setAnswers({ ...answers, [i]: opt[0] })} />
                    <span className="ci-opt-key">{opt[0]}</span>
                    <span className="ci-opt-text">{opt.slice(3)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {!allAnswered && <p className="ci-warn">{t.quizWarn}</p>}
        <div className="ci-footer-action">
          <button className="ci-cta" onClick={handleQuizSubmit} disabled={!allAnswered || loading}
            style={{ background: activeTheme.primary }}>
            {loading ? t.loading : t.seeMyPlan}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // PLAN
  // ══════════════════════════════════════════
  if (screen === "plan") {
    const pct = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0;
    return (
      <div className="ci-shell" dir={isRtl ? "rtl" : "ltr"} style={{ "--p": activeTheme.primary, "--soft": activeTheme.soft, "--line": activeTheme.line }}>

        {/* ── PDF Template Selector modal ── */}
        {showPdfSelector && (
          <PdfTemplateSelector
            onExport={handlePdfExport}
            onClose={() => setShowPdfSelector(false)}
            language={lang}
            isGenerating={pdfGenerating}
          />
        )}

        <header className="ci-header">
          <button className="ci-back" onClick={onBack}>{t.backHome}</button>
          <LangSwitcher lang={lang} setLang={setLang} theme={activeTheme} />
        </header>

        {/* Context strip */}
        <div className="ci-context-strip">
          <span className="ci-context-pill">{fLabel}</span>
          <span className="ci-context-sep">·</span>
          <span className="ci-context-pill">{mLabel}</span>
          <span className="ci-context-sep">·</span>
          <span className="ci-context-pill">{totalHeures}h</span>
        </div>

        {/* Intro message */}
        {plan?.message_intro && (
          <div className="ci-intro-card">
            <div className="ci-intro-avatar">🧑‍🏫</div>
            <p>{plan.message_intro}</p>
          </div>
        )}

        {/* Score */}
        <div className="ci-score-card">
          <div className="ci-score-left">
            <span className="ci-score-label">{t.scoreTitle}</span>
            <div className="ci-score-num" style={{ color: activeTheme.primary }}>
              {score}<span className="ci-score-den">/{quiz.length}</span>
            </div>
            <p className="ci-score-msg">{scoreMsg(score)}</p>
          </div>
          <div className="ci-score-arc">
            <svg viewBox="0 0 56 56" width="56" height="56">
              <circle cx="28" cy="28" r="22" fill="none" stroke={activeTheme.line} strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke={activeTheme.primary} strokeWidth="5"
                strokeDasharray={`${pct * 1.382} 138.2`} strokeLinecap="round" transform="rotate(-90 28 28)"
                style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)" }} />
            </svg>
            <span className="ci-arc-pct">{pct}%</span>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar plan={plan} checkedActs={checkedActs} theme={activeTheme} />

        {/* Plan header */}
        <div className="ci-plan-head">
          <h2 className="ci-h2">{t.planTitle}</h2>
          <span className="ci-plan-meta">{plan?.duree_totale} · {plan?.temps_par_semaine} {t.weeklyTime}</span>
        </div>

        {/* Sessions */}
        <div className="ci-sessions">
          {plan?.sessions?.map((session, si) => (
            <div key={si} className="ci-session" style={{ animationDelay: `${si * 0.1}s` }}>
              <div className="ci-session-marker">
                <div className="ci-session-dot" style={{ background: activeTheme.primary }}>{si + 1}</div>
                {si < (plan.sessions.length - 1) && <div className="ci-session-line" style={{ borderColor: activeTheme.line }} />}
              </div>
              <div className="ci-session-body">
                <div className="ci-session-head">
                  <span className="ci-session-week" style={{ color: activeTheme.primary }}>{t.weekLabel} {session.semaine}</span>
                  <h3 className="ci-session-obj">{session.objectif}</h3>
                  {session.message_session && <p className="ci-session-note">{session.message_session}</p>}
                </div>
                <div className="ci-acts">
                  {session.activites?.map((act, ai) => (
                    <ActivityCard key={ai} act={act} sessionIdx={si} actIdx={ai}
                      checked={!!checkedActs[`${si}-${ai}`]} onToggle={toggleAct}
                      t={t} theme={activeTheme} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Conseils */}
        {plan?.conseils_finaux && (
          <div className="ci-advice">
            <h3 className="ci-advice-title">💡 {t.finalAdvice}</h3>
            <ul className="ci-advice-list">
              {plan.conseils_finaux.map((c, i) => (
                <li key={i}><span className="ci-advice-dot" style={{ background: activeTheme.primary }} />{c}</li>
              ))}
            </ul>
            <div className="ci-iqra-banner" style={{ borderColor: activeTheme.line, background: activeTheme.soft }}>
              <span className="ci-iqra-wordmark" style={{ color: activeTheme.primary }}>iqra</span>
              <p>Continue avec les vidéos courtes, les exercices progressifs et le chatbot — tout est là pour toi.</p>
            </div>
          </div>
        )}

        {/* Clôture */}
        {plan?.message_cloture && (
          <div className="ci-cloture" style={{ borderColor: activeTheme.line }}>
            <p>{plan.message_cloture}</p>
          </div>
        )}

        {error && <div className="ci-error">{error}</div>}

        {/* ── Actions ── */}
        <div className="ci-plan-actions">
          <button
            className="ci-btn-export"
            onClick={() => setShowPdfSelector(true)}
            disabled={pdfGenerating}
            style={{ borderColor: activeTheme.primary, color: activeTheme.primary }}
          >
            {pdfGenerating ? t.pdfGenerating : `⬇ ${t.exportPdf}`}
          </button>
          <button className="ci-btn-ghost" onClick={handleReset}>↺ {t.newPlan}</button>
          <button className="ci-back" onClick={onBack}>{t.backHome}</button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════
  return (
    <div className="ci-shell ci-shell--form" dir={isRtl ? "rtl" : "ltr"}
      style={{ "--p": theme.primary, "--soft": theme.soft, "--line": theme.line }}>
      <header className="ci-header">
        <button className="ci-back" onClick={onBack}>{t.backHome}</button>
        <LangSwitcher lang={lang} setLang={setLang} theme={theme} />
      </header>

      {/* Hero */}
      <div className="ci-hero">
        <div className="ci-wordmark">iq<span style={{ color: theme.primary }}>ra</span></div>
        <h1 className="ci-hero-title">{t.title}</h1>
        <p className="ci-hero-sub">{t.subtitle}</p>
      </div>

      <StepIndicator step={formStep} total={4} t={t} />

      {error && <div className="ci-error">{error}</div>}

      {/* ── Step 1 ── */}
      {formStep === 1 && (
        <div className="ci-form-step">
          {/* Filière */}
          <div className="ci-field-group">
            <label className="ci-label">{t.q1}</label>
            <div className="ci-select-wrap">
              <select className="ci-select" value={filiereValue} onChange={e => handleFiliereChange(e.target.value)}>
                <option value="">—</option>
                {FILIERES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Matière */}
          {filiereValue && (
            <div className="ci-field-group ci-field-group--anim">
              <label className="ci-label">{t.q2}</label>
              <div className="ci-pill-group">
                {matieresDispo.map(m => (
                  <button key={m.value}
                    className={`ci-pill ${matiere === m.value ? "ci-pill--sel" : ""}`}
                    style={matiere === m.value ? { background: theme.primary, borderColor: theme.primary, color: "#fff" } : {}}
                    onClick={() => { setMatiere(m.value); setChapitres(""); }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chapitres */}
          {matiere && (
            <div className="ci-field-group ci-field-group--anim">
              <label className="ci-label">{t.q3}</label>
              <input className="ci-input" type="text" placeholder={t.chapPlaceholder}
                value={chapitres} onChange={e => setChapitres(e.target.value)} />
              <span className="ci-field-hint">{t.chapHint}</span>
              {chapSuggestions.length > 0 && (
                <div className="ci-suggestions">
                  <span className="ci-suggestions-label">{t.chapSuggest}</span>
                  <div className="ci-suggestion-chips">
                    {chapSuggestions.map(s => (
                      <button key={s} className="ci-chip" onClick={() => addSuggestion(s)}>+ {s}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2 — Time planning ── */}
      {formStep === 2 && (
        <div className="ci-form-step">
          <p className="ci-field-sub">{t.moreInfo}</p>
          <div className="ci-time-grid">
            {[
              { label: t.weeksLabel, val: semaines, set: setSemaines, opts: [1,2,3,4], fmt: v => `${v} sem.` },
              { label: t.daysLabel,  val: joursParSem, set: setJoursParSem, opts: [1,2,3,4,5,6,7], fmt: v => `${v} j` },
              { label: t.hoursLabel, val: heuresParJour, set: setHeuresParJour, opts: [1,2,3,4,5,6,7,8], fmt: v => `${v} h` },
            ].map(({ label, val, set, opts, fmt }) => (
              <div key={label} className="ci-time-block">
                <span className="ci-time-label">{label}</span>
                <div className="ci-time-opts">
                  {opts.map(v => (
                    <button key={v}
                      className={`ci-time-opt ${val == v ? "ci-time-opt--sel" : ""}`}
                      style={val == v ? { background: theme.primary, color: "#fff", borderColor: theme.primary } : {}}
                      onClick={() => set(String(v))}>
                      {fmt(v)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="ci-time-result">
              <div className="ci-time-result-num" style={{ color: theme.primary }}>{total}h</div>
              <div className="ci-time-result-text">
                {total < 5 ? t.totalWarn : t.totalOk}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3 — Niveau ── */}
      {formStep === 3 && (
        <div className="ci-form-step">
          <p className="ci-field-sub">{t.bloc3Sub}</p>
          <div className="ci-level-cards">
            {[
              { value: "niveau0", label: t.niveau0, sub: t.niveau0sub, n: "0" },
              { value: "niveau1", label: t.niveau1, sub: t.niveau1sub, n: "1" },
              { value: "niveau2", label: t.niveau2, sub: t.niveau2sub, n: "2" },
              { value: "niveau3", label: t.niveau3, sub: t.niveau3sub, n: "3" },
            ].map(opt => (
              <div key={opt.value}
                className={`ci-level-card ${niveauAuto === opt.value ? "ci-level-card--sel" : ""}`}
                style={niveauAuto === opt.value ? { borderColor: theme.primary, background: theme.soft } : {}}
                onClick={() => setNiveauAuto(opt.value)}>
                <span className="ci-level-n" style={niveauAuto === opt.value ? { color: theme.primary } : {}}>{opt.n}</span>
                <div>
                  <strong>{opt.label}</strong>
                  <p>{opt.sub}</p>
                </div>
                {niveauAuto === opt.value && (
                  <span className="ci-level-check" style={{ background: theme.primary }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 4 — Obstacles ── */}
      {formStep === 4 && (
        <div className="ci-form-step">
          <p className="ci-field-sub">{t.bloc4Sub}</p>
          <div className="ci-obstacle-list">
            {[
              { value: "procrastination", label: t.proc,    sub: t.procSub,    glyph: "⏱" },
              { value: "reseaux",         label: t.reseaux,  sub: t.reseauxSub, glyph: "📵" },
              { value: "panique",         label: t.panique,  sub: t.paniqueSub, glyph: "🫧" },
              { value: "motivation",      label: t.motiv,    sub: t.motivSub,   glyph: "🔋" },
              { value: "rien",            label: t.rien,     sub: t.rienSub,    glyph: "✓" },
            ].map(f => {
              const sel = facteurs.includes(f.value);
              const fth = getTheme([f.value]);
              return (
                <div key={f.value}
                  className={`ci-obstacle ${sel ? "ci-obstacle--sel" : ""}`}
                  style={sel ? { borderColor: fth.primary, background: fth.soft } : {}}
                  onClick={() => toggleFacteur(f.value)}>
                  <span className="ci-obstacle-glyph">{f.glyph}</span>
                  <div className="ci-obstacle-text">
                    <strong>{f.label}</strong>
                    <p>{f.sub}</p>
                  </div>
                  <div className={`ci-obstacle-check ${sel ? "ci-obstacle-check--sel" : ""}`}
                    style={sel ? { background: fth.primary } : {}}>
                    {sel && "✓"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="ci-nav">
        {formStep > 1 && (
          <button className="ci-btn-ghost" onClick={() => { setError(""); setFormStep(s => s - 1); }}>
            ← {t.back}
          </button>
        )}
        <button className="ci-cta" onClick={handleNext} disabled={loading}
          style={{ background: theme.primary }}>
          {loading ? t.loading : formStep < 4 ? t.next : t.startChallenge}
        </button>
      </div>
    </div>
  );
}