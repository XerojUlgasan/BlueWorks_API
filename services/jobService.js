const supabaseAdmin = require("../libs/supabaseAdmin");
const ContextService = require("./contextService");

class JobService {
  updateJobRequest = async (data, id) => {};

  createJobRequest = async (data) => {
    const {
      client_id,
      job_description,
      client_budget,
      urgency,
      type,
      category,
      location,
    } = data;

    // console.log("JOB CREATION DATA : " + JSON.stringify(data, null, 2));

    return await supabaseAdmin
      .from("jobs")
      .insert({
        client_id: client_id,
        job_description: job_description,
        client_budget: client_budget,
        urgency: urgency,
        type: type,
        category: category,
        location: location,
      })
      .select("id")
      .single();
  };

  createAndSendJobRequest = async (
    agent_data,
    context,
    customer_id,
    chatId,
  ) => {
    //   JOB TABLE REQUIREMENTS:
    //   client_id uuid,              ------ auth
    //   job_description text,        ------ Provided by the ai
    //   client_budget smallint,      ------ context
    //   candidate_workers uuid[],    ------- search via API
    //   urgency character varying,   ------ context
    //   type character varying,      ------ context
    //   category character varying,  ------ context
    //   location geography,          ------ context

    const contextService = new ContextService();

    const {
      client_budget,
      urgency,
      job_type,
      job_category,
      client_location,
      search_radius,
    } = context;
    const { job_description } = agent_data;
    const client_id = customer_id;
    let candidate_id = [];
    let message = "";

    console.log("JOB REQUEST CONTEXT : " + JSON.stringify(context, null, 2));

    // 1. Create job reuqest first
    const { data: jobData, error: jobError } = await this.createJobRequest({
      client_id,
      job_description,
      client_budget,
      urgency,
      type: job_type,
      category: job_category,
      location: client_location,
    });
    message += `\n JOB REQUEST STATUS : ${jobError ? "ERROR CREATING JOB REQUEST: " + jobError.message + " candidate Search cancelled" : "JOB REQUEST SUCCESSFULLY CREATED, PROCEEDING CANDIDATE SEARCH"}`;
    if (jobError) {
      console.log("JOB CREATION ERROR : " + jobError.message);
      return;
    }
    console.log("JOB CREATION SUCCESSFUL : " + jobData.id);

    // 2. Bind job ID to context
    const { data: jobBindData, error: jobBindError } =
      await contextService.bindJobIdToContext(chatId, jobData.id);

    // 3. Search candidates based on the context

    // 4. send job request to the candidates
    //     NOTE: add a feature where customer can choose whether workers can apply
    //     to the job request even when they are not within the candidate list
  };
}

module.exports = JobService;
