import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { saveCareerResult } from "../../utils/activity";
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";
import "./CareerAdvisor.css";

const styles = {
  container: "ca-container",
  langSwitcher: "ca-lang-switcher",
  langBtn: "ca-lang-btn",
  langBtnActive: "ca-lang-btn-active",
  header: "ca-header",
  icon: "ca-icon",
  subtitle: "ca-subtitle",
  card: "ca-card",
  formGroup: "ca-form-group",
  charCount: "ca-char-count",
  btnPrimary: "ca-btn-primary",
  btnSecondary: "ca-btn-secondary",
  backLink: "ca-back-link",
  progressWrapper: "ca-progress-wrapper",
  progressBar: "ca-progress-bar",
  progressLabel: "ca-progress-label",
  encouragement: "ca-encouragement",
  questionCard: "ca-question-card",
  questionText: "ca-question-text",
  helpBtn: "ca-help-btn",
  suggestionBox: "ca-suggestion-box",
  suggestionText: "ca-suggestion-text",
  suggestionSpinner: "ca-suggestion-spinner",
  tagsGrid: "ca-tags-grid",
  tag: "ca-tag",
  navBtns: "ca-nav-btns",
  loading: "ca-loading",
  spinner: "ca-spinner",
  welcomeCard: "ca-welcome-card",
  portalsGrid: "ca-portals-grid",
  portalCard: "ca-portal-card",
  portalIcon: "ca-portal-icon",
  portalGlow: "ca-portal-glow",
  summaryGrid: "ca-summary-grid",
  summaryCard: "ca-summary-card",
  limitingCard: "ca-limiting-card",
  clotureCard: "ca-cloture-card",
  section: "ca-section",
  chartWrapper: "ca-chart-wrapper",
  chartSub: "ca-chart-sub",
  filiereCard: "ca-filiere-card",
  filiereHeader: "ca-filiere-header",
  rank: "ca-rank",
  filiereBarWrap: "ca-filiere-bar-wrap",
  filiereBar: "ca-filiere-bar",
  score: "ca-score",
  parcours: "ca-parcours",
  parcoursTitle: "ca-parcours-title",
  error: "ca-error",
};

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, CategoryScale, LinearScale, BarElement
);

const API_BASE = "http://localhost:8000/api";

// ── Langues ──────────────────────────────────────────────────
const LANGUAGES = [
  { code: "fr",     label: "FR",  full: "Français" },
  { code: "ar",     label: "ع",   full: "العربية"  },
  { code: "darija", label: "درج", full: "Darija"   },
];

// ── Niveaux ───────────────────────────────────────────────────
const NIVEAUX = [
  "1ère année collège", "2ème année collège", "3ème année collège",
  "Tronc commun", "1ère BAC", "2BAC SM A", "2BAC SPC", "2BAC SVT",
  "2bac Sciences Économiques", "2bac Sciences de Gestion Comptable",
  "2bac lettre", "2BAC S HUMAIN",
];

const FILIERES_BAC = {
  "2BAC SM A":                          ["Sciences Mathématiques A"],
  "2BAC SPC":                           ["Sciences Physiques et Chimiques"],
  "2BAC SVT":                           ["Sciences de la Vie et de la Terre"],
  "2bac Sciences Économiques":          ["Sciences Économiques"],
  "2bac Sciences de Gestion Comptable": ["Sciences de Gestion Comptable"],
  "2bac lettre":                        ["Lettres"],
  "2BAC S HUMAIN":                      ["Sciences Humaines"],
};

// ── Traductions UI ────────────────────────────────────────────
const T = {
  fr: {
    title:              "مستشار المسار المهني",
    subtitle:           "Découvre ton profil, tes forces cachées, et les filières qui te correspondent vraiment.",
    startCard:          "Pour commencer, parle-moi un peu de toi",
    levelLabel:         "Ton niveau scolaire *",
    levelPlaceholder:   "-- Choisis ton niveau --",
    filiereLabel:       "Ta filière (optionnel)",
    filierePlaceholder: "-- Non précisée --",
    descLabel:          "Décris-toi en quelques mots (optionnel)",
    descPlaceholder:    "Ex : je suis timide, j'aime les maths mais je doute souvent de moi...",
    startBtn:           "Commencer mon orientation →",
    loadingQ:           "Préparation de tes questions personnalisées…",
    loadingQSub:        "Notre IA analyse ton profil pour créer un questionnaire qui te correspond vraiment.",
    loadingA:           "Analyse de ton profil en cours…",
    loadingASub:        "Notre IA explore tes réponses pour déceler tes forces cachées.",
    questionTitle:      "Questionnaire d'orientation",
    back:               "← Retour",
    next:               "Suivant →",
    finish:             "Terminer →",
    helpBtn:            "💡 Besoin d'inspiration ?",
    answerHere:         "Écris ta réponse ici, prends ton temps...",
    errLevel:           "Merci de choisir ton niveau scolaire.",
    errWrite:           "Merci d'écrire quelque chose avant de continuer.",
    errQuestions:       "Erreur lors de la génération des questions. Réessaie.",
    errAnalyse:         "Erreur lors de l'analyse. Réessaie.",
    restart:            "🔄 Recommencer l'orientation",
    resultTitle:        "Ton profil d'orientation",
    portal1Title:       "Mon Passeport d'Avenir",
    portal1Sub:         "Filières recommandées, parcours & établissements",
    portal2Title:       "Mon Miroir Intérieur",
    portal2Sub:         "Profil psychologique, forces & dimensions détectées",
    forcesTitle:        "💪 Tes forces cachées",
    croyancesTitle:     "🔓 Ce qui te freine peut-être",
    styleTitle:         "📚 Ton style d'apprentissage",
    radarTitle:         "📊 Compatibilité avec les filières",
    radarSub:           "Niveau de compatibilité selon ton profil.",
    top3Title:          "🎯 Tes 3 filières recommandées",
    parcoursTitle:      "📍 Parcours & établissements",
    barTitle:           "🧠 Tes dimensions psychologiques",
    barSub:             "En violet : tes atouts. En orange : ce qui mérite attention.",
    pourquoi:           "Pourquoi :",
    realites:           "Réalités au Maroc :",
    defi:               "Ton défi :",
    backDashboard:      "← Retour au tableau de bord",
    addSuggestion:      "Ajouter →",
    encouragements: {
      3:  "Tu avances bien, continue — il n'y a pas de mauvaise réponse ici. 💙",
      7:  "Tu fais preuve de vraie réflexion. C'est exactement ce qu'il faut. ✨",
      10: "Presque fini ! Ces dernières questions sont les plus importantes. 🌟",
    },
  },
  ar: {
    title:              "مستشار المسار المهني",
    subtitle:           "اكتشف ملفك الشخصي وقدراتك الخفية والتخصصات التي تناسبك حقاً.",
    startCard:          "للبداية، أخبرني قليلاً عن نفسك",
    levelLabel:         "مستواك الدراسي *",
    levelPlaceholder:   "-- اختر مستواك --",
    filiereLabel:       "شعبتك (اختياري)",
    filierePlaceholder: "-- غير محددة --",
    descLabel:          "صف نفسك ببضع كلمات (اختياري)",
    descPlaceholder:    "مثال: أنا خجول، أحب الرياضيات لكن أشك في نفسي...",
    startBtn:           "ابدأ توجيهي ←",
    loadingQ:           "جاري إعداد أسئلتك الشخصية...",
    loadingQSub:        "يحلل الذكاء الاصطناعي ملفك لإنشاء استبيان يناسبك.",
    loadingA:           "جاري تحليل ملفك...",
    loadingASub:        "يستكشف الذكاء الاصطناعي إجاباتك لاكتشاف قدراتك الخفية.",
    questionTitle:      "استبيان التوجيه",
    back:               "رجوع →",
    next:               "التالي ←",
    finish:             "إنهاء ←",
    helpBtn:            "💡 تحتاج إلهاماً؟",
    answerHere:         "اكتب إجابتك هنا، خذ وقتك...",
    errLevel:           "الرجاء اختيار مستواك الدراسي.",
    errWrite:           "الرجاء كتابة شيء قبل المتابعة.",
    errQuestions:       "خطأ في توليد الأسئلة. حاول مجدداً.",
    errAnalyse:         "خطأ في التحليل. حاول مجدداً.",
    restart:            "🔄 إعادة التوجيه",
    resultTitle:        "ملفك التوجيهي",
    portal1Title:       "جواز مستقبلي",
    portal1Sub:         "التخصصات الموصى بها والمسار والمؤسسات",
    portal2Title:       "مرآتي الداخلية",
    portal2Sub:         "الملف النفسي والقدرات والأبعاد المكتشفة",
    forcesTitle:        "💪 قدراتك الخفية",
    croyancesTitle:     "🔓 ما قد يعيقك",
    styleTitle:         "📚 أسلوب تعلمك",
    radarTitle:         "📊 التوافق مع التخصصات",
    radarSub:           "مستوى التوافق حسب ملفك الشخصي.",
    top3Title:          "🎯 أفضل 3 تخصصات لك",
    parcoursTitle:      "📍 المسار والمؤسسات",
    barTitle:           "🧠 أبعادك النفسية",
    barSub:             "البنفسجي: نقاط قوتك. البرتقالي: ما يستحق الاهتمام.",
    pourquoi:           "لماذا:",
    realites:           "الواقع في المغرب:",
    defi:               "تحديك:",
    backDashboard:      "← العودة للوحة القيادة",
    addSuggestion:      "أضف ←",
    encouragements: {
      3:  "أنت تتقدم بشكل جيد — لا توجد إجابة خاطئة هنا. 💙",
      7:  "أنت تُبدي تفكيراً حقيقياً. هذا بالضبط ما نحتاجه. ✨",
      10: "اقتربت من النهاية! هذه الأسئلة الأخيرة هي الأهم. 🌟",
    },
  },
  darija: {
    title:              "مستشار المسار المهني",
    subtitle:           "اكتشف ملفك وقدراتك الخفية والتخصصات اللي كتناسبك بصح.",
    startCard:          "باش نبداو، حدثني شوية على روحك",
    levelLabel:         "مستواك الدراسي *",
    levelPlaceholder:   "-- اختار مستواك --",
    filiereLabel:       "شعبتك (اختياري)",
    filierePlaceholder: "-- ماشي محددة --",
    descLabel:          "وصف روحك بجوج كلمات (اختياري)",
    descPlaceholder:    "مثلاً: أنا خجول، كنحب الرياضيات ولكن كنشك فراسي...",
    startBtn:           "نبدا التوجيه ←",
    loadingQ:           "كنحضر ليك أسئلتك الشخصية...",
    loadingQSub:        "الذكاء الاصطناعي كيحلل ملفك باش يصنع استبيان يناسبك.",
    loadingA:           "كنحلل ملفك...",
    loadingASub:        "الذكاء الاصطناعي كيستكشف إجاباتك باش يلقى قدراتك الخفية.",
    questionTitle:      "استبيان التوجيه",
    back:               "← ارجع",
    next:               "التالي →",
    finish:             "كمل →",
    helpBtn:            "💡 محتاج إلهام؟",
    answerHere:         "كتب جوابك هنا، خذ وقتك...",
    errLevel:           "الرجاء تختار مستواك الدراسي.",
    errWrite:           "الرجاء تكتب شي قبل ما تكمل.",
    errQuestions:       "كاين خطأ في توليد الأسئلة. عاود.",
    errAnalyse:         "كاين خطأ في التحليل. عاود.",
    restart:            "🔄 عاود التوجيه",
    resultTitle:        "ملفك ديال التوجيه",
    portal1Title:       "باسبور ديالي للمستقبل",
    portal1Sub:         "التخصصات الموصى بيها والمسار والمدارس",
    portal2Title:       "المرايا ديالي من الداخل",
    portal2Sub:         "الملف النفسي والقدرات والأبعاد اللي تلاقات",
    forcesTitle:        "💪 قدراتك الخفية",
    croyancesTitle:     "🔓 اللي ممكن كيعيقك",
    styleTitle:         "📚 أسلوب تعلمك",
    radarTitle:         "📊 التوافق مع التخصصات",
    radarSub:           "مستوى التوافق حسب ملفك.",
    top3Title:          "🎯 أحسن 3 تخصصات ليك",
    parcoursTitle:      "📍 المسار والمدارس",
    barTitle:           "🧠 أبعادك النفسية",
    barSub:             "البنفسجي: نقاط قوتك. البرتقالي: اللي خاصو اهتمام.",
    pourquoi:           "علاش:",
    realites:           "الواقع فالمغرب:",
    defi:               "التحدي ديالك:",
    backDashboard:      "← ارجع للوحة",
    addSuggestion:      "زيد →",
    encouragements: {
      3:  "راك كتقدم مزيان — ماكاينش جواب غلط هنا. 💙",
      7:  "كتبين تفكير حقيقي. هادشي اللي خاصنا بالضبط. ✨",
      10: "قريب تكمل! هاد الأسئلة الأخيرة هي الأهم. 🌟",
    },
  },
};

// ── Framer Motion variants ────────────────────────────────────
const fadeIn = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit:     { opacity: 0, y: -20, transition: { duration: 0.25 } },
};

const portalVariant = {
  initial: { opacity: 0, scale: 0.92, y: 30 },
  animate: (i) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
  }),
};

// ── TypeWriter ────────────────────────────────────────────────
function TypeWriter({ text, speed = 28 }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span>{displayed}</span>;
}

// ── Radar ─────────────────────────────────────────────────────
function RadarFilieres({ scores_radar }) {
  const labels = Object.keys(scores_radar);
  const values = Object.values(scores_radar);
  const data = {
    labels,
    datasets: [{
      label: "Compatibilité (%)",
      data: values,
      backgroundColor: "rgba(123,47,190,0.15)",
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
        min: 0, max: 100,
        ticks: { stepSize: 20, font: { size: 11 }, color: "#999" },
        pointLabels: { font: { size: 12, weight: "600" }, color: "#1A1A1A" },
        grid: { color: "rgba(0,0,0,0.08)" },
        angleLines: { color: "rgba(0,0,0,0.08)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.raw}% compatible` } },
    },
  };
  return <div className={styles.chartWrapper}><Radar data={data} options={options} /></div>;
}

// ── Barres ────────────────────────────────────────────────────
function BarresDimensions({ dimensions_psycho }) {
  const LABELS_FR = {
    curiosite: "Curiosité", resilience: "Résilience",
    estime_de_soi: "Estime de soi", motivation: "Motivation",
    creativite: "Créativité", rigueur: "Rigueur",
    sociabilite: "Sociabilité", peur_echec: "Peur d'échec",
    autonomie: "Autonomie", empathie: "Empathie",
  };
  const labels = Object.keys(dimensions_psycho).map((k) => LABELS_FR[k] || k);
  const values = Object.values(dimensions_psycho);
  const bgColors = Object.keys(dimensions_psycho).map((k) =>
    k === "peur_echec" ? "rgba(245,166,35,0.8)" : "rgba(123,47,190,0.8)"
  );
  const data = {
    labels,
    datasets: [{
      label: "Score", data: values,
      backgroundColor: bgColors, borderRadius: 6, borderSkipped: false,
    }],
  };
  const options = {
    responsive: true,
    indexAxis: "y",
    scales: {
      x: {
        min: 0, max: 100,
        ticks: { callback: (v) => `${v}%`, font: { size: 11 }, color: "#999" },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
      y: { ticks: { font: { size: 12 }, color: "#1A1A1A" }, grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.raw}/100` } },
    },
  };
  return <div className={styles.chartWrapper}><Bar data={data} options={options} /></div>;
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════
const SCREEN = {
  AMORCE:        "amorce",
  LOADING_Q:     "loading_q",
  QUESTIONNAIRE: "questionnaire",
  LOADING_A:     "loading_a",
  DASHBOARD:     "dashboard",
  PORTAL_CAREER: "portal_career",
  PORTAL_PSYCHO: "portal_psycho",
};

export default function CareerAdvisor() {  const [screen,      setScreen]     = useState(SCREEN.AMORCE);
  const [amorce,      setAmorce]     = useState({ niveau: "", filiere: "", description: "" });
  const [questions,   setQuestions]  = useState([]);
  const [reponses,    setReponses]   = useState({});
  const [currentQ,    setCurrentQ]   = useState(0);
  const [resultats,   setResultats]  = useState(null);
  const [error,       setError]      = useState("");
  const [showTags,    setShowTags]   = useState(false);
  const [suggestion,  setSuggestion] = useState("");
  const [suggLoading, setSuggLoading] = useState(false);

  const suggTimerRef = useRef(null);
  const topRef       = useRef(null);  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "darija";

  useEffect(() => {
    if (screen === SCREEN.AMORCE) return;
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [screen]);

  // ── Réinitialiser suggestion + tags au changement de question ─
  useEffect(() => {
    setSuggestion("");
    setSuggLoading(false);
    setShowTags(false);
    clearTimeout(suggTimerRef.current);
  }, [currentQ]);

  // ── Amorce submit ─────────────────────────────────────────────
  const handleAmorceSubmit = async () => {
    if (!amorce.niveau) { setError(t('career.errLevel')); return; }
    setError("");
    setScreen(SCREEN.LOADING_Q);
    try {
      const res = await axios.post(`${API_BASE}/orientation/generate-questions/`, {
        niveau:      amorce.niveau,
        filiere:     amorce.filiere,
        description: amorce.description,
        language: i18n.language,
      });
      const qs = res.data.questions || [];
      if (qs.length < 1) throw new Error("Pas assez de questions");
      // Les questions arrivent avec { id, texte, tags[] } — rien d'autre à charger
      setQuestions(qs);
      setCurrentQ(0);
      setReponses({});
      setScreen(SCREEN.QUESTIONNAIRE);
    } catch {
      setError(t('career.errQuestions'));
      setScreen(SCREEN.AMORCE);
    }
  };

  // ── Gestion du textarea : suggestion après 5s d'inactivité ───
  const handleReponseChange = (qId, value) => {
    setReponses((p) => ({ ...p, [qId]: value }));
    setSuggestion("");
    clearTimeout(suggTimerRef.current);

    suggTimerRef.current = setTimeout(() => {
      fetchSuggestion(qId, value);
    }, 5000);
  };

  const fetchSuggestion = async (qId, currentAnswer) => {
    const q = questions.find((q) => q.id === qId);
    if (!q) return;
    setSuggLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/orientation/suggestion/`, {
        question_id:    qId,
        question_text:  q.texte,
        current_answer: currentAnswer || "",
        niveau:         amorce.niveau,
        language: i18n.language,
      });
      setSuggestion(res.data.suggestion || "");
    } catch {
      // Silencieux
    } finally {
      setSuggLoading(false);
    }
  };

  const applySuggestion = () => {
    const q = questions[currentQ];
    if (!suggestion) return;
    setReponses((p) => ({
      ...p,
      [q.id]: (p[q.id] ? p[q.id] + " " : "") + suggestion,
    }));
    setSuggestion("");
  };

  // ── Smart Tags : déjà dans q.tags, juste toggle l'affichage ──
  const handleHelpClick = () => {
    setShowTags((s) => !s);
  };

  const injectTag = (tag) => {
    const q = questions[currentQ];
    setReponses((p) => ({ ...p, [q.id]: (p[q.id] ? p[q.id] + " " : "") + tag }));
    setShowTags(false);
  };

  // ── Navigation questionnaire ──────────────────────────────────
  const handleNext = () => {
    const q = questions[currentQ];
    if (!reponses[q.id]?.trim()) { setError(t('career.errWrite')); return; }
    setError("");
    setShowTags(false);
    setSuggestion("");
    clearTimeout(suggTimerRef.current);
    if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
    else handleSubmitQuestionnaire();
  };

  const handleBack = () => {
    setError("");
    setShowTags(false);
    setSuggestion("");
    clearTimeout(suggTimerRef.current);
    if (currentQ > 0) setCurrentQ(currentQ - 1);
    else setScreen(SCREEN.AMORCE);
  };

  // ── Submit final ──────────────────────────────────────────────
  const handleSubmitQuestionnaire = async () => {
    setScreen(SCREEN.LOADING_A);
    const reponsesArray = questions.map((q) => ({
      question_id: q.id,
      question:    q.texte,
      reponse:     reponses[q.id] || "",
    }));
    try {
      const res = await axios.post(`${API_BASE}/orientation/`, {
        contexte_amorce: amorce,
        reponses:        reponsesArray,
        language: i18n.language,
      });
      setResultats(res.data);
      saveCareerResult(res.data);
      setScreen(SCREEN.DASHBOARD);
    } catch {
      setError(t('career.errAnalyse'));
      setScreen(SCREEN.QUESTIONNAIRE);
    }
  };

  const handleRestart = () => {
    setScreen(SCREEN.AMORCE);
    setAmorce({ niveau: "", filiere: "", description: "" });
    setQuestions([]); setReponses({}); setCurrentQ(0);
    setResultats(null); setError(""); setShowTags(false);
    setSuggestion(""); setSuggLoading(false);
    clearTimeout(suggTimerRef.current);
  };

  // ════════════════════════════════════════════════════════════
  // SOUS-COMPOSANTS DE RENDU
  // ════════════════════════════════════════════════════════════

  
  // ════════════════════════════════════════════════════════════
  // ÉCRANS
  // ════════════════════════════════════════════════════════════

  // ── ÉCRAN 1 : Formulaire d'amorce ───────────────────────────
  if (screen === SCREEN.AMORCE) return (
    <AnimatePresence mode="wait">
      <motion.div key="amorce" {...fadeIn} className={styles.container}
        dir={isRTL ? "rtl" : "ltr"} ref={topRef}>        <div className={styles.card}>
          <h3>{t('career.startCard')}</h3>

          <div className={styles.formGroup}>
            <label>{t('career.levelLabel')}</label>
            <select
              value={amorce.niveau}
              onChange={(e) => setAmorce({ ...amorce, niveau: e.target.value, filiere: "" })}
            >
              <option value="">{t('career.levelPlaceholder')}</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {FILIERES_BAC[amorce.niveau] && (
            <div className={styles.formGroup}>
              <label>{t('career.filiereLabel')}</label>
              <select
                value={amorce.filiere}
                onChange={(e) => setAmorce({ ...amorce, filiere: e.target.value })}
              >
                <option value="">{t('career.filierePlaceholder')}</option>
                {FILIERES_BAC[amorce.niveau].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>{t('career.descLabel')}</label>
            <textarea
              rows={4}
              placeholder={t('career.descPlaceholder')}
              value={amorce.description}
              maxLength={500}
              onChange={(e) => setAmorce({ ...amorce, description: e.target.value })}
            />
            <span className={styles.charCount}>{amorce.description.length}/500</span>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btnPrimary} onClick={handleAmorceSubmit}>
            {t('career.startBtn')}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  // ── ÉCRAN 2 : Loading questions ──────────────────────────────
  if (screen === SCREEN.LOADING_Q) return (
    <motion.div key="lq" {...fadeIn} className={styles.container} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <h3>{t('career.loadingQ')}</h3>
        <p>{t('career.loadingQSub')}</p>
      </div>
    </motion.div>
  );

  // ── ÉCRAN 3 : Questionnaire ───────────────────────────────────
  if (screen === SCREEN.QUESTIONNAIRE && questions.length > 0) {
    const q        = questions[currentQ];
    const pct      = Math.round(((currentQ + 1) / questions.length) * 100);
    const encourage = t('career.encouragements')[currentQ + 1];
    // Les tags sont directement dans q.tags — déjà prêts, zéro latence
    const currentTags = q.tags || [];

    return (
      <AnimatePresence mode="wait">
        <motion.div key={`q-${currentQ}`} {...fadeIn} className={styles.container}
          dir={isRTL ? "rtl" : "ltr"} ref={topRef}>          <div className={styles.header}><h2>{t('career.questionTitle')}</h2></div>

          {/* Barre de progression */}
          <div className={styles.progressWrapper}>
            <div className={styles.progressBar} style={{ width: `${pct}%` }} />
          </div>
          <p className={styles.progressLabel}>
            {isRTL
              ? `${questions.length} / ${currentQ + 1}`
              : `${currentQ + 1} / ${questions.length}`}
          </p>

          {encourage && <div className={styles.encouragement}>{encourage}</div>}

          <div className={`${styles.card} ${styles.questionCard}`}>
            <p className={styles.questionText}>{q.texte}</p>

            <textarea
              rows={5}
              placeholder={t('career.answerHere')}
              value={reponses[q.id] || ""}
              onChange={(e) => handleReponseChange(q.id, e.target.value)}
            />

            {/* ── Suggestion contextuelle (après 5s d'inactivité) ── */}
            <AnimatePresence>
              {(suggLoading || suggestion) && (
                <motion.div
                  className={styles.suggestionBox}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  {suggLoading ? (
                    <span className={styles.suggestionSpinner}>⏳</span>
                  ) : (
                    <>
                      <span className={styles.suggestionText}>💡 {suggestion}</span>
                      <button className={styles.tag} onClick={applySuggestion}>
                        {t('career.addSuggestion')}
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Bouton "Besoin d'inspiration ?" ─────────────── */}
            {/* Affiché uniquement si la question a des tags */}
            {currentTags.length > 0 && (
              <button className={styles.helpBtn} onClick={handleHelpClick}>
                {t('career.helpBtn')}
              </button>
            )}

            {/* ── Smart Tags — instantanés, déjà chargés ────────── */}
            <AnimatePresence>
              {showTags && currentTags.length > 0 && (
                <motion.div
                  className={styles.tagsGrid}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {currentTags.map((tag, i) => (
                    <button key={i} className={styles.tag} onClick={() => injectTag(tag)}>
                      {tag}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.navBtns}>
            <button className={styles.btnSecondary} onClick={handleBack}>{t('career.back')}</button>
            <button className={styles.btnPrimary} onClick={handleNext}>
              {currentQ < questions.length - 1 ? t('career.next') : t('career.finish')}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── ÉCRAN 4 : Loading analyse ─────────────────────────────────
  if (screen === SCREEN.LOADING_A) return (
    <motion.div key="la" {...fadeIn} className={styles.container} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <h3>{t('career.loadingA')}</h3>
        <p>{t('career.loadingASub')}</p>
      </div>
    </motion.div>
  );

  // ── ÉCRAN 5 : Dashboard (portails) ───────────────────────────
  if (screen === SCREEN.DASHBOARD && resultats) {
    const { message_intro } = resultats;
    return (
      <AnimatePresence mode="wait">
        <motion.div key="dashboard" {...fadeIn} className={styles.container}
          dir={isRTL ? "rtl" : "ltr"} ref={topRef}>
          <div className={styles.header}>
            <span className={styles.icon}>🌟</span>
            <h2>{t('career.resultTitle')}</h2>
          </div>

          {message_intro && (
            <motion.div
              className={styles.welcomeCard}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <TypeWriter text={message_intro} speed={22} />
            </motion.div>
          )}

          <div className={styles.portalsGrid}>
            {[
              {
                title:  t('career.portal1Title'),
                sub:    t('career.portal1Sub'),
                icon:   "🗺️",
                screen: SCREEN.PORTAL_CAREER,
                color:  "#7B2FBE",
              },
              {
                title:  t('career.portal2Title'),
                sub:    t('career.portal2Sub'),
                icon:   "🪞",
                screen: SCREEN.PORTAL_PSYCHO,
                color:  "#F5A623",
              },
            ].map((p, i) => (
              <motion.div
                key={p.screen}
                custom={i}
                variants={portalVariant}
                initial="initial"
                animate="animate"
                whileHover={{ scale: 1.04, boxShadow: `0 12px 40px ${p.color}44` }}
                className={styles.portalCard}
                style={{ "--portal-color": p.color }}
                onClick={() => setScreen(p.screen)}
              >
                <span className={styles.portalIcon}>{p.icon}</span>
                <h3>{p.title}</h3>
                <p>{p.sub}</p>
                <div className={styles.portalGlow} />
              </motion.div>
            ))}
          </div>

          <button className={styles.btnSecondary} onClick={handleRestart}>
            {t('career.restart')}
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── ÉCRAN 6 : Portail Carrière ────────────────────────────────
  if (screen === SCREEN.PORTAL_CAREER && resultats) {
    const { scores_radar = {}, top_filieres = [] } = resultats;

    return (
      <AnimatePresence mode="wait">
        <motion.div key="career" {...fadeIn} className={styles.container}
          dir={isRTL ? "rtl" : "ltr"} ref={topRef}>
          <button className={styles.backLink} onClick={() => setScreen(SCREEN.DASHBOARD)}>
            {t('career.backDashboard')}
          </button>
          <div className={styles.header}>
            <span className={styles.icon}>🗺️</span>
            <h2>{t('career.portal1Title')}</h2>
          </div>

          {Object.keys(scores_radar).length >= 3 && (
            <div className={styles.section}>
              <h3>{t('career.radarTitle')}</h3>
              <p className={styles.chartSub}>{t('career.radarSub')}</p>
              <RadarFilieres scores_radar={scores_radar} />
            </div>
          )}

          {top_filieres.length > 0 && (
            <div className={styles.section}>
              <h3>{t('career.top3Title')}</h3>
              {top_filieres.map((f, i) => (
                <motion.div
                  key={i}
                  className={styles.filiereCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                >
                  <div className={styles.filiereHeader}>
                    <span className={styles.rank}>#{i + 1}</span>
                    <h4>{f.filiere}</h4>
                    <span className={styles.score}>{f.score}%</span>
                  </div>

                  <div className={styles.filiereBarWrap}>
                    <motion.div
                      className={styles.filiereBar}
                      initial={{ width: 0 }}
                      animate={{ width: `${f.score}%` }}
                      transition={{ delay: i * 0.12 + 0.3, duration: 0.7 }}
                    />
                  </div>

                  {f.pourquoi && (
                    <p><strong>{t('career.pourquoi')}</strong> {f.pourquoi}</p>
                  )}
                  {f.realites_maroc && (
                    <p><strong>{t('career.realites')}</strong> {f.realites_maroc}</p>
                  )}
                  {f.parcours_detaille && (
                    <div className={styles.parcours}>
                      <p className={styles.parcoursTitle}>{t('career.parcoursTitle')}</p>
                      <p>{f.parcours_detaille}</p>
                    </div>
                  )}
                  {f.defi_personnel && (
                    <p><strong>{t('career.defi')}</strong> {f.defi_personnel}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── ÉCRAN 7 : Portail Psycho ─────────────────────────────────
  if (screen === SCREEN.PORTAL_PSYCHO && resultats) {
    const {
      dimensions_psycho    = {},
      forces_cachees       = [],
      croyances_limitantes = [],
      style_apprentissage,
      message_cloture,
    } = resultats;

    return (
      <AnimatePresence mode="wait">
        <motion.div key="psycho" {...fadeIn} className={styles.container}
          dir={isRTL ? "rtl" : "ltr"} ref={topRef}>
          <button className={styles.backLink} onClick={() => setScreen(SCREEN.DASHBOARD)}>
            {t('career.backDashboard')}
          </button>
          <div className={styles.header}>
            <span className={styles.icon}>🪞</span>
            <h2>{t('career.portal2Title')}</h2>
          </div>

          {Object.keys(dimensions_psycho).length >= 2 && (
            <div className={styles.section}>
              <h3>{t('career.barTitle')}</h3>
              <p className={styles.chartSub}>{t('career.barSub')}</p>
              <BarresDimensions dimensions_psycho={dimensions_psycho} />
            </div>
          )}

          {forces_cachees.length > 0 && (
            <motion.div
              className={styles.summaryCard}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4>{t('career.forcesTitle')}</h4>
              <ul>{forces_cachees.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </motion.div>
          )}

          {croyances_limitantes.length > 0 && (
            <motion.div
              className={`${styles.summaryCard} ${styles.limitingCard}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h4>{t('career.croyancesTitle')}</h4>
              <ul>{croyances_limitantes.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </motion.div>
          )}

          {style_apprentissage && (
            <motion.div
              className={styles.summaryCard}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h4>{t('career.styleTitle')}</h4>
              <p>{style_apprentissage}</p>
            </motion.div>
          )}

          {message_cloture && (
            <motion.div
              className={styles.clotureCard}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <p>{message_cloture}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
