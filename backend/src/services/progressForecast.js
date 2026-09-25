// Simple linear-trend forecast para sa treatment goals.
//
// Algorithm: ordinary least-squares linear regression ng measurement value
// laban sa session order (0, 1, 2, ...), tapos i-extrapolate papunta sa
// target ng goal. Sinadya itong plain at explainable na statistical
// technique (hindi trained ML model) - madaling ipaliwanag sa thesis, at
// sapat na sa maliit at medyo maingay na sample size na meron talaga ang
// isang clinic (di gaya ng malaking dataset na kailangan ng "totoong" ML).
//
// Kailangan ng at least 3 data points bago tumingin ng trend, at kailangang
// gumagalaw papunta sa target ang slope bago tayo mag-estimate - kung hindi,
// mas tapat na sabihing "wala pang malinaw na trend" kesa magbigay ng
// maling-confident na estimate.

const MIN_POINTS = 3;
const MAX_SESSIONS_REMAINING = 40; // lagpas dito, hindi na meaningful ang precision

function linearRegression(points) {
  // points: [{ x, y }], x = 0-based session order
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null; // parehong x lahat (di dapat mangyari, pero safe guard)
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function averageDayGap(dates) {
  if (dates.length < 2) return null;
  const first = dates[0].getTime();
  const last = dates[dates.length - 1].getTime();
  const gapDays = (last - first) / (1000 * 60 * 60 * 24) / (dates.length - 1);
  return gapDays > 0 ? gapDays : null;
}

// goal: { target, direction }. measurements: sorted ASC by session_date,
// bawat isa may { value, session_date }.
function forecastGoal(goal, measurements) {
  if (!Array.isArray(measurements) || measurements.length < MIN_POINTS) {
    return { forecast: null, note: "Log a couple more sessions to see a projection." };
  }

  const target = Number(goal.target);
  const currentValue = Number(measurements[measurements.length - 1].value);
  const alreadyThere =
    goal.direction === "decrease" ? currentValue <= target : currentValue >= target;
  if (alreadyThere) {
    return { forecast: null, note: "Target already reached." };
  }

  const points = measurements.map((m, index) => ({ x: index, y: Number(m.value) }));
  const fit = linearRegression(points);
  if (!fit || fit.slope === 0) {
    return { forecast: null, note: "Not enough of a trend yet." };
  }

  const movingTowardTarget = goal.direction === "decrease" ? fit.slope < 0 : fit.slope > 0;
  if (!movingTowardTarget) {
    return { forecast: null, note: "Recent sessions aren't trending toward the target yet." };
  }

  const gapToTarget = goal.direction === "decrease" ? currentValue - target : target - currentValue;
  const perSessionMovement = Math.abs(fit.slope);
  const sessionsRemaining = Math.ceil(gapToTarget / perSessionMovement);

  if (!Number.isFinite(sessionsRemaining) || sessionsRemaining <= 0) {
    return { forecast: null, note: "Not enough of a trend yet." };
  }
  if (sessionsRemaining > MAX_SESSIONS_REMAINING) {
    return { forecast: null, note: "Trending the right way, but it's too early to estimate a timeline." };
  }

  const dates = measurements.map((m) => new Date(m.session_date));
  const avgGapDays = averageDayGap(dates);
  const lastDate = dates[dates.length - 1];
  const projectedDate =
    avgGapDays !== null
      ? new Date(lastDate.getTime() + sessionsRemaining * avgGapDays * 24 * 60 * 60 * 1000)
      : null;

  return {
    forecast: {
      sessions_remaining: sessionsRemaining,
      projected_date: projectedDate ? projectedDate.toISOString().slice(0, 10) : null,
      method: "linear-trend",
      sample_size: measurements.length,
    },
    note: null,
  };
}

module.exports = { forecastGoal };
