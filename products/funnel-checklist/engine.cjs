'use strict';
function summarize(checks, answers) {
  const value = {yes: 2, partial: 1, no: 0, unknown: 0};
  const stages = [...new Set(checks.map(c => c.stage))].map(stage => {
    const rows = checks.filter(c => c.stage === stage);
    const points = rows.reduce((n,c) => n + (value[answers[c.id]?.status] || 0), 0);
    const assessed = rows.filter(c => ['yes','partial','no'].includes(answers[c.id]?.status)).length;
    return {stage, points, maximum: rows.length * 2, assessed, count: rows.length};
  });
  const rank = {no: 0, unknown: 1, partial: 2, yes: 3};
  const priorities = checks.filter(c => answers[c.id]?.status !== 'yes').sort((a,b) =>
    (rank[answers[a.id]?.status || 'unknown'] ?? 1) - (rank[answers[b.id]?.status || 'unknown'] ?? 1)).slice(0,3);
  return {stages, priorities, score: Math.round(stages.reduce((n,s)=>n+s.points,0) / (checks.length*2) * 100), assessed: stages.reduce((n,s)=>n+s.assessed,0)};
}
function sanitize(checks, input) {
  const result = {};
  for (const c of checks) {
    const row = input?.[c.id];
    result[c.id] = {status: ['yes','partial','no','unknown'].includes(row?.status) ? row.status : 'unknown', note: typeof row?.note === 'string' ? row.note.slice(0,600) : ''};
  }
  return result;
}
if (typeof module !== 'undefined') module.exports = {summarize,sanitize};
