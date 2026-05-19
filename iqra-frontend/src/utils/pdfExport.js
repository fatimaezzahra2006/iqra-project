// src/utils/pdfExport.js
// Système d'export PDF premium pour IQRA Study Plan
// Utilise jsPDF (https://github.com/parallax/jsPDF)
// Installation : npm install jspdf

// ══════════════════════════════════════════
// LABELS MULTILINGUES POUR LE PDF
// ══════════════════════════════════════════

const PDF_LABELS = {
  fr: {
    title:          "Plan de Rattrapage Personnalisé",
    subtitle:       "Généré par l'IA IQRA",
    scoreSection:   "Résultat du Mini-Défi",
    weekLabel:      "Semaine",
    sessionGoal:    "Objectif",
    actVideo:       "Vidéo",
    actExercice:    "Exercice",
    actChatbot:     "Chatbot IA",
    duration:       "Durée",
    moment:         "Moment idéal",
    why:            "Pourquoi",
    tip:            "Astuce",
    motivation:     "Motivation",
    adviceTitle:    "Conseils Personnalisés",
    iqraSection:    "Continue avec IQRA",
    iqraMsg:        "Accède aux vidéos courtes, exercices guidés et au chatbot IA directement sur la plateforme IQRA pour mettre ce plan en action.",
    checkbox:       "☐",
    checkedbox:     "☑",
    footer:         "Plan généré par IQRA · iqra.ma",
    pageOf:         "Page",
    of:             "sur",
    totalTime:      "Durée totale",
    weeklyTime:     "Temps par semaine",
    profile:        "Profil",
  },
  ar: {
    title:          "خطة الاستدراك الشخصية",
    subtitle:       "أنشأها الذكاء الاصطناعي IQRA",
    scoreSection:   "نتيجة التحدي الصغير",
    weekLabel:      "الأسبوع",
    sessionGoal:    "الهدف",
    actVideo:       "فيديو",
    actExercice:    "تمرين",
    actChatbot:     "دردشة ذكية",
    duration:       "المدة",
    moment:         "الوقت المثالي",
    why:            "لماذا",
    tip:            "نصيحة",
    motivation:     "تحفيز",
    adviceTitle:    "نصائح شخصية",
    iqraSection:    "واصل مع IQRA",
    iqraMsg:        "استفد من الفيديوهات القصيرة والتمارين الموجهة والدردشة الذكية مباشرة على منصة IQRA لتطبيق هذه الخطة.",
    checkbox:       "☐",
    checkedbox:     "☑",
    footer:         "خطة أنشأتها IQRA · iqra.ma",
    pageOf:         "صفحة",
    of:             "من",
    totalTime:      "المدة الإجمالية",
    weeklyTime:     "الوقت في الأسبوع",
    profile:        "الملف",
  },
  darija: {
    title:          "الخطة ديال الاستدراك",
    subtitle:       "درات ليها الـ IA ديال IQRA",
    scoreSection:   "نتيجة التحدي",
    weekLabel:      "الأسبوع",
    sessionGoal:    "الهدف",
    actVideo:       "فيديو",
    actExercice:    "تمرين",
    actChatbot:     "شات ذكي",
    duration:       "المدة",
    moment:         "الوقت المزيان",
    why:            "علاش",
    tip:            "نصيحة",
    motivation:     "تحفيز",
    adviceTitle:    "نصائح شخصية",
    iqraSection:    "كمل مع IQRA",
    iqraMsg:        "دير الفيديوهات القصيرة والتمارين والشات الذكي مباشرة فـ IQRA باش تطبق هاد الخطة.",
    checkbox:       "☐",
    checkedbox:     "☑",
    footer:         "خطة ديال IQRA · iqra.ma",
    pageOf:         "الصفحة",
    of:             "من",
    totalTime:      "المدة الكاملة",
    weeklyTime:     "الوقت فالأسبوع",
    profile:        "البروفيل",
  },
};

// ══════════════════════════════════════════
// TEMPLATES — Palettes de couleurs
// ══════════════════════════════════════════

export const PDF_TEMPLATES = [
  {
    id:          "minimal",
    name:        "Minimal Élégant",
    nameAr:      "بسيط وأنيق",
    nameDarija:  "بسيط ومزيان",
    description: "Lignes épurées, typographie sobre",
    emoji:       "◻️",
    colors: {
      primary:    [30, 30, 30],        // noir doux
      accent:     [123, 47, 190],      // violet IQRA
      bg:         [250, 250, 250],     // blanc cassé
      cardBg:     [255, 255, 255],
      cardBorder: [230, 230, 230],
      text:       [30, 30, 30],
      textLight:  [120, 120, 120],
      tagVideo:   [239, 246, 255],
      tagExo:     [240, 253, 244],
      tagBot:     [253, 244, 255],
      headerBar:  [30, 30, 30],
      headerText: [255, 255, 255],
      weekDot:    [123, 47, 190],
      weekDotText:[255, 255, 255],
      iqraBg:     [248, 244, 255],
      iqraBorder: [209, 182, 240],
    },
  },
  {
    id:          "academic",
    name:        "Academic Sombre",
    nameAr:      "الأكاديمي الداكن",
    nameDarija:  "الأكاديمي الداكن",
    description: "Sérieux, structuré, premium",
    emoji:       "📘",
    colors: {
      primary:    [15, 23, 42],        // slate-900
      accent:     [59, 130, 246],      // blue-500
      bg:         [248, 250, 252],
      cardBg:     [255, 255, 255],
      cardBorder: [203, 213, 225],
      text:       [15, 23, 42],
      textLight:  [100, 116, 139],
      tagVideo:   [239, 246, 255],
      tagExo:     [240, 249, 255],
      tagBot:     [245, 243, 255],
      headerBar:  [15, 23, 42],
      headerText: [255, 255, 255],
      weekDot:    [59, 130, 246],
      weekDotText:[255, 255, 255],
      iqraBg:     [239, 246, 255],
      iqraBorder: [147, 197, 253],
    },
  },
  {
    id:          "motivational",
    name:        "Motivationnel",
    nameAr:      "التحفيزي",
    nameDarija:  "ديال التحفيز",
    description: "Énergique, coloré, engageant",
    emoji:       "🔥",
    colors: {
      primary:    [124, 58, 237],      // violet-600
      accent:     [245, 166, 35],      // or IQRA
      bg:         [250, 247, 255],
      cardBg:     [255, 255, 255],
      cardBorder: [221, 214, 254],
      text:       [46, 16, 101],
      textLight:  [109, 40, 217],
      tagVideo:   [237, 233, 254],
      tagExo:     [254, 243, 199],
      tagBot:     [252, 231, 243],
      headerBar:  [124, 58, 237],
      headerText: [255, 255, 255],
      weekDot:    [245, 166, 35],
      weekDotText:[46, 16, 101],
      iqraBg:     [250, 247, 255],
      iqraBorder: [167, 139, 250],
    },
  },
];

// ══════════════════════════════════════════
// UTILITAIRES INTERNES
// ══════════════════════════════════════════

/**
 * Ajoute du texte avec retour à la ligne automatique.
 * Retourne la nouvelle valeur de y après le texte.
 */
function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 5) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/**
 * Dessine un rectangle arrondi (simulé avec des coins doux).
 */
function drawRoundRect(doc, x, y, w, h, r, fillColor, strokeColor) {
  doc.setFillColor(...fillColor);
  if (strokeColor) {
    doc.setDrawColor(...strokeColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, r, r, strokeColor ? "FD" : "F");
  } else {
    doc.roundedRect(x, y, w, h, r, r, "F");
  }
}

/**
 * Vérifie si on doit passer à une nouvelle page.
 * Retourne le nouveau y (avec nouvelle page si nécessaire).
 */
function checkPageBreak(doc, y, minSpace, pageHeight, margin, addFooterFn) {
  if (y + minSpace > pageHeight - margin) {
    addFooterFn(doc);
    doc.addPage();
    return margin + 10;
  }
  return y;
}

/**
 * Tag coloré pour le type d'activité.
 */
function drawTypeTag(doc, type, x, y, colors, labels) {
  const config = {
    video:    { color: colors.tagVideo,   text: labels.actVideo,    textColor: [37, 99, 235] },
    exercice: { color: colors.tagExo,     text: labels.actExercice, textColor: [22, 163, 74] },
    chatbot:  { color: colors.tagBot,     text: labels.actChatbot,  textColor: [147, 51, 234] },
  };
  const cfg = config[type] || config.video;

  doc.setFillColor(...cfg.color);
  doc.roundedRect(x, y - 3.5, 22, 5, 1, 1, "F");
  doc.setFontSize(6);
  doc.setTextColor(...cfg.textColor);
  doc.setFont("helvetica", "bold");
  doc.text(cfg.text, x + 11, y, { align: "center" });
  doc.setFont("helvetica", "normal");

  return x + 25;
}

// ══════════════════════════════════════════
// FONCTION PRINCIPALE D'EXPORT
// ══════════════════════════════════════════

/**
 * Génère et télécharge le PDF du plan d'étude.
 *
 * @param {Object} plan          - Données du plan (sessions, message_intro, etc.)
 * @param {Object} meta          - { filiereLabel, matiereLabel, totalHeures, score, quizLength, profilDetecte }
 * @param {string} templateId    - "minimal" | "academic" | "motivational"
 * @param {string} language      - "fr" | "ar" | "darija"
 * @param {Object[]} facteurs    - Facteurs psycho détectés
 */
export async function exportStudyPlanPDF(plan, meta, templateId = "minimal", language = "fr", facteurs = []) {
  // Import dynamique de jsPDF (évite de charger la lib si pas utilisée)
  const { jsPDF } = await import("jspdf");

  const template = PDF_TEMPLATES.find(t => t.id === templateId) || PDF_TEMPLATES[0];
  const colors   = template.colors;
  const labels   = PDF_LABELS[language] || PDF_LABELS.fr;
  const isRtl    = language === "ar" || language === "darija";

  // ── Init document ──
  const doc = new jsPDF({
    orientation: "portrait",
    unit:        "mm",
    format:      "a4",
  });

  const PAGE_W  = 210;
  const PAGE_H  = 297;
  const MARGIN  = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let   y       = MARGIN;

  // ══════════════════════════════════════════
  // FOOTER — affiché sur chaque page
  // ══════════════════════════════════════════
  const totalPages = [];  // jsPDF ne supporte pas nativement le total — on le simule

  const addFooter = (d) => {
    const pageNum = d.internal.getCurrentPageInfo().pageNumber;
    d.setFontSize(7);
    d.setTextColor(...colors.textLight);
    d.setFont("helvetica", "normal");
    d.text(labels.footer, PAGE_W / 2, PAGE_H - 8, { align: "center" });
    d.text(`${labels.pageOf} ${pageNum}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });

    // Ligne de séparation footer
    d.setDrawColor(...colors.cardBorder);
    d.setLineWidth(0.2);
    d.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
  };

  // ══════════════════════════════════════════
  // HEADER — Bannière principale
  // ══════════════════════════════════════════

  // Bande de couleur en haut
  doc.setFillColor(...colors.headerBar);
  doc.rect(0, 0, PAGE_W, 38, "F");

  // Logo IQRA
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.accent);
  doc.text("iq", MARGIN, 16);
  doc.setTextColor(...colors.headerText);
  doc.text("ra", MARGIN + 12, 16);

  // Titre
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.headerText);
  doc.text(labels.title, PAGE_W / 2, 14, { align: "center" });

  // Sous-titre
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.headerText);
  doc.setGState(doc.GState({ opacity: 0.75 }));
  doc.text(labels.subtitle, PAGE_W / 2, 20, { align: "center" });
  doc.setGState(doc.GState({ opacity: 1 }));

  // Méta-info dans la bande
  const metaText = `${meta.filiereLabel}  ·  ${meta.matiereLabel}  ·  ${meta.totalHeures}h`;
  doc.setFontSize(8);
  doc.setTextColor(...colors.headerText);
  doc.setGState(doc.GState({ opacity: 0.85 }));
  doc.text(metaText, PAGE_W / 2, 28, { align: "center" });
  doc.setGState(doc.GState({ opacity: 1 }));

  // Badge profil
  if (meta.profilDetecte) {
    const profilText = `${meta.profilDetecte.icon} ${meta.profilDetecte.label}`;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.headerText);
    doc.text(profilText, PAGE_W / 2, 35, { align: "center" });
  }

  y = 48;

  // ══════════════════════════════════════════
  // MESSAGE INTRO
  // ══════════════════════════════════════════
  if (plan.message_intro) {
    drawRoundRect(doc, MARGIN, y, CONTENT_W, 18, 2, colors.iqraBg, colors.iqraBorder);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...colors.text);
    y = addWrappedText(doc, `🧑‍🏫  ${plan.message_intro}`, MARGIN + 4, y + 6, CONTENT_W - 8, 5);
    y += 4;
  }

  // ══════════════════════════════════════════
  // SCORE MINI-DÉFI
  // ══════════════════════════════════════════
  if (meta.score !== null && meta.quizLength > 0) {
    y = checkPageBreak(doc, y, 22, PAGE_H, MARGIN, addFooter);

    drawRoundRect(doc, MARGIN, y, CONTENT_W, 16, 2, colors.cardBg, colors.cardBorder);

    // Badge score
    const badgeIcon = meta.score === meta.quizLength ? "🥇" : meta.score >= meta.quizLength * 0.6 ? "🥈" : "🥉";
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text(`${badgeIcon}  ${labels.scoreSection} : ${meta.score}/${meta.quizLength}`, MARGIN + 4, y + 7);

    // Barre de progression
    const pct     = meta.score / meta.quizLength;
    const barW    = CONTENT_W - 50;
    const barX    = MARGIN + 4;
    const barY    = y + 11;
    doc.setFillColor(...colors.cardBorder);
    doc.roundedRect(barX, barY, barW, 3, 1, 1, "F");
    doc.setFillColor(...colors.accent);
    doc.roundedRect(barX, barY, barW * pct, 3, 1, 1, "F");

    // Pourcentage
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.textLight);
    doc.text(`${Math.round(pct * 100)}%`, barX + barW + 3, barY + 3);

    y += 22;
  }

  // ══════════════════════════════════════════
  // SESSIONS
  // ══════════════════════════════════════════

  plan.sessions?.forEach((session, si) => {
    y = checkPageBreak(doc, y, 35, PAGE_H, MARGIN, addFooter);

    // ── En-tête de session ──
    // Point numéroté
    doc.setFillColor(...colors.weekDot);
    doc.circle(MARGIN + 5, y + 5, 5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.weekDotText);
    doc.text(String(si + 1), MARGIN + 5, y + 7, { align: "center" });

    // Label semaine
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text(`${labels.weekLabel} ${session.semaine}`, MARGIN + 13, y + 5);

    // Objectif
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.textLight);
    y = addWrappedText(doc, session.objectif || "", MARGIN + 13, y + 10, CONTENT_W - 15, 4.5);

    // Message de session
    if (session.message_session) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...colors.accent);
      y = addWrappedText(doc, `✦ ${session.message_session}`, MARGIN + 13, y + 1, CONTENT_W - 15, 4);
    }

    y += 4;

    // Ligne de séparation légère
    doc.setDrawColor(...colors.cardBorder);
    doc.setLineWidth(0.15);
    doc.line(MARGIN + 12, y, PAGE_W - MARGIN, y);
    y += 3;

    // ── Activités ──
    session.activites?.forEach((act, ai) => {
      y = checkPageBreak(doc, y, 28, PAGE_H, MARGIN, addFooter);

      const cardH = computeActivityHeight(doc, act, CONTENT_W - 10, labels);

      // Fond de la carte
      drawRoundRect(doc, MARGIN + 2, y, CONTENT_W - 2, cardH, 2, colors.cardBg, colors.cardBorder);

      // Checkbox
      doc.setFontSize(9);
      doc.setTextColor(...colors.textLight);
      doc.text(labels.checkbox, MARGIN + 5, y + 7);

      // Tag type
      const tagEndX = drawTypeTag(doc, act.type, MARGIN + 11, y + 6, colors, labels);

      // Durée
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.textLight);
      doc.text(`⏱ ${act.duree}`, PAGE_W - MARGIN - 4, y + 6, { align: "right" });

      // Titre de l'activité
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.text);
      let actY = addWrappedText(doc, act.titre || "Activité", MARGIN + 11, y + 13, CONTENT_W - 25, 5);

      // Détails (moment, pourquoi, astuce, motivation)
      const details = [
        act.moment    && { icon: "🕐", label: labels.moment,     text: act.moment },
        act.pourquoi  && { icon: "❓", label: labels.why,         text: act.pourquoi },
        act.astuce    && { icon: "💡", label: labels.tip,         text: act.astuce },
        act.motivation && { icon: "⚡", label: labels.motivation, text: act.motivation, italic: true },
      ].filter(Boolean);

      details.forEach(d => {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.textLight);
        doc.text(`${d.label} :`, MARGIN + 11, actY + 2);

        doc.setFont("helvetica", d.italic ? "italic" : "normal");
        doc.setTextColor(...colors.text);
        actY = addWrappedText(doc, d.text, MARGIN + 30, actY + 2, CONTENT_W - 35, 4);
        actY += 1;
      });

      y += cardH + 3;
    });

    y += 5;
  });

  // ══════════════════════════════════════════
  // CONSEILS FINAUX
  // ══════════════════════════════════════════
  if (plan.conseils_finaux?.length > 0) {
    y = checkPageBreak(doc, y, 30, PAGE_H, MARGIN, addFooter);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text(`💡 ${labels.adviceTitle}`, MARGIN, y);
    y += 6;

    plan.conseils_finaux.forEach((conseil, i) => {
      y = checkPageBreak(doc, y, 14, PAGE_H, MARGIN, addFooter);

      // Bullet coloré
      doc.setFillColor(...colors.accent);
      doc.circle(MARGIN + 2, y + 1, 1.2, "F");

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.text);
      y = addWrappedText(doc, conseil, MARGIN + 6, y + 2, CONTENT_W - 8, 4.5);
      y += 2;
    });

    y += 4;
  }

  // ══════════════════════════════════════════
  // BLOC IQRA (naturel, pas publicitaire)
  // ══════════════════════════════════════════
  y = checkPageBreak(doc, y, 28, PAGE_H, MARGIN, addFooter);

  drawRoundRect(doc, MARGIN, y, CONTENT_W, 24, 3, colors.iqraBg, colors.iqraBorder);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  doc.text(`🚀 ${labels.iqraSection}`, MARGIN + 4, y + 7);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.text);
  addWrappedText(doc, labels.iqraMsg, MARGIN + 4, y + 13, CONTENT_W - 8, 4.5);

  // Features inline
  const features = ["📹 Vidéos < 5 min", "✍️ Exercices guidés", "🤖 Chatbot 24h/24", "⭐ Système de points"];
  let fx = MARGIN + 4;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.accent);
  features.forEach(f => {
    doc.text(f, fx, y + 22);
    fx += 46;
  });

  y += 28;

  // ══════════════════════════════════════════
  // MESSAGE DE CLÔTURE
  // ══════════════════════════════════════════
  if (plan.message_cloture) {
    y = checkPageBreak(doc, y, 16, PAGE_H, MARGIN, addFooter);

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...colors.accent);
    doc.setGState(doc.GState({ opacity: 0.9 }));
    addWrappedText(doc, `🎯 ${plan.message_cloture}`, MARGIN, y + 4, CONTENT_W, 5);
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  // ── Footer dernière page ──
  addFooter(doc);

  // ══════════════════════════════════════════
  // SAUVEGARDE
  // ══════════════════════════════════════════
  const filename = `IQRA_Plan_${meta.matiereLabel.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`;
  doc.save(filename);
}

// ══════════════════════════════════════════
// HELPER — calcul hauteur d'une activité
// (pour éviter les coupures en milieu de carte)
// ══════════════════════════════════════════

function computeActivityHeight(doc, act, maxWidth, labels) {
  let h = 18; // base : checkbox + tag + titre

  const details = [
    act.moment,
    act.pourquoi,
    act.astuce,
    act.motivation,
  ].filter(Boolean);

  details.forEach(text => {
    const lines = doc.splitTextToSize(text, maxWidth - 25);
    h += lines.length * 4 + 3;
  });

  return Math.max(h, 20);
}