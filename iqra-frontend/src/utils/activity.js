/**
 * activity.js — Save/read user activity in localStorage for Dashboard stats
 */

const KEY = 'iqra_activity';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...data, lastActivity: new Date().toISOString() })); }
  catch { /* quota */ }
}

/** Save a completed study plan */
export function saveStudyPlan({ matiere, niveau, weeks }) {
  const d = load();
  const plans = d.studyPlans || [];
  plans.unshift({ matiere, niveau, weeks, progress: 0, createdAt: new Date().toISOString() });
  save({ ...d, studyPlans: plans.slice(0, 10) }); // keep last 10
}

/** Save a visual learning session */
export function saveVisualSession({ title, matiere }) {
  const d = load();
  const sessions = d.visualSessions || [];
  sessions.unshift({ title, matiere, date: new Date().toISOString() });
  save({ ...d, visualSessions: sessions.slice(0, 20) }); // keep last 20
}

/** Save career advisor result */
export function saveCareerResult(result) {
  const d = load();
  const top = result?.filières_recommandées?.[0];
  save({
    ...d,
    careerDone: true,
    careerResult: {
      top_field:  top?.filière  || top?.nom || '—',
      score:      top?.score    || top?.compatibilite || '—',
      strengths:  result?.forces_cachées?.slice(0, 3) || [],
    },
  });
}
