import { CATEGORIES } from './checks.js';
import { letterGrade, gradeLabel, gradeColor, clamp } from './util.js';

const MULTIPLIER = { pass: 1, warn: 0.5, fail: 0, error: 0 };

export function scoreResults(results) {
  const counted = results.filter((r) => r.status !== 'skipped' && r.status !== 'info');
  const counts = {
    pass: results.filter((r) => r.status === 'pass').length,
    warn: results.filter((r) => r.status === 'warn').length,
    fail: results.filter((r) => r.status === 'fail').length,
    info: results.filter((r) => r.status === 'info').length,
    error: results.filter((r) => r.status === 'error').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    total: results.length,
  };

  const categories = Object.entries(CATEGORIES).map(([key, meta]) => {
    const checks = results.filter((r) => r.category === key && r.status !== 'skipped' && r.status !== 'info');
    const possible = checks.reduce((sum, r) => sum + r.weight, 0);
    const earned = checks.reduce((sum, r) => sum + r.weight * (MULTIPLIER[r.status] ?? 0), 0);
    return {
      key,
      label: meta.label,
      short: meta.short,
      blurb: meta.blurb,
      weight: meta.weight,
      checks,
      possible,
      earned,
      score: possible ? Math.round((earned / possible) * 100) : null,
      counts: {
        pass: checks.filter((r) => r.status === 'pass').length,
        warn: checks.filter((r) => r.status === 'warn').length,
        fail: checks.filter((r) => r.status === 'fail' || r.status === 'error').length,
      },
    };
  });

  const scoredCategories = categories.filter((c) => c.score !== null);
  const totalWeight = scoredCategories.reduce((sum, c) => sum + c.weight, 0);
  const score = totalWeight
    ? Math.round(scoredCategories.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight)
    : 0;

  const grade = letterGrade(score);
  const topFixes = results
    .filter((r) => r.status === 'fail' || r.status === 'warn' || r.status === 'error')
    .map((r) => {
      const cat = CATEGORIES[r.category];
      const category = categories.find((c) => c.key === r.category);
      const possible = Math.max(category?.possible || 1, 1);
      const severity = r.status === 'fail' || r.status === 'error' ? 3 : 2;
      const impact = (r.weight / possible) * (cat?.weight || 1) * (severity === 3 ? 1 : 0.5);
      return { ...r, impact: Number(impact.toFixed(2)), severity };
    })
    .sort((a, b) => b.severity - a.severity || b.impact - a.impact);

  return {
    score: clamp(score, 0, 100),
    grade,
    label: gradeLabel(score),
    color: gradeColor(grade),
    counts,
    categories,
    topFixes,
    results,
    scoredChecks: counted.length,
  };
}

export function compactSummary(scored, url) {
  return {
    url,
    grade: scored.grade,
    score: scored.score,
    label: scored.label,
    counts: scored.counts,
    categories: scored.categories.map((c) => ({ key: c.key, label: c.label, score: c.score, weight: c.weight })),
    topFixes: scored.topFixes.slice(0, 8).map((f) => ({ id: f.id, status: f.status, title: f.title, detail: f.detail, fix: f.fix, impact: f.impact })),
  };
}
