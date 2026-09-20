import fs from 'fs';
import {
  calculateHaversineDistance,
  DUPLICATE_RADIUS_METERS,
} from './geospatial.service.js';
import { store } from './store.service.js';
import { compareImagesWithDinov2 } from './aiBridge.service.js';

export const IMAGE_SIMILARITY_THRESHOLD = 0.8;

/**
 * Check a new problem report against existing civic problems using combined
 * GPS distance (Haversine formula) and DINOv2 visual similarity.
 *
 * @param {Object} params
 * @param {number} params.latitude Citizen report latitude
 * @param {number} params.longitude Citizen report longitude
 * @param {string} [params.image_path] Path to uploaded evidence photo
 * @param {Array}  [params.existingProblems] Optional list of problems to check against (defaults to open store problems)
 * @param {number} [params.radiusMeters=100] Configurable GPS duplicate radius
 * @param {number} [params.threshold=0.80] Configurable visual similarity threshold
 * @returns {Promise<Object>} Duplicate analysis result
 */
export async function checkDuplicateReports({
  latitude,
  longitude,
  image_path = null,
  existingProblems = null,
  radiusMeters = DUPLICATE_RADIUS_METERS,
  threshold = IMAGE_SIMILARITY_THRESHOLD,
}) {
  const problems = existingProblems || (await store.getOpen());
  const hasGeo = latitude != null && longitude != null;
  const hasQueryImage = Boolean(image_path && fs.existsSync(image_path));

  const candidateResults = [];

  for (const candidate of problems) {
    // 1. Calculate GPS distance
    let distanceMeters = null;
    let isWithinRadius = false;

    if (hasGeo && candidate.latitude != null && candidate.longitude != null) {
      distanceMeters = calculateHaversineDistance(
        latitude,
        longitude,
        candidate.latitude,
        candidate.longitude
      );
      isWithinRadius = distanceMeters <= radiusMeters;
    }

    // 2. Calculate DINOv2 visual similarity
    let imageSimilarity = 0.0;
    const hasCandImage = Boolean(candidate.image_path && fs.existsSync(candidate.image_path));

    // Note: If candidate is within radius, evaluate visual similarity
    // If testing edge-cases (like Test C where image is compared despite far-away GPS),
    // we evaluate similarity whenever both images exist to provide full diagnostic insight.
    if (hasQueryImage && hasCandImage) {
      try {
        const simResult = await compareImagesWithDinov2(
          image_path,
          candidate.image_path,
          threshold
        );
        imageSimilarity = simResult.similarity;
      } catch (err) {
        console.warn(`[DuplicateService] Similarity check failed for candidate #${candidate.id}:`, err.message);
        imageSimilarity = 0.0;
      }
    }

    // 3. Combined potential match decision:
    // MUST satisfy BOTH: within GPS radius AND visual similarity >= threshold
    const isPotentialDuplicate = Boolean(isWithinRadius && imageSimilarity >= threshold);

    candidateResults.push({
      problem_id: candidate.id,
      title: candidate.title,
      category: candidate.category,
      status: candidate.status || 'OPEN',
      distance_meters: distanceMeters,
      is_within_radius: isWithinRadius,
      image_similarity: imageSimilarity,
      similarity_percentage: Math.round(Math.max(0, imageSimilarity) * 10000) / 100,
      is_potential_duplicate: isPotentialDuplicate,
      candidate_image: candidate.image_path,
      created_at: candidate.created_at,
    });
  }

  // Sort: potential duplicates first, then highest similarity, then closest distance
  candidateResults.sort((a, b) => {
    if (a.is_potential_duplicate !== b.is_potential_duplicate) {
      return a.is_potential_duplicate ? -1 : 1;
    }
    if (b.image_similarity !== a.image_similarity) {
      return b.image_similarity - a.image_similarity;
    }
    const distA = a.distance_meters ?? Infinity;
    const distB = b.distance_meters ?? Infinity;
    return distA - distB;
  });

  const hasPotentialMatch = candidateResults.some((c) => c.is_potential_duplicate);

  return {
    potential_match: hasPotentialMatch,
    radius_meters: radiusMeters,
    similarity_threshold: threshold,
    total_candidates_analyzed: candidateResults.length,
    matches: candidateResults,
  };
}
