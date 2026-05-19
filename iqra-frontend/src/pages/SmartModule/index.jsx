import React, { useState } from "react";
import StudyPlan from "./StudyPlan";
import GapAnalyzer from "./GapAnalyzer";
import CareerAdvisor from "./CareerAdvisor";
import "./SmartModule.css";

function SmartModule() {
  const [activeFeature, setActiveFeature] = useState(null);

  if (activeFeature === "study") return <StudyPlan onBack={() => setActiveFeature(null)} />;
  if (activeFeature === "gap") return <GapAnalyzer onBack={() => setActiveFeature(null)} />;
  if (activeFeature === "career") return <CareerAdvisor onBack={() => setActiveFeature(null)} />;

  return (
    <div className="smart-container">
      <h1>🧠 Smart Module IQRA</h1>
      <p className="smart-subtitle">Choisissez une fonctionnalité IA</p>

      <div className="smart-cards">

        <div className="smart-card" onClick={() => setActiveFeature("study")}>
          <div className="card-icon">📚</div>
          <h2>مخطط الدراسة الذكي</h2>
          <p>Plan de Rattrapage Intelligent</p>
          <button className="card-btn">Commencer →</button>
        </div>

        <div className="smart-card" onClick={() => setActiveFeature("gap")}>
          <div className="card-icon">🔍</div>
          <h2>محلل الفجوات المعرفية</h2>
          <p>Analyseur de Lacunes</p>
          <button className="card-btn">Commencer →</button>
        </div>

        <div className="smart-card" onClick={() => setActiveFeature("career")}>
          <div className="card-icon">🎯</div>
          <h2>مستشار المسار المهني</h2>
          <p>Conseiller d'Orientation</p>
          <button className="card-btn">Commencer →</button>
        </div>

      </div>
    </div>
  );
}

export default SmartModule;