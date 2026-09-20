import { pool } from '../config/database.js';
import { INTERNAL_STATUS, getPublicStatus } from './workflow.service.js';

function parseJson(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

function buildProblemObject(
  prob,
  assign = null,
  inspect = null,
  report = null,
  order = null,
  comp = null,
  ai = null,
  supports = [],
  feedbacks = []
) {
  if (!prob) return null;

  const id = String(prob.id);
  const internalStatus = prob.internal_status || INTERNAL_STATUS.REPORTED;
  const status = prob.status || getPublicStatus(internalStatus);

  return {
    id,
    title: prob.title || '',
    description: prob.description || '',
    category: prob.category || 'general',
    latitude: prob.latitude != null ? Number(prob.latitude) : null,
    longitude: prob.longitude != null ? Number(prob.longitude) : null,
    image_path: prob.image_path || null,
    voice_note_text: prob.voice_note_text || null,
    language: prob.language || 'en',
    created_by: prob.created_by || 'citizen-anonymous',
    internal_status: internalStatus,
    status,
    field_verification_flag: prob.field_verification_flag || null,
    severity: prob.severity != null ? Number(prob.severity) : null,
    criticality: prob.criticality || null,
    created_at: prob.created_at ? new Date(prob.created_at).toISOString() : new Date().toISOString(),
    updated_at: prob.updated_at ? new Date(prob.updated_at).toISOString() : new Date().toISOString(),

    assignment: assign
      ? {
          officer_id: assign.officer_id,
          assigned_at: assign.assigned_at ? new Date(assign.assigned_at).toISOString() : new Date().toISOString(),
          assigned_by: assign.assigned_by,
          assignment_status: assign.assignment_status || 'ASSIGNED',
          remarks: assign.remarks || '',
        }
      : null,

    inspection: inspect
      ? {
          location_verified: Boolean(inspect.location_verified),
          issue_exists: Boolean(inspect.issue_exists),
          severity: Number(inspect.severity != null ? inspect.severity : 3),
          current_condition: inspect.current_condition || '',
          remarks: inspect.remarks || '',
          photos: parseJson(inspect.photos, []),
          videos: parseJson(inspect.videos, []),
          voice_note_text: inspect.voice_note_text || null,
          inspected_at: inspect.inspected_at ? new Date(inspect.inspected_at).toISOString() : new Date().toISOString(),
          inspected_by: inspect.inspected_by,
        }
      : null,

    work_report: report
      ? {
          workers_required: Number(report.workers_required || 1),
          estimated_hours: Number(report.estimated_hours || 4),
          materials: parseJson(report.materials, []),
          remarks: report.remarks || '',
          urgency_notes: report.urgency_notes || '',
          additional_evidence: parseJson(report.additional_evidence, []),
          submitted_at: report.submitted_at ? new Date(report.submitted_at).toISOString() : new Date().toISOString(),
          submitted_by: report.submitted_by,
        }
      : null,

    work_order: order
      ? {
          workers_allocated: Number(order.workers_allocated || 1),
          planned_start: order.planned_start ? new Date(order.planned_start).toISOString() : null,
          planned_completion: order.planned_completion ? new Date(order.planned_completion).toISOString() : null,
          materials: parseJson(order.materials, []),
          instructions: order.instructions || '',
          allocated_at: order.allocated_at ? new Date(order.allocated_at).toISOString() : new Date().toISOString(),
          allocated_by: order.allocated_by,
        }
      : null,

    completion_verification: comp
      ? {
          completed: Boolean(comp.completed),
          remarks: comp.remarks || '',
          photos: parseJson(comp.photos, []),
          videos: parseJson(comp.videos, []),
          verified_at: comp.verified_at ? new Date(comp.verified_at).toISOString() : new Date().toISOString(),
          verified_by: comp.verified_by,
        }
      : null,

    supports: (supports || []).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      explanation: s.explanation || '',
      latitude: s.latitude != null ? Number(s.latitude) : null,
      longitude: s.longitude != null ? Number(s.longitude) : null,
      image_path: s.image_path || null,
      created_at: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    })),

    resolution_feedback: (feedbacks || []).map((f) => ({
      id: f.id,
      problem_id: f.problem_id,
      user_id: f.user_id,
      resolved: Boolean(f.resolved),
      comment: f.comment || '',
      photo: f.photo || null,
      submitted_at: f.submitted_at ? new Date(f.submitted_at).toISOString() : new Date().toISOString(),
    })),

    evidence_analysis:
      ai && (ai.evidence_strength != null || ai.evidence_interpretation != null)
        ? {
            evidence_strength: ai.evidence_strength,
            evidence_interpretation: ai.evidence_interpretation,
            interpretation: ai.evidence_interpretation,
            explanation: parseJson(ai.evidence_explanation, []),
          }
        : null,

    priority_analysis:
      ai && ai.priority_score != null
        ? {
            priority_score: ai.priority_score,
            priority_level: ai.priority_level,
            signals: parseJson(ai.signals, {}),
            weights: parseJson(ai.weights, {}),
            explanation: parseJson(ai.priority_explanation, []),
            source: ai.source,
            updated_at: ai.updated_at ? new Date(ai.updated_at).toISOString() : undefined,
          }
        : null,
  };
}

export class ProblemStore {
  /**
   * Helper to batch hydrate multiple problem records with child relations.
   */
  async _hydrateBatch(probRows) {
    if (!probRows || probRows.length === 0) return [];
    const ids = probRows.map((p) => p.id);

    const [
      [assignRows],
      [inspectRows],
      [reportRows],
      [orderRows],
      [compRows],
      [aiRows],
      [supportRows],
      [feedbackRows],
    ] = await Promise.all([
      pool.query('SELECT * FROM problem_assignments WHERE problem_id IN (?);', [ids]),
      pool.query('SELECT * FROM problem_inspections WHERE problem_id IN (?);', [ids]),
      pool.query('SELECT * FROM problem_work_reports WHERE problem_id IN (?);', [ids]),
      pool.query('SELECT * FROM problem_work_orders WHERE problem_id IN (?);', [ids]),
      pool.query('SELECT * FROM problem_completions WHERE problem_id IN (?);', [ids]),
      pool.query('SELECT * FROM problem_ai_analysis WHERE problem_id IN (?);', [ids]),
      pool.query('SELECT * FROM problem_supports WHERE problem_id IN (?) ORDER BY created_at ASC;', [ids]),
      pool.query('SELECT * FROM resolution_feedback WHERE problem_id IN (?) ORDER BY submitted_at ASC;', [ids]),
    ]);

    const assignMap = new Map(assignRows.map((r) => [r.problem_id, r]));
    const inspectMap = new Map(inspectRows.map((r) => [r.problem_id, r]));
    const reportMap = new Map(reportRows.map((r) => [r.problem_id, r]));
    const orderMap = new Map(orderRows.map((r) => [r.problem_id, r]));
    const compMap = new Map(compRows.map((r) => [r.problem_id, r]));
    const aiMap = new Map(aiRows.map((r) => [r.problem_id, r]));

    const supportMap = new Map();
    for (const s of supportRows) {
      if (!supportMap.has(s.problem_id)) supportMap.set(s.problem_id, []);
      supportMap.get(s.problem_id).push(s);
    }

    const feedbackMap = new Map();
    for (const f of feedbackRows) {
      if (!feedbackMap.has(f.problem_id)) feedbackMap.set(f.problem_id, []);
      feedbackMap.get(f.problem_id).push(f);
    }

    return probRows.map((prob) =>
      buildProblemObject(
        prob,
        assignMap.get(prob.id) || null,
        inspectMap.get(prob.id) || null,
        reportMap.get(prob.id) || null,
        orderMap.get(prob.id) || null,
        compMap.get(prob.id) || null,
        aiMap.get(prob.id) || null,
        supportMap.get(prob.id) || [],
        feedbackMap.get(prob.id) || []
      )
    );
  }

  async getAll() {
    const [probRows] = await pool.query('SELECT * FROM problems ORDER BY created_at DESC;');
    if (!probRows || probRows.length === 0) return [];
    return this._hydrateBatch(probRows);
  }

  async listProblems() {
    return this.getAll();
  }

  async getOpen() {
    const [probRows] = await pool.query(
      `SELECT * FROM problems 
       WHERE UPPER(internal_status) NOT IN ('RESOLVED', 'ADMIN_CLOSED', 'CLOSED') 
         AND UPPER(status) NOT IN ('RESOLVED', 'ADMIN_CLOSED', 'CLOSED')
       ORDER BY created_at DESC;`
    );
    if (!probRows || probRows.length === 0) return [];
    return this._hydrateBatch(probRows);
  }

  async getById(id) {
    if (!id) return null;
    const problemId = String(id);
    const [probRows] = await pool.query('SELECT * FROM problems WHERE id = ? LIMIT 1;', [problemId]);
    if (!probRows || probRows.length === 0) return null;

    const [
      [assignRows],
      [inspectRows],
      [reportRows],
      [orderRows],
      [compRows],
      [aiRows],
      [supportRows],
      [feedbackRows],
    ] = await Promise.all([
      pool.query('SELECT * FROM problem_assignments WHERE problem_id = ? LIMIT 1;', [problemId]),
      pool.query('SELECT * FROM problem_inspections WHERE problem_id = ? LIMIT 1;', [problemId]),
      pool.query('SELECT * FROM problem_work_reports WHERE problem_id = ? LIMIT 1;', [problemId]),
      pool.query('SELECT * FROM problem_work_orders WHERE problem_id = ? LIMIT 1;', [problemId]),
      pool.query('SELECT * FROM problem_completions WHERE problem_id = ? LIMIT 1;', [problemId]),
      pool.query('SELECT * FROM problem_ai_analysis WHERE problem_id = ? LIMIT 1;', [problemId]),
      pool.query('SELECT * FROM problem_supports WHERE problem_id = ? ORDER BY created_at ASC;', [problemId]),
      pool.query('SELECT * FROM resolution_feedback WHERE problem_id = ? ORDER BY submitted_at ASC;', [problemId]),
    ]);

    return buildProblemObject(
      probRows[0],
      assignRows[0] || null,
      inspectRows[0] || null,
      reportRows[0] || null,
      orderRows[0] || null,
      compRows[0] || null,
      aiRows[0] || null,
      supportRows || [],
      feedbackRows || []
    );
  }

  async getProblem(id) {
    return this.getById(id);
  }

  async create(problemData) {
    const id = String(Date.now());
    const internalStatus = problemData.internal_status || INTERNAL_STATUS.ADMIN_REVIEW;
    const publicStatus = getPublicStatus(internalStatus);

    const title = problemData.title || 'Untitled Problem';
    const description = problemData.description || '';
    const category = problemData.category || 'general';
    const latitude = Number(problemData.latitude || 0);
    const longitude = Number(problemData.longitude || 0);
    const imagePath = problemData.image_path || null;
    const voiceNoteText = problemData.voice_note_text || null;
    const language = problemData.language || 'en';
    const createdBy = problemData.created_by || 'citizen-anonymous';
    const severity = problemData.severity != null ? Number(problemData.severity) : null;
    const criticality = problemData.criticality || null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Parameterized INSERT into problems
      await connection.query(
        `INSERT INTO problems (
          id, title, description, category, latitude, longitude, image_path,
          voice_note_text, language, created_by, internal_status, status, severity, criticality,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
        [
          id,
          title,
          description,
          category,
          latitude,
          longitude,
          imagePath,
          voiceNoteText,
          language,
          createdBy,
          internalStatus,
          publicStatus,
          severity,
          criticality,
        ]
      );

      // If initial AI evidence/priority analysis provided, persist to problem_ai_analysis
      if (problemData.evidence_analysis || problemData.priority_analysis) {
        const ea = problemData.evidence_analysis || {};
        const pa = problemData.priority_analysis || {};

        await connection.query(
          `INSERT INTO problem_ai_analysis (
            problem_id, evidence_strength, evidence_interpretation, evidence_explanation,
            priority_score, priority_level, signals, weights, priority_explanation, source, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3));`,
          [
            id,
            ea.evidence_strength != null ? Number(ea.evidence_strength) : 50,
            ea.evidence_interpretation || ea.interpretation || null,
            ea.explanation ? JSON.stringify(ea.explanation) : null,
            pa.priority_score != null ? Number(pa.priority_score) : 35,
            pa.priority_level || 'LOW',
            pa.signals ? JSON.stringify(pa.signals) : null,
            pa.weights ? JSON.stringify(pa.weights) : null,
            pa.explanation ? JSON.stringify(pa.explanation) : null,
            pa.source || 'local-engine',
          ]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    return this.getById(id);
  }

  async createProblem(problemData) {
    return this.create(problemData);
  }

  async updateProblemStatus(id, internalStatus, publicStatus) {
    await pool.query(
      'UPDATE problems SET internal_status = ?, status = ?, updated_at = NOW(3) WHERE id = ?;',
      [internalStatus, publicStatus, String(id)]
    );
  }

  async save(problem) {
    if (!problem || !problem.id) return null;
    const pId = String(problem.id);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update problems table
      await connection.query(
        `UPDATE problems SET
          title = ?,
          description = ?,
          category = ?,
          latitude = ?,
          longitude = ?,
          image_path = ?,
          voice_note_text = ?,
          language = ?,
          internal_status = ?,
          status = ?,
          field_verification_flag = ?,
          severity = ?,
          criticality = ?,
          updated_at = NOW(3)
         WHERE id = ?;`,
        [
          problem.title || '',
          problem.description || '',
          problem.category || 'general',
          problem.latitude != null ? Number(problem.latitude) : 0,
          problem.longitude != null ? Number(problem.longitude) : 0,
          problem.image_path || null,
          problem.voice_note_text || null,
          problem.language || 'en',
          problem.internal_status || 'REPORTED',
          problem.status || getPublicStatus(problem.internal_status),
          problem.field_verification_flag || null,
          problem.severity != null ? Number(problem.severity) : null,
          problem.criticality || null,
          pId,
        ]
      );

      // 2. Upsert assignment
      if (problem.assignment && problem.assignment.officer_id) {
        await connection.query(
          `INSERT INTO problem_assignments (problem_id, officer_id, assigned_at, assigned_by, assignment_status, remarks)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             officer_id = VALUES(officer_id),
             assigned_at = VALUES(assigned_at),
             assigned_by = VALUES(assigned_by),
             assignment_status = VALUES(assignment_status),
             remarks = VALUES(remarks);`,
          [
            pId,
            String(problem.assignment.officer_id),
            problem.assignment.assigned_at ? new Date(problem.assignment.assigned_at) : new Date(),
            problem.assignment.assigned_by || 'admin-1',
            problem.assignment.assignment_status || 'ASSIGNED',
            problem.assignment.remarks || '',
          ]
        );
      }

      // 3. Upsert inspection
      if (problem.inspection) {
        await connection.query(
          `INSERT INTO problem_inspections (
             problem_id, location_verified, issue_exists, severity, current_condition,
             remarks, photos, videos, voice_note_text, inspected_at, inspected_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             location_verified = VALUES(location_verified),
             issue_exists = VALUES(issue_exists),
             severity = VALUES(severity),
             current_condition = VALUES(current_condition),
             remarks = VALUES(remarks),
             photos = VALUES(photos),
             videos = VALUES(videos),
             voice_note_text = VALUES(voice_note_text),
             inspected_at = VALUES(inspected_at),
             inspected_by = VALUES(inspected_by);`,
          [
            pId,
            Boolean(problem.inspection.location_verified),
            Boolean(problem.inspection.issue_exists),
            Number(problem.inspection.severity != null ? problem.inspection.severity : 3),
            problem.inspection.current_condition || '',
            problem.inspection.remarks || '',
            JSON.stringify(problem.inspection.photos || []),
            JSON.stringify(problem.inspection.videos || []),
            problem.inspection.voice_note_text || null,
            problem.inspection.inspected_at ? new Date(problem.inspection.inspected_at) : new Date(),
            String(problem.inspection.inspected_by || 'OFF-001'),
          ]
        );
      }

      // 4. Upsert work_report
      if (problem.work_report) {
        await connection.query(
          `INSERT INTO problem_work_reports (
             problem_id, workers_required, estimated_hours, materials, remarks,
             urgency_notes, additional_evidence, submitted_at, submitted_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             workers_required = VALUES(workers_required),
             estimated_hours = VALUES(estimated_hours),
             materials = VALUES(materials),
             remarks = VALUES(remarks),
             urgency_notes = VALUES(urgency_notes),
             additional_evidence = VALUES(additional_evidence),
             submitted_at = VALUES(submitted_at),
             submitted_by = VALUES(submitted_by);`,
          [
            pId,
            Number(problem.work_report.workers_required || 1),
            Number(problem.work_report.estimated_hours || 4),
            JSON.stringify(problem.work_report.materials || []),
            problem.work_report.remarks || '',
            problem.work_report.urgency_notes || '',
            JSON.stringify(problem.work_report.additional_evidence || []),
            problem.work_report.submitted_at ? new Date(problem.work_report.submitted_at) : new Date(),
            String(problem.work_report.submitted_by || 'OFF-001'),
          ]
        );
      }

      // 5. Upsert work_order
      if (problem.work_order) {
        await connection.query(
          `INSERT INTO problem_work_orders (
             problem_id, workers_allocated, planned_start, planned_completion,
             materials, instructions, allocated_at, allocated_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             workers_allocated = VALUES(workers_allocated),
             planned_start = VALUES(planned_start),
             planned_completion = VALUES(planned_completion),
             materials = VALUES(materials),
             instructions = VALUES(instructions),
             allocated_at = VALUES(allocated_at),
             allocated_by = VALUES(allocated_by);`,
          [
            pId,
            Number(problem.work_order.workers_allocated || 1),
            problem.work_order.planned_start ? new Date(problem.work_order.planned_start) : null,
            problem.work_order.planned_completion ? new Date(problem.work_order.planned_completion) : null,
            JSON.stringify(problem.work_order.materials || []),
            problem.work_order.instructions || '',
            problem.work_order.allocated_at ? new Date(problem.work_order.allocated_at) : new Date(),
            String(problem.work_order.allocated_by || 'admin-1'),
          ]
        );
      }

      // 6. Upsert completion_verification
      if (problem.completion_verification) {
        await connection.query(
          `INSERT INTO problem_completions (
             problem_id, completed, remarks, photos, videos, verified_at, verified_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             completed = VALUES(completed),
             remarks = VALUES(remarks),
             photos = VALUES(photos),
             videos = VALUES(videos),
             verified_at = VALUES(verified_at),
             verified_by = VALUES(verified_by);`,
          [
            pId,
            Boolean(problem.completion_verification.completed),
            problem.completion_verification.remarks || '',
            JSON.stringify(problem.completion_verification.photos || []),
            JSON.stringify(problem.completion_verification.videos || []),
            problem.completion_verification.verified_at ? new Date(problem.completion_verification.verified_at) : new Date(),
            String(problem.completion_verification.verified_by || 'OFF-001'),
          ]
        );
      }

      // 7. Upsert AI analysis
      if (problem.priority_analysis || problem.evidence_analysis) {
        const pa = problem.priority_analysis || {};
        const ea = problem.evidence_analysis || {};

        await connection.query(
          `INSERT INTO problem_ai_analysis (
             problem_id, evidence_strength, evidence_interpretation, evidence_explanation,
             priority_score, priority_level, signals, weights, priority_explanation, source, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
           ON DUPLICATE KEY UPDATE
             evidence_strength = VALUES(evidence_strength),
             evidence_interpretation = VALUES(evidence_interpretation),
             evidence_explanation = VALUES(evidence_explanation),
             priority_score = VALUES(priority_score),
             priority_level = VALUES(priority_level),
             signals = VALUES(signals),
             weights = VALUES(weights),
             priority_explanation = VALUES(priority_explanation),
             source = VALUES(source),
             updated_at = NOW(3);`,
          [
            pId,
            ea.evidence_strength != null ? Number(ea.evidence_strength) : 50,
            ea.evidence_interpretation || ea.interpretation || null,
            ea.explanation ? JSON.stringify(ea.explanation) : null,
            pa.priority_score != null ? Number(pa.priority_score) : 35,
            pa.priority_level || 'LOW',
            pa.signals ? JSON.stringify(pa.signals) : null,
            pa.weights ? JSON.stringify(pa.weights) : null,
            pa.explanation ? JSON.stringify(pa.explanation) : null,
            pa.source || 'local-engine',
          ]
        );
      }

      await connection.commit();
      return problem;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async update(id, fields) {
    const problem = await this.getById(id);
    if (!problem) return null;
    Object.assign(problem, fields);
    await this.save(problem);
    return problem;
  }

  async updateProblem(id, fields) {
    return this.update(id, fields);
  }

  async addSupport(problemId, supportData) {
    const problem = await this.getById(problemId);
    if (!problem) return null;

    const userId = supportData.user_id || 'anonymous_user';
    const supportId = `sup-${Date.now()}`;
    const explanation = supportData.explanation || '';
    const latitude = supportData.latitude != null ? Number(supportData.latitude) : null;
    const longitude = supportData.longitude != null ? Number(supportData.longitude) : null;
    const imagePath = supportData.image_path || null;
    const createdAt = new Date().toISOString();

    try {
      await pool.query(
        `INSERT INTO problem_supports (id, problem_id, user_id, explanation, latitude, longitude, image_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3));`,
        [supportId, String(problemId), userId, explanation, latitude, longitude, imagePath]
      );
      await pool.query('UPDATE problems SET updated_at = NOW(3) WHERE id = ?;', [String(problemId)]);
    } catch (err) {
      if (
        err.code === 'ER_DUP_ENTRY' ||
        err.message?.includes('uq_support_problem_user') ||
        err.message?.includes('Duplicate')
      ) {
        const duplicateError = new Error('User has already supported this problem');
        duplicateError.statusCode = 400;
        throw duplicateError;
      }
      throw err;
    }

    const supportRecord = {
      id: supportId,
      user_id: userId,
      explanation,
      latitude,
      longitude,
      image_path: imagePath,
      created_at: createdAt,
    };

    if (!problem.supports) problem.supports = [];
    problem.supports.push(supportRecord);
    return { problem, support: supportRecord };
  }

  async getSupports(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM problem_supports WHERE problem_id = ? ORDER BY created_at ASC;',
      [String(problemId)]
    );
    return rows.map((s) => ({
      id: s.id,
      user_id: s.user_id,
      explanation: s.explanation || '',
      latitude: s.latitude != null ? Number(s.latitude) : null,
      longitude: s.longitude != null ? Number(s.longitude) : null,
      image_path: s.image_path || null,
      created_at: new Date(s.created_at).toISOString(),
    }));
  }

  async checkExistingSupport(problemId, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM problem_supports WHERE problem_id = ? AND user_id = ? LIMIT 1;',
      [String(problemId), String(userId)]
    );
    return rows.length > 0;
  }

  async assignOfficer(problemId, assignmentData) {
    const pId = String(problemId);
    const officerId = String(assignmentData.officer_id);
    const assignedBy = assignmentData.assigned_by || 'admin-1';
    const status = assignmentData.assignment_status || 'ASSIGNED';
    const remarks = assignmentData.remarks || '';
    const assignedAt = assignmentData.assigned_at ? new Date(assignmentData.assigned_at) : new Date();

    await pool.query(
      `INSERT INTO problem_assignments (problem_id, officer_id, assigned_at, assigned_by, assignment_status, remarks)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         officer_id = VALUES(officer_id),
         assigned_at = VALUES(assigned_at),
         assigned_by = VALUES(assigned_by),
         assignment_status = VALUES(assignment_status),
         remarks = VALUES(remarks);`,
      [pId, officerId, assignedAt, assignedBy, status, remarks]
    );

    return {
      officer_id: officerId,
      assigned_at: assignedAt.toISOString(),
      assigned_by: assignedBy,
      assignment_status: status,
      remarks,
    };
  }

  async getAssignments(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM problem_assignments WHERE problem_id = ? LIMIT 1;',
      [String(problemId)]
    );
    return rows[0] || null;
  }

  async saveInspection(problemId, inspectionData) {
    const pId = String(problemId);
    await pool.query(
      `INSERT INTO problem_inspections (
         problem_id, location_verified, issue_exists, severity, current_condition,
         remarks, photos, videos, voice_note_text, inspected_at, inspected_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         location_verified = VALUES(location_verified),
         issue_exists = VALUES(issue_exists),
         severity = VALUES(severity),
         current_condition = VALUES(current_condition),
         remarks = VALUES(remarks),
         photos = VALUES(photos),
         videos = VALUES(videos),
         voice_note_text = VALUES(voice_note_text),
         inspected_at = VALUES(inspected_at),
         inspected_by = VALUES(inspected_by);`,
      [
        pId,
        Boolean(inspectionData.location_verified),
        Boolean(inspectionData.issue_exists),
        Number(inspectionData.severity != null ? inspectionData.severity : 3),
        inspectionData.current_condition || '',
        inspectionData.remarks || '',
        JSON.stringify(inspectionData.photos || []),
        JSON.stringify(inspectionData.videos || []),
        inspectionData.voice_note_text || null,
        inspectionData.inspected_at ? new Date(inspectionData.inspected_at) : new Date(),
        String(inspectionData.inspected_by || 'OFF-001'),
      ]
    );
  }

  async getInspection(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM problem_inspections WHERE problem_id = ? LIMIT 1;',
      [String(problemId)]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      location_verified: Boolean(r.location_verified),
      issue_exists: Boolean(r.issue_exists),
      severity: Number(r.severity),
      current_condition: r.current_condition || '',
      remarks: r.remarks || '',
      photos: parseJson(r.photos, []),
      videos: parseJson(r.videos, []),
      voice_note_text: r.voice_note_text || null,
      inspected_at: new Date(r.inspected_at).toISOString(),
      inspected_by: r.inspected_by,
    };
  }

  async saveWorkReport(problemId, reportData) {
    const pId = String(problemId);
    await pool.query(
      `INSERT INTO problem_work_reports (
         problem_id, workers_required, estimated_hours, materials, remarks,
         urgency_notes, additional_evidence, submitted_at, submitted_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         workers_required = VALUES(workers_required),
         estimated_hours = VALUES(estimated_hours),
         materials = VALUES(materials),
         remarks = VALUES(remarks),
         urgency_notes = VALUES(urgency_notes),
         additional_evidence = VALUES(additional_evidence),
         submitted_at = VALUES(submitted_at),
         submitted_by = VALUES(submitted_by);`,
      [
        pId,
        Number(reportData.workers_required || 1),
        Number(reportData.estimated_hours || 4),
        JSON.stringify(reportData.materials || []),
        reportData.remarks || '',
        reportData.urgency_notes || '',
        JSON.stringify(reportData.additional_evidence || []),
        reportData.submitted_at ? new Date(reportData.submitted_at) : new Date(),
        String(reportData.submitted_by || 'OFF-001'),
      ]
    );
  }

  async getWorkReport(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM problem_work_reports WHERE problem_id = ? LIMIT 1;',
      [String(problemId)]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      workers_required: Number(r.workers_required),
      estimated_hours: Number(r.estimated_hours),
      materials: parseJson(r.materials, []),
      remarks: r.remarks || '',
      urgency_notes: r.urgency_notes || '',
      additional_evidence: parseJson(r.additional_evidence, []),
      submitted_at: new Date(r.submitted_at).toISOString(),
      submitted_by: r.submitted_by,
    };
  }

  async saveWorkOrder(problemId, orderData) {
    const pId = String(problemId);
    await pool.query(
      `INSERT INTO problem_work_orders (
         problem_id, workers_allocated, planned_start, planned_completion,
         materials, instructions, allocated_at, allocated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         workers_allocated = VALUES(workers_allocated),
         planned_start = VALUES(planned_start),
         planned_completion = VALUES(planned_completion),
         materials = VALUES(materials),
         instructions = VALUES(instructions),
         allocated_at = VALUES(allocated_at),
         allocated_by = VALUES(allocated_by);`,
      [
        pId,
        Number(orderData.workers_allocated || 1),
        orderData.planned_start ? new Date(orderData.planned_start) : null,
        orderData.planned_completion ? new Date(orderData.planned_completion) : null,
        JSON.stringify(orderData.materials || []),
        orderData.instructions || '',
        orderData.allocated_at ? new Date(orderData.allocated_at) : new Date(),
        String(orderData.allocated_by || 'admin-1'),
      ]
    );
  }

  async getWorkOrder(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM problem_work_orders WHERE problem_id = ? LIMIT 1;',
      [String(problemId)]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      workers_allocated: Number(r.workers_allocated),
      planned_start: r.planned_start ? new Date(r.planned_start).toISOString() : null,
      planned_completion: r.planned_completion ? new Date(r.planned_completion).toISOString() : null,
      materials: parseJson(r.materials, []),
      instructions: r.instructions || '',
      allocated_at: new Date(r.allocated_at).toISOString(),
      allocated_by: r.allocated_by,
    };
  }

  async saveCompletion(problemId, compData) {
    const pId = String(problemId);
    await pool.query(
      `INSERT INTO problem_completions (
         problem_id, completed, remarks, photos, videos, verified_at, verified_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         completed = VALUES(completed),
         remarks = VALUES(remarks),
         photos = VALUES(photos),
         videos = VALUES(videos),
         verified_at = VALUES(verified_at),
         verified_by = VALUES(verified_by);`,
      [
        pId,
        Boolean(compData.completed),
        compData.remarks || '',
        JSON.stringify(compData.photos || []),
        JSON.stringify(compData.videos || []),
        compData.verified_at ? new Date(compData.verified_at) : new Date(),
        String(compData.verified_by || 'OFF-001'),
      ]
    );
  }

  async getCompletion(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM problem_completions WHERE problem_id = ? LIMIT 1;',
      [String(problemId)]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      completed: Boolean(r.completed),
      remarks: r.remarks || '',
      photos: parseJson(r.photos, []),
      videos: parseJson(r.videos, []),
      verified_at: new Date(r.verified_at).toISOString(),
      verified_by: r.verified_by,
    };
  }

  async saveAIAnalysis(problemId, aiData) {
    const pId = String(problemId);
    const ea = aiData.evidence_analysis || {};
    const pa = aiData.priority_analysis || aiData;

    await pool.query(
      `INSERT INTO problem_ai_analysis (
         problem_id, evidence_strength, evidence_interpretation, evidence_explanation,
         priority_score, priority_level, signals, weights, priority_explanation, source, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
       ON DUPLICATE KEY UPDATE
         evidence_strength = VALUES(evidence_strength),
         evidence_interpretation = VALUES(evidence_interpretation),
         evidence_explanation = VALUES(evidence_explanation),
         priority_score = VALUES(priority_score),
         priority_level = VALUES(priority_level),
         signals = VALUES(signals),
         weights = VALUES(weights),
         priority_explanation = VALUES(priority_explanation),
         source = VALUES(source),
         updated_at = NOW(3);`,
      [
        pId,
        ea.evidence_strength != null ? Number(ea.evidence_strength) : (aiData.evidence_strength != null ? Number(aiData.evidence_strength) : 50),
        ea.evidence_interpretation || ea.interpretation || aiData.evidence_interpretation || null,
        ea.explanation ? JSON.stringify(ea.explanation) : (aiData.evidence_explanation ? JSON.stringify(aiData.evidence_explanation) : null),
        pa.priority_score != null ? Number(pa.priority_score) : (aiData.priority_score != null ? Number(aiData.priority_score) : 35),
        pa.priority_level || aiData.priority_level || 'LOW',
        pa.signals ? JSON.stringify(pa.signals) : null,
        pa.weights ? JSON.stringify(pa.weights) : null,
        pa.explanation ? JSON.stringify(pa.explanation) : null,
        pa.source || aiData.source || 'local-engine',
      ]
    );
  }

  async getAIAnalysis(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM problem_ai_analysis WHERE problem_id = ? LIMIT 1;',
      [String(problemId)]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      evidence_strength: r.evidence_strength,
      evidence_interpretation: r.evidence_interpretation,
      evidence_explanation: parseJson(r.evidence_explanation, []),
      priority_score: r.priority_score,
      priority_level: r.priority_level,
      signals: parseJson(r.signals, {}),
      weights: parseJson(r.weights, {}),
      priority_explanation: parseJson(r.priority_explanation, []),
      source: r.source,
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null,
    };
  }

  async addAuditEvent(event) {
    const id = event.id || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const problemId = String(event.problem_id);
    const fromStatus = event.from_status || 'REPORTED';
    const toStatus = event.to_status || 'ADMIN_REVIEW';
    const publicStatus = event.public_status || 'REPORTED';
    const actorId = event.actor_id || 'system';
    const actorRole = event.actor_role || 'SYSTEM';
    const remarks = event.remarks || '';
    const metadata = event.metadata ? JSON.stringify(event.metadata) : null;
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

    await pool.query(
      `INSERT INTO audit_events (id, problem_id, from_status, to_status, public_status, actor_id, actor_role, remarks, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, problemId, fromStatus, toStatus, publicStatus, actorId, actorRole, remarks, metadata, timestamp]
    );

    return {
      ...event,
      id,
      metadata: event.metadata || {},
    };
  }

  async getAuditEvents(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM audit_events WHERE problem_id = ? ORDER BY timestamp ASC;',
      [String(problemId)]
    );
    return rows.map((r) => ({
      id: r.id,
      problem_id: r.problem_id,
      from_status: r.from_status,
      to_status: r.to_status,
      public_status: r.public_status,
      actor_id: r.actor_id,
      actor_role: r.actor_role,
      remarks: r.remarks || '',
      metadata: parseJson(r.metadata, {}),
      timestamp: new Date(r.timestamp).toISOString(),
    }));
  }

  async getAllAuditEvents() {
    const [rows] = await pool.query('SELECT * FROM audit_events ORDER BY timestamp ASC;');
    return rows.map((r) => ({
      id: r.id,
      problem_id: r.problem_id,
      from_status: r.from_status,
      to_status: r.to_status,
      public_status: r.public_status,
      actor_id: r.actor_id,
      actor_role: r.actor_role,
      remarks: r.remarks || '',
      metadata: parseJson(r.metadata, {}),
      timestamp: new Date(r.timestamp).toISOString(),
    }));
  }

  async addResolutionFeedback(problemId, feedback) {
    const id = `fb-${Date.now()}`;
    const pId = String(problemId);
    const userId = feedback.user_id || 'citizen-anonymous';
    const resolved = Boolean(feedback.resolved);
    const comment = feedback.comment || '';
    const photo = feedback.photo || null;
    const submittedAt = new Date().toISOString();

    await pool.query(
      `INSERT INTO resolution_feedback (id, problem_id, user_id, resolved, comment, photo, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(3));`,
      [id, pId, userId, resolved, comment, photo]
    );

    return {
      id,
      problem_id: pId,
      user_id: userId,
      resolved,
      comment,
      photo,
      submitted_at: submittedAt,
    };
  }

  async saveResolutionFeedback(problemId, feedback) {
    return this.addResolutionFeedback(problemId, feedback);
  }

  async getResolutionFeedback(problemId) {
    const [rows] = await pool.query(
      'SELECT * FROM resolution_feedback WHERE problem_id = ? ORDER BY submitted_at ASC;',
      [String(problemId)]
    );
    return rows.map((f) => ({
      id: f.id,
      problem_id: f.problem_id,
      user_id: f.user_id,
      resolved: Boolean(f.resolved),
      comment: f.comment || '',
      photo: f.photo || null,
      submitted_at: new Date(f.submitted_at).toISOString(),
    }));
  }

  // --- Notification Operations ---
  async createNotification(notifData) {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const role = notifData.recipient_role ? String(notifData.recipient_role).toUpperCase() : null;
    const userId = notifData.recipient_id ? String(notifData.recipient_id) : null;
    const pId = notifData.problem_id ? String(notifData.problem_id) : null;
    const title = notifData.title || 'Civic Update';
    const message = notifData.message || '';
    const type = notifData.type || 'INFO';
    const meta = notifData.metadata ? JSON.stringify(notifData.metadata) : null;
    const createdAt = new Date().toISOString();

    await pool.query(
      `INSERT INTO notifications (id, recipient_role, recipient_id, problem_id, title, message, type, metadata, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW(3));`,
      [id, role, userId, pId, title, message, type, meta]
    );

    return {
      id,
      recipient_role: role,
      recipient_id: userId,
      problem_id: pId,
      title,
      message,
      type,
      metadata: notifData.metadata || {},
      read: false,
      created_at: createdAt,
    };
  }

  async getNotifications({ role, user_id, unread_only = false }) {
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND (recipient_role IS NULL OR recipient_role = ?)';
      params.push(String(role).toUpperCase());
    }
    if (user_id) {
      sql += ' AND (recipient_id IS NULL OR recipient_id = ?)';
      params.push(String(user_id));
    }
    if (unread_only) {
      sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC;';

    const [rows] = await pool.query(sql, params);
    return rows.map((r) => ({
      id: r.id,
      recipient_role: r.recipient_role,
      recipient_id: r.recipient_id,
      problem_id: r.problem_id,
      title: r.title,
      message: r.message,
      type: r.type,
      metadata: parseJson(r.metadata, {}),
      read: Boolean(r.is_read),
      created_at: new Date(r.created_at).toISOString(),
    }));
  }

  async markNotificationRead(notificationId) {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?;', [String(notificationId)]);
    const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ? LIMIT 1;', [String(notificationId)]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      recipient_role: r.recipient_role,
      recipient_id: r.recipient_id,
      problem_id: r.problem_id,
      title: r.title,
      message: r.message,
      type: r.type,
      metadata: parseJson(r.metadata, {}),
      read: Boolean(r.is_read),
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  /**
   * Safe test reset method:
   * Cleans up dynamic test problems (timestamp IDs) while preserving baseline problems #101-#105.
   */
  async resetToInitial() {
    await pool.query(
      `DELETE FROM problems 
       WHERE id NOT IN ('101', '102', '103', '104', '105');`
    );

    // Ensure baseline problem #101 is reset to assigned status for Phase 5 tests
    await pool.query(
      `UPDATE problems 
       SET internal_status = 'OFFICER_ASSIGNED', status = 'ASSIGNED', updated_at = NOW(3) 
       WHERE id = '101';`
    );
    await pool.query(
      `INSERT INTO problem_assignments (problem_id, officer_id, assigned_at, assigned_by, assignment_status, remarks)
       VALUES ('101', 'OFF-001', NOW(3), 'admin-1', 'ASSIGNED', 'P1 school-zone pothole — inspect today')
       ON DUPLICATE KEY UPDATE officer_id = 'OFF-001', assignment_status = 'ASSIGNED';`
    );
  }
}

export const store = new ProblemStore();
