const supabaseAdmin = require("../libs/supabaseAdmin");

class ContextService {
  retrieveContext = async (chatId) => {
    return await supabaseAdmin.rpc("get_conversation_context", {
      context_id: chatId,
    });
  };

  updateContext = async (context_updates, chatId, userId) => {
    const {
      extras,
      job_type,
      job_category,
      required_skills,
      client_location,
      client_budget,
      urgency,
      candidate_limit,
      ready_for_submission,
      missing_fields,
      preferByNearest,
      preferByRatings,
    } = context_updates;

    console.log(context_updates);

    if (!chatId)
      return { data: null, error: { message: "chatId is required" } };

    if (
      client_budget != null &&
      (typeof client_budget !== "number" || client_budget < 0)
    )
      return {
        data: null,
        error: { message: "client_budget must be a non-negative number" },
      };

    if (
      candidate_limit != null &&
      (typeof candidate_limit !== "number" || candidate_limit < 1)
    )
      return {
        data: null,
        error: { message: "candidate_limit must be a positive number" },
      };

    if (required_skills != null && !Array.isArray(required_skills))
      return {
        data: null,
        error: { message: "required_skills must be an array" },
      };

    if (missing_fields != null && !Array.isArray(missing_fields))
      return {
        data: null,
        error: { message: "missing_fields must be an array" },
      };

    const updates = { id: chatId };
    if (extras != null) updates.extras = extras;
    if (job_type != null) updates.job_type = job_type;
    if (job_category != null) updates.job_category = job_category;
    if (required_skills != null) updates.required_skills = required_skills;
    if (client_budget != null) updates.client_budget = client_budget;
    if (urgency != null) updates.urgency = urgency;
    if (candidate_limit != null) updates.candidate_limit = candidate_limit;
    if (ready_for_submission != null)
      updates.ready_for_submission = ready_for_submission;
    if (missing_fields != null) updates.missing_fields = missing_fields;
    if (preferByNearest != null) updates.preferByNearest = preferByNearest;
    if (preferByRatings != null) updates.preferByRating = preferByRatings;
    if (userId != null) updates.user_id = userId;

    const { data, error } = await supabaseAdmin
      .from("conversation_context")
      .upsert(updates, { onConflict: "id" })
      .select()
      .single();

    if (error) return { data: null, error };

    if (client_location != null) {
      const { latitude, longitude, preferred_radius } = client_location;
      const { error: rpcError } = await supabaseAdmin.rpc(
        "update_client_location",
        {
          p_id: chatId,
          p_lat: latitude,
          p_lng: longitude,
          p_search_radius: preferred_radius * 1000,
        },
      );
      if (rpcError) return { data: null, error: rpcError };
    }

    return { data, error };
  };

  bindJobIdToContext = async (chatId, jobId) => {
    if (!chatId || !jobId) {
      return {
        data: null,
        error: { message: "chatId and jobId are required" },
      };
    }

    return await supabaseAdmin
      .from("conversation_context")
      .update({ job_id: jobId })
      .eq("id", chatId);
  };
}

module.exports = ContextService;
