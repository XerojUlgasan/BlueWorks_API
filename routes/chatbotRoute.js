const chatbotRouter = require("express").Router();

chatbotRouter.get("/", (req, res) => {
  res.status(200).json({ message: "Chatbot route is working!" });
});

module.exports = chatbotRouter;
