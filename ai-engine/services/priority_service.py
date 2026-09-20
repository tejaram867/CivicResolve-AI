from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union

# Configurable formula weights (must sum to 1.00)
DEFAULT_PRIORITY_WEIGHTS = {
    "severity": 0.30,
    "evidence": 0.20,
    "community": 0.20,
    "criticality": 0.15,
    "duration": 0.10,
    "growth": 0.05,
}

# Configurable normalization caps
DEFAULT_SUPPORT_CAP = 20
DEFAULT_DURATION_CAP_DAYS = 30
DEFAULT_GROWTH_CAP = 10

# Configurable priority level thresholds
PRIORITY_LEVEL_THRESHOLDS = {
    "CRITICAL": 80,
    "HIGH": 60,
    "MEDIUM": 40,
    "LOW": 20,
    "VERY LOW": 0,
}

# Critical infrastructure landmark weights
LANDMARK_WEIGHTS = {
    "hospital": 0.35,
    "school": 0.30,
    "main_road": 0.20,
    "bus_stop": 0.15,
    "public_office": 0.10,
}


def normalize_severity(severity: Optional[int]) -> tuple[float, str]:
    """
    Normalize officer field-verified severity (1-5 scale).
    If unassessed, defaults to a neutral moderate baseline (3/5).
    """
    if severity is None:
        return 0.60, "Field verification pending; default moderate severity baseline (3/5) applied"

    try:
        val = int(severity)
    except (ValueError, TypeError):
        return 0.60, "Invalid severity format; default moderate baseline (3/5) applied"

    clamped = max(1, min(5, val))
    normalized = clamped / 5.0

    severity_labels = {
        1: "Very Low (1/5)",
        2: "Low (2/5)",
        3: "Moderate (3/5)",
        4: "High (4/5)",
        5: "Critical (5/5)",
    }
    label = severity_labels.get(clamped, f"{clamped}/5")
    return round(normalized, 4), f"Field-verified severity: {label}"


def normalize_evidence(evidence_strength: Optional[float]) -> tuple[float, str]:
    """
    Normalize Phase 3 Multimodal Evidence Strength Score (0-100).
    If unavailable, defaults to neutral 50/100.
    """
    if evidence_strength is None:
        return 0.50, "Multimodal evidence analysis pending; neutral baseline (50/100) applied"

    try:
        val = float(evidence_strength)
    except (ValueError, TypeError):
        return 0.50, "Invalid evidence score; neutral baseline (50/100) applied"

    clamped = max(0.0, min(100.0, val))
    normalized = clamped / 100.0

    if clamped >= 80:
        desc = f"Very strong supporting evidence ({int(clamped)}/100)"
    elif clamped >= 60:
        desc = f"Strong supporting evidence ({int(clamped)}/100)"
    elif clamped >= 40:
        desc = f"Moderate supporting evidence ({int(clamped)}/100)"
    else:
        desc = f"Weak supporting evidence ({int(clamped)}/100)"

    return round(normalized, 4), desc


def normalize_community_support(
    support_count: Optional[int],
    support_cap: int = DEFAULT_SUPPORT_CAP,
) -> tuple[float, str]:
    """
    Normalize recorded citizen 'I'm Affected' support count.
    Represents local community support signal, NOT total affected population.
    """
    try:
        count = max(0, int(support_count or 0))
    except (ValueError, TypeError):
        count = 0

    cap = max(1, support_cap)
    normalized = min(1.0, count / cap)

    if count == 0:
        msg = "No additional citizen endorsements recorded yet"
    elif count >= cap:
        msg = f"High community endorsement: {count} verified citizen supporters (capped at {cap})"
    else:
        msg = f"{count} citizen supporters endorsed this issue ({round(normalized * 100)}% of cap)"

    return round(normalized, 4), msg


def normalize_criticality(criticality: Optional[Union[Dict[str, Any], str, float, int]]) -> tuple[float, str]:
    """
    Normalize infrastructure proximity criticality.
    Supports landmark dictionary, named level string, or direct numeric score.
    """
    if criticality is None:
        return 0.20, "Standard civic zone; no high-criticality infrastructure flagged"

    # 1. Direct numeric score (0.0 - 1.0 or 0 - 100)
    if isinstance(criticality, (int, float)):
        val = float(criticality)
        if val > 1.0:
            val = val / 100.0
        clamped = max(0.0, min(1.0, val))
        return round(clamped, 4), f"Custom infrastructure criticality score: {round(clamped * 100)}/100"

    # 2. String level
    if isinstance(criticality, str):
        level_map = {
            "critical": 1.0,
            "high": 0.80,
            "medium": 0.50,
            "moderate": 0.50,
            "low": 0.25,
            "none": 0.10,
        }
        score = level_map.get(criticality.lower().strip(), 0.30)
        return score, f"Zone criticality rated as {criticality.upper()}"

    # 3. Dictionary of nearby landmarks
    if isinstance(criticality, dict):
        total = 0.0
        flagged = []
        for landmark, weight in LANDMARK_WEIGHTS.items():
            if criticality.get(landmark):
                total += weight
                flagged.append(landmark.replace("_", " "))

        score = min(1.0, total)
        if flagged:
            return round(score, 4), f"Near critical public infrastructure: {', '.join(flagged)}"
        return 0.15, "No nearby critical landmarks detected"

    return 0.20, "Standard civic zone"


def normalize_duration(
    created_at: Optional[Union[str, datetime]],
    duration_cap_days: int = DEFAULT_DURATION_CAP_DAYS,
) -> tuple[float, str]:
    """
    Normalize unresolved issue age. Older unresolved problems gradually gain priority.
    """
    if not created_at:
        return 0.05, "Recently reported or creation timestamp unrecorded"

    now = datetime.now(timezone.utc)
    parsed_dt = None

    if isinstance(created_at, datetime):
        parsed_dt = created_at
    elif isinstance(created_at, str):
        try:
            # Handle ISO string (e.g. 2026-09-18T15:11:42.491Z)
            cleaned = created_at.replace("Z", "+00:00")
            parsed_dt = datetime.fromisoformat(cleaned)
        except Exception:
            return 0.05, "Unable to parse creation timestamp; initial duration assumed"

    if parsed_dt:
        if parsed_dt.tzinfo is None:
            parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)

        delta = now - parsed_dt
        days = max(0.0, delta.total_seconds() / 86400.0)
        cap = max(1.0, float(duration_cap_days))
        normalized = min(1.0, days / cap)

        if days < 1:
            msg = f"Reported today (< 24 hours unresolved)"
        elif days >= cap:
            msg = f"Long-standing unresolved issue: {int(days)} days (capped at {int(cap)} days)"
        else:
            msg = f"Unresolved for {int(days)} days"

        return round(normalized, 4), msg

    return 0.05, "Initial duration assumed"


def normalize_growth(
    recent_supports: Optional[Union[List[Any], int]],
    growth_cap: int = DEFAULT_GROWTH_CAP,
) -> tuple[float, str]:
    """
    Normalize recent support trend/velocity.
    """
    if recent_supports is None:
        return 0.0, "No historical support velocity data (neutral signal)"

    if isinstance(recent_supports, (int, float)):
        count = max(0, int(recent_supports))
    elif isinstance(recent_supports, list):
        count = len(recent_supports)
    else:
        count = 0

    if count == 0:
        return 0.0, "No recent surge in citizen support"

    cap = max(1, growth_cap)
    normalized = min(1.0, count / cap)
    return round(normalized, 4), f"Recent endorsement surge: {count} supporters in recent window"


def get_priority_level(score: int) -> str:
    """Map priority score (0-100) to system queue categorization."""
    if score >= PRIORITY_LEVEL_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    if score >= PRIORITY_LEVEL_THRESHOLDS["HIGH"]:
        return "HIGH"
    if score >= PRIORITY_LEVEL_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    if score >= PRIORITY_LEVEL_THRESHOLDS["LOW"]:
        return "LOW"
    return "VERY LOW"


def calculate_priority(
    severity: Optional[int] = None,
    evidence_strength: Optional[float] = None,
    support_count: Optional[int] = 0,
    criticality: Optional[Union[Dict[str, Any], str, float, int]] = None,
    created_at: Optional[Union[str, datetime]] = None,
    recent_supports: Optional[Union[List[Any], int]] = None,
    weights: Optional[Dict[str, float]] = None,
    support_cap: int = DEFAULT_SUPPORT_CAP,
    duration_cap_days: int = DEFAULT_DURATION_CAP_DAYS,
) -> Dict[str, Any]:
    """
    Calculate transparent, explainable Priority Score (0-100) combining:
    Severity (30%) + Evidence (20%) + Community Support (20%) +
    Criticality (15%) + Duration (10%) + Growth Trend (5%).
    """
    active_weights = weights or DEFAULT_PRIORITY_WEIGHTS
    explanations: List[str] = []

    # 1. Severity
    s_sev, exp_sev = normalize_severity(severity)
    explanations.append(exp_sev)

    # 2. Evidence Strength (from Phase 3)
    s_evi, exp_evi = normalize_evidence(evidence_strength)
    explanations.append(exp_evi)

    # 3. Community Support ("I'm Affected")
    s_com, exp_com = normalize_community_support(support_count, support_cap)
    explanations.append(exp_com)

    # 4. Criticality (Proximity to infrastructure)
    s_cri, exp_cri = normalize_criticality(criticality)
    explanations.append(exp_cri)

    # 5. Duration (Unresolved age)
    s_dur, exp_dur = normalize_duration(created_at, duration_cap_days)
    explanations.append(exp_dur)

    # 6. Growth / Trend
    s_gro, exp_gro = normalize_growth(recent_supports)
    explanations.append(exp_gro)

    # Weighted combination
    w_sev = active_weights.get("severity", 0.30)
    w_evi = active_weights.get("evidence", 0.20)
    w_com = active_weights.get("community", 0.20)
    w_cri = active_weights.get("criticality", 0.15)
    w_dur = active_weights.get("duration", 0.10)
    w_gro = active_weights.get("growth", 0.05)

    raw_score = 100.0 * (
        w_sev * s_sev
        + w_evi * s_evi
        + w_com * s_com
        + w_cri * s_cri
        + w_dur * s_dur
        + w_gro * s_gro
    )

    # Strict clamping between 0 and 100
    final_score = int(round(max(0.0, min(100.0, raw_score))))
    level = get_priority_level(final_score)

    return {
        "priority_score": final_score,
        "priority_level": level,
        "signals": {
            "severity": s_sev,
            "evidence": s_evi,
            "community": s_com,
            "criticality": s_cri,
            "duration": s_dur,
            "growth": s_gro,
        },
        "weights": {
            "severity": w_sev,
            "evidence": w_evi,
            "community": w_com,
            "criticality": w_cri,
            "duration": w_dur,
            "growth": w_gro,
        },
        "explanation": explanations,
    }
