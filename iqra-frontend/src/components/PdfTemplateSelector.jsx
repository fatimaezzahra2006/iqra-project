// src/components/PdfTemplateSelector.jsx
import { useState } from "react";
import { PDF_TEMPLATES } from "../utils/pdfExport";
import "./PdfTemplateSelector.css";

// ══════════════════════════════════════════
// LABELS MULTILINGUES
// ══════════════════════════════════════════
const LABELS = {
  fr: {
    title:       "Choisir le style du PDF",
    subtitle:    "Sélectionne le design avant d'exporter ton plan",
    preview:     "Aperçu",
    export:      "Exporter en PDF",
    cancel:      "Annuler",
    generating:  "Génération en cours...",
    templateName: { minimal: "Minimal Élégant", academic: "Academic Sombre", motivational: "Motivationnel" },
    templateDesc: {
      minimal:      "Lignes épurées, typographie sobre",
      academic:     "Sérieux, structuré, premium",
      motivational: "Énergique, coloré, engageant",
    },
  },
  ar: {
    title:       "اختر نمط PDF",
    subtitle:    "اختر التصميم قبل تصدير خطتك",
    preview:     "معاينة",
    export:      "تصدير PDF",
    cancel:      "إلغاء",
    generating:  "جاري الإنشاء...",
    templateName: { minimal: "بسيط وأنيق", academic: "الأكاديمي الداكن", motivational: "التحفيزي" },
    templateDesc: {
      minimal:      "تصميم نظيف وأنيق",
      academic:     "جدي، منظم، احترافي",
      motivational: "نشيط، ملون، جذاب",
    },
  },
  darija: {
    title:       "اختار النمط ديال PDF",
    subtitle:    "اختار التصميم قبل ما تصدر الخطة ديالك",
    preview:     "معاينة",
    export:      "صدر PDF",
    cancel:      "إلغاء",
    generating:  "كيتحضر...",
    templateName: { minimal: "بسيط ومزيان", academic: "الأكاديمي الداكن", motivational: "ديال التحفيز" },
    templateDesc: {
      minimal:      "تصميم بسيط ونظيف",
      academic:     "جدي، منظم، احترافي",
      motivational: "نشيط، ملون، كيحمس",
    },
  },
};

// ══════════════════════════════════════════
// MINI PREVIEW — aperçu visuel du template
// ══════════════════════════════════════════
function TemplatePreview({ template }) {
  const c = template.colors;
  const rgb = (arr) => `rgb(${arr.join(",")})`;

  return (
    <div className="pts-preview-wrap">
      {/* Header simulé */}
      <div
        className="pts-prev-header"
        style={{ backgroundColor: rgb(c.headerBar) }}
      >
        <span style={{ color: rgb(c.accent), fontWeight: 700, fontSize: 8 }}>iq</span>
        <span style={{ color: rgb(c.headerText), fontWeight: 700, fontSize: 8 }}>ra</span>
        <div className="pts-prev-title-block">
          <div className="pts-prev-line long" style={{ backgroundColor: rgb(c.headerText) }} />
          <div className="pts-prev-line medium" style={{ backgroundColor: rgb(c.headerText), opacity: 0.6 }} />
        </div>
      </div>

      {/* Corps simulé */}
      <div className="pts-prev-body" style={{ backgroundColor: rgb(c.bg) }}>
        {/* Score badge */}
        <div className="pts-prev-card" style={{ backgroundColor: rgb(c.cardBg), borderColor: rgb(c.cardBorder) }}>
          <div className="pts-prev-dot" style={{ backgroundColor: rgb(c.accent) }} />
          <div className="pts-prev-lines">
            <div className="pts-prev-line long" style={{ backgroundColor: rgb(c.primary) }} />
            <div className="pts-prev-bar-wrap">
              <div className="pts-prev-bar-bg" style={{ backgroundColor: rgb(c.cardBorder) }} />
              <div className="pts-prev-bar-fill" style={{ backgroundColor: rgb(c.accent), width: "65%" }} />
            </div>
          </div>
        </div>

        {/* Session simulée */}
        <div className="pts-prev-session">
          <div className="pts-prev-week-dot" style={{ backgroundColor: rgb(c.weekDot) }}>
            <span style={{ color: rgb(c.weekDotText), fontSize: 6 }}>1</span>
          </div>
          <div className="pts-prev-session-lines">
            <div className="pts-prev-line medium" style={{ backgroundColor: rgb(c.primary) }} />
            <div className="pts-prev-line short" style={{ backgroundColor: rgb(c.textLight) }} />
          </div>
        </div>

        {/* Activité simulée */}
        <div className="pts-prev-activity" style={{ backgroundColor: rgb(c.cardBg), borderColor: rgb(c.cardBorder) }}>
          <div className="pts-prev-tag" style={{ backgroundColor: rgb(c.tagVideo) }} />
          <div className="pts-prev-act-lines">
            <div className="pts-prev-line medium" style={{ backgroundColor: rgb(c.text) }} />
            <div className="pts-prev-line long" style={{ backgroundColor: rgb(c.textLight), opacity: 0.5 }} />
          </div>
        </div>

        {/* IQRA bloc simulé */}
        <div className="pts-prev-iqra" style={{ backgroundColor: rgb(c.iqraBg), borderColor: rgb(c.iqraBorder) }}>
          <div className="pts-prev-line medium" style={{ backgroundColor: rgb(c.primary) }} />
          <div className="pts-prev-line long" style={{ backgroundColor: rgb(c.textLight), opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════
export default function PdfTemplateSelector({ onExport, onClose, language = "fr", isGenerating = false }) {
  const [selected, setSelected] = useState("minimal");
  const lbl = LABELS[language] || LABELS.fr;
  const isRtl = language === "ar" || language === "darija";

  const getTemplateName = (t) => lbl.templateName[t.id] || t.name;
  const getTemplateDesc = (t) => lbl.templateDesc[t.id] || t.description;

  return (
    <div className="pts-overlay" onClick={onClose}>
      <div
        className="pts-modal"
        dir={isRtl ? "rtl" : "ltr"}
        onClick={e => e.stopPropagation()}
      >
        {/* ── En-tête ── */}
        <div className="pts-modal-header">
          <div>
            <h2 className="pts-modal-title">🎨 {lbl.title}</h2>
            <p className="pts-modal-subtitle">{lbl.subtitle}</p>
          </div>
          <button className="pts-close-btn" onClick={onClose} disabled={isGenerating}>✕</button>
        </div>

        {/* ── Grille de templates ── */}
        <div className="pts-templates-grid">
          {PDF_TEMPLATES.map(template => {
            const isSelected = selected === template.id;
            const c = template.colors;
            const rgb = (arr) => `rgb(${arr.join(",")})`;

            return (
              <div
                key={template.id}
                className={`pts-template-card ${isSelected ? "selected" : ""}`}
                style={isSelected ? {
                  borderColor: rgb(c.accent),
                  boxShadow:   `0 0 0 2px ${rgb(c.accent)}33`,
                } : {}}
                onClick={() => setSelected(template.id)}
              >
                {/* Aperçu visuel */}
                <TemplatePreview template={template} />

                {/* Infos */}
                <div className="pts-template-info">
                  <div className="pts-template-name-row">
                    <span className="pts-template-emoji">{template.emoji}</span>
                    <span className="pts-template-name">{getTemplateName(template)}</span>
                    {isSelected && (
                      <span
                        className="pts-selected-badge"
                        style={{ backgroundColor: rgb(c.accent) }}
                      >✓</span>
                    )}
                  </div>
                  <p className="pts-template-desc">{getTemplateDesc(template)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Actions ── */}
        <div className="pts-actions">
          <button
            className="pts-btn-cancel"
            onClick={onClose}
            disabled={isGenerating}
          >
            {lbl.cancel}
          </button>
          <button
            className="pts-btn-export"
            onClick={() => onExport(selected)}
            disabled={isGenerating}
            style={{
              backgroundColor: PDF_TEMPLATES.find(t => t.id === selected)?.colors.accent
                ? `rgb(${PDF_TEMPLATES.find(t => t.id === selected).colors.accent.join(",")})`
                : "#7B2FBE",
            }}
          >
            {isGenerating ? (
              <span className="pts-generating">
                <span className="pts-spinner" />
                {lbl.generating}
              </span>
            ) : (
              `⬇️ ${lbl.export}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}