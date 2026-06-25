const supabaseAdmin = require("../libs/supabaseAdmin");
const ContextService = require("./contextService");

const DEFAULT_CANDIDATE_LIMIT = 5;

class JobService {
  createJobRequest = async (context, client_id) => {
    console.log("CREATING JOB REQUEST");
    const {
      job_type,
      job_category,
      extras,
      client_budget,
      urgency,
      latitude,
      longitude,
    } = context;
    const job_description = extras?.description ?? null;

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .insert({
        client_id,
        job_description,
        client_budget,
        urgency,
        type: job_type,
        category: job_category,
      })
      .select("id")
      .single();

    if (error) return { data: null, error };

    if (latitude != null && longitude != null) {
      const { error: rpcError } = await supabaseAdmin.rpc(
        "update_job_location",
        {
          p_id: data.id,
          p_lat: latitude,
          p_lng: longitude,
        },
      );
      if (rpcError) return { data: null, error: rpcError };
    }

    return { data, error: null };
  };

  findCandidateWorkers = async (context) => {
    console.log("FINDING CANDIDATE WORKERS");
    const {
      job_category,
      job_type,
      required_skills,
      latitude,
      longitude,
      client_budget,
      candidate_limit,
      preferByNearest,
      preferByRating,
      search_radius,
    } = context;

    const limit = candidate_limit ?? DEFAULT_CANDIDATE_LIMIT;
    const radius = search_radius ?? 10000;

    let query = supabaseAdmin
      .from("workers")
      .select(
        "id, full_name, ratings, hourly_rate, jobs_finished, barangay, job_category, job_type, skill_set, skills, location",
      )
      .eq("is_verified", true)
      .eq("onboarding_complete", true);

    if (job_category?.length)
      query = query.overlaps("job_category", job_category);
    if (job_type?.length) query = query.overlaps("job_type", job_type);
    if (required_skills?.length) {
      query = query.or(
        `skill_set.ov.{${required_skills.join(",")}},skills.ov.{${required_skills.join(",")}}`,
      );
    }
    if (client_budget != null) query = query.lte("hourly_rate", client_budget);

    const { data: workers, error } = await query;
    if (error) return { data: null, error };

    let results = workers;

    // Filter by proximity using PostGIS if location available
    if (latitude != null && longitude != null) {
      const { data: nearby, error: geoError } = await supabaseAdmin.rpc(
        "find_workers_within_radius",
        {
          p_lat: latitude,
          p_lng: longitude,
          p_radius: radius,
        },
      );
      if (geoError) return { data: null, error: geoError };

      const nearbyIds = new Set(nearby.map((w) => w.id));
      results = results.filter((w) => nearbyIds.has(w.id));

      if (preferByNearest) {
        const distanceMap = Object.fromEntries(
          nearby.map((w) => [w.id, w.distance_meters]),
        );
        results.sort(
          (a, b) =>
            (distanceMap[a.id] ?? Infinity) - (distanceMap[b.id] ?? Infinity),
        );
      } else if (preferByRating) {
        results.sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0));
      }
    } else if (preferByRating) {
      results.sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0));
    }

    return { data: results.slice(0, limit), error: null };
  };

  sendJobRequest = async (job_id, candidate_ids) => {
    console.log("SENDING JOB REQUEST");
    if (!job_id)
      return { data: null, error: { message: "job_id is required" } };
    if (!candidate_ids?.length)
      return { data: null, error: { message: "No candidates to send to" } };

    return await supabaseAdmin
      .from("jobs")
      .update({ candidate_workers: candidate_ids })
      .eq("id", job_id)
      .select("id")
      .single();
  };
}

module.exports = JobService;
