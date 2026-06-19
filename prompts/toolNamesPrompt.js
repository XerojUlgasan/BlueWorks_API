const toolsAndParameters = [
  {
    name: "submit_job_requests",
    parameters: {
      category: "String",
      job_type: "String",
      description: "String",
      budget: "number",
      urgency: "string",
      location: {
        longitude: "number",
        latitude: "number",
        radius: "number",
      },
      //   client_id, // API WILL PROVIDE
      //   candidate_worker_id_arr, // API WILL PROVIDE
    },
  },
  {
    name: "find_candidate_workers",
    parameters: {
      job_category: "String",
      job_type: "String",
      required_skills: "String",
      client_location: {
        longitude: "number",
        latitude: "number",
        radius: "number",
      },
      client_budget: "number",
      urgency: "string",
      candidate_limit: "number",
    },
  },
];
