import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const aiRoot = path.resolve(__dirname, '../../../ai-engine');
const venvPython =
  process.env.PYTHON_PATH ||
  (process.platform === 'win32' ? 'python' : 'python3');
const FASTAPI_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';

/**
 * Compare two images via DINOv2 visual embeddings.
 * Tries FastAPI HTTP first, falls back to Python CLI bridge.
 */
export async function compareImagesWithDinov2(imagePathA, imagePathB, threshold = 0.80) {
  // 1. Attempt FastAPI HTTP endpoint if online
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${FASTAPI_URL}/ai/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        image_a_path: imagePathA,
        image_b_path: imagePathB,
        threshold: String(threshold),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        similarity: data.similarity,
        is_visually_similar: data.is_visually_similar,
        model: data.model,
      };
    }
  } catch (_fastApiErr) {
    // FastAPI server not listening or timed out — seamlessly fallback to CLI bridge
  }

  // 2. Python CLI fallback
  return new Promise((resolve, reject) => {
    const args = [
      'main.py',
      '--model',
      'similarity',
      '--image',
      imagePathA,
      '--compare-image',
      imagePathB,
    ];

    const pythonProcess = spawn(venvPython, args, {
      cwd: aiRoot,
      env: {
        ...process.env,
        PYTHONPATH: aiRoot,
      },
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    pythonProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `CLI failed with exit code ${code}`));
      }
      try {
        const payload = JSON.parse(stdout);
        resolve({
          similarity: payload.similarity ?? 0,
          is_visually_similar: payload.is_visually_similar ?? false,
          model: payload.model || 'facebook/dinov2-base',
        });
      } catch (err) {
        reject(new Error(`Failed to parse CLI output: ${stdout}`));
      }
    });
  });
}

/**
 * Evaluate multimodal evidence strength score (0-100) via FastAPI.
 */
export async function evaluateEvidenceStrength(text, imagePath = null) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${FASTAPI_URL}/ai/evidence/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        image_path: imagePath || null,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[AI Bridge] Evidence evaluation via FastAPI failed:', err.message);
  }

  // Graceful fallback if AI engine is momentarily unreachable
  return {
    success: false,
    evidence_strength: 0,
    interpretation: 'Unavailable',
    explanation: ['AI Engine unreachable for real-time evidence evaluation'],
  };
}

/**
 * Calculate Transparent AI-Assisted Priority Score (0-100) and Level.
 * Tries FastAPI /ai/priority first, falls back to deterministic local JS formula.
 */
export async function calculatePriority(input = {}) {
  const payload = {
    severity: input.severity != null ? Number(input.severity) : (input.officer_report?.severity != null ? Number(input.officer_report.severity) : null),
    evidence_strength: input.evidence_strength != null ? Number(input.evidence_strength) : (input.evidence_analysis?.evidence_strength != null ? Number(input.evidence_analysis.evidence_strength) : null),
    support_count: Array.isArray(input.supports) ? input.supports.length : (input.support_count != null ? Number(input.support_count) : 0),
    criticality: input.criticality ?? null,
    created_at: input.created_at || null,
    recent_supports: input.recent_supports ?? null,
    weights: input.weights || null,
    support_cap: input.support_cap ?? 20,
    duration_cap_days: input.duration_cap_days ?? 30,
  };

  // 1. Attempt FastAPI HTTP endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${FASTAPI_URL}/ai/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        source: 'fastapi',
      };
    }
  } catch (err) {
    console.warn('[AI Bridge] Priority calculation via FastAPI failed, using local engine:', err.message);
  }

  // 2. Local Deterministic Fallback Engine (identical formula & rules)
  const weights = payload.weights || {
    severity: 0.30,
    evidence: 0.20,
    community: 0.20,
    criticality: 0.15,
    duration: 0.10,
    growth: 0.05,
  };

  const explanations = [];

  // Severity (30%)
  let s_sev = 0.60;
  if (payload.severity != null && !isNaN(payload.severity)) {
    const clampedSev = Math.max(1, Math.min(5, Math.round(payload.severity)));
    s_sev = clampedSev / 5.0;
    const sevLabels = { 1: 'Very Low (1/5)', 2: 'Low (2/5)', 3: 'Moderate (3/5)', 4: 'High (4/5)', 5: 'Critical (5/5)' };
    explanations.push(`Field-verified severity: ${sevLabels[clampedSev] || clampedSev + '/5'}`);
  } else {
    explanations.push('Field verification pending; default moderate severity baseline (3/5) applied');
  }

  // Evidence Strength (20%)
  let s_evi = 0.50;
  if (payload.evidence_strength != null && !isNaN(payload.evidence_strength)) {
    const clampedEvi = Math.max(0, Math.min(100, payload.evidence_strength));
    s_evi = clampedEvi / 100.0;
    explanations.push(`Supporting evidence strength: ${Math.round(clampedEvi)}/100`);
  } else {
    explanations.push('Multimodal evidence analysis pending; neutral baseline (50/100) applied');
  }

  // Community Support (20%)
  const rawSupport = Math.max(0, payload.support_count || 0);
  const supportCap = Math.max(1, payload.support_cap || 20);
  const s_com = Math.min(1.0, rawSupport / supportCap);
  if (rawSupport === 0) {
    explanations.push('No additional citizen endorsements recorded yet');
  } else if (rawSupport >= supportCap) {
    explanations.push(`High community endorsement: ${rawSupport} citizen supporters (capped at ${supportCap})`);
  } else {
    explanations.push(`${rawSupport} citizen supporters endorsed this issue (${Math.round(s_com * 100)}% of cap)`);
  }

  // Criticality (15%)
  let s_cri = 0.20;
  if (payload.criticality != null) {
    if (typeof payload.criticality === 'number') {
      const val = payload.criticality > 1.0 ? payload.criticality / 100.0 : payload.criticality;
      s_cri = Math.max(0.0, Math.min(1.0, val));
      explanations.push(`Infrastructure criticality score: ${Math.round(s_cri * 100)}/100`);
    } else if (typeof payload.criticality === 'string') {
      const levelMap = { critical: 1.0, high: 0.8, medium: 0.5, moderate: 0.5, low: 0.25, none: 0.10 };
      s_cri = levelMap[payload.criticality.toLowerCase().trim()] || 0.30;
      explanations.push(`Zone criticality rated as ${payload.criticality.toUpperCase()}`);
    } else if (typeof payload.criticality === 'object') {
      const LANDMARK_WEIGHTS = { hospital: 0.35, school: 0.30, main_road: 0.20, bus_stop: 0.15, public_office: 0.10 };
      let sum = 0.0;
      const flagged = [];
      for (const [k, w] of Object.entries(LANDMARK_WEIGHTS)) {
        if (payload.criticality[k]) {
          sum += w;
          flagged.push(k.replace('_', ' '));
        }
      }
      s_cri = Math.min(1.0, sum);
      if (flagged.length > 0) {
        explanations.push(`Near critical public infrastructure: ${flagged.join(', ')}`);
      } else {
        explanations.push('No nearby critical landmarks detected');
      }
    }
  } else {
    explanations.push('Standard civic zone; no high-criticality infrastructure flagged');
  }

  // Duration (10%)
  let s_dur = 0.05;
  if (payload.created_at) {
    try {
      const createdDate = new Date(payload.created_at);
      if (!isNaN(createdDate.getTime())) {
        const days = Math.max(0, (Date.now() - createdDate.getTime()) / 86400000);
        const durCap = Math.max(1, payload.duration_cap_days || 30);
        s_dur = Math.min(1.0, days / durCap);
        if (days < 1) {
          explanations.push('Reported recently (< 24 hours unresolved)');
        } else {
          explanations.push(`Unresolved for ${Math.round(days)} days`);
        }
      }
    } catch (_e) {
      explanations.push('Creation timestamp unrecorded or invalid');
    }
  } else {
    explanations.push('Recently reported or creation timestamp unrecorded');
  }

  // Growth (5%)
  let s_gro = 0.0;
  if (payload.recent_supports != null) {
    const recentCount = Array.isArray(payload.recent_supports) ? payload.recent_supports.length : Math.max(0, Number(payload.recent_supports) || 0);
    s_gro = Math.min(1.0, recentCount / 10.0);
    if (recentCount > 0) {
      explanations.push(`Recent endorsement surge: ${recentCount} supporters in recent window`);
    } else {
      explanations.push('No recent surge in citizen support');
    }
  } else {
    explanations.push('No historical support velocity data (neutral signal)');
  }

  // Compute final score
  const rawScore = 100.0 * (
    weights.severity * s_sev +
    weights.evidence * s_evi +
    weights.community * s_com +
    weights.criticality * s_cri +
    weights.duration * s_dur +
    weights.growth * s_gro
  );

  const priority_score = Math.round(Math.max(0.0, Math.min(100.0, rawScore)));
  let priority_level = 'VERY LOW';
  if (priority_score >= 80) priority_level = 'CRITICAL';
  else if (priority_score >= 60) priority_level = 'HIGH';
  else if (priority_score >= 40) priority_level = 'MEDIUM';
  else if (priority_score >= 20) priority_level = 'LOW';

  return {
    success: true,
    priority_score,
    priority_level,
    signals: {
      severity: Number(s_sev.toFixed(4)),
      evidence: Number(s_evi.toFixed(4)),
      community: Number(s_com.toFixed(4)),
      criticality: Number(s_cri.toFixed(4)),
      duration: Number(s_dur.toFixed(4)),
      growth: Number(s_gro.toFixed(4)),
    },
    weights,
    explanation: explanations,
    source: 'local-engine',
  };
}

