import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./SmartHome.css";

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

function SmartModule() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    { id: "study",  icon: "📚", cls: "smart-home__card-icon--study",  title: t("smart.study_title"),  desc: t("smart.study_desc") },
    { id: "gap",    icon: "🔍", cls: "smart-home__card-icon--gap",    title: t("smart.gap_title"),    desc: t("smart.gap_desc") },
    { id: "career", icon: "🎯", cls: "smart-home__card-icon--career", title: t("smart.career_title"), desc: t("smart.career_desc") },
  ];

  return (
    <div className="smart-home">
      <div className="smart-home__inner">
        <div className="smart-home__hero">
          <span className="smart-home__badge">{t("smart.badge")}</span>
          <h1 className="smart-home__title">
            {t("smart.title")}<br /><span>{t("smart.title_span")}</span>
          </h1>
          <p className="smart-home__sub">{t("smart.sub")}</p>
        </div>

        <div className="smart-home__cards">
          {features.map(f => (
            <div key={f.id} className="smart-home__card"
              onClick={() => navigate(`/smart/${f.id}`)}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/smart/${f.id}`)}
            >
              <div className={`smart-home__card-icon ${f.cls}`}>{f.icon}</div>
              <div className="smart-home__card-body">
                <p className="smart-home__card-title">{f.title}</p>
                <p className="smart-home__card-desc">{f.desc}</p>
              </div>
              <div className="smart-home__card-arrow"><ArrowIcon /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SmartModule;
