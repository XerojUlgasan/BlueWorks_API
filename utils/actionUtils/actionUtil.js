const ContextService = require("../../services/contextService");

const show_candidates = async (activeChatId, filtered_response) => {
    const contextService = new ContextService();

    const { data: context } = await contextService.retrieveContext(activeChatId);
};

module.exports = { show_candidates };
