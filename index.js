require("dotenv").config();
const express = require("express");
const chatbotRouter = require("./routes/chatbotRoute");

const app = express();

app.use("/api/v1/chatbot", chatbotRouter);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
