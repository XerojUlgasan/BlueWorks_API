require("dotenv").config();
const express = require("express");
const chatbotRouter = require("./routes/chatbotRoute");
const supabaseAdmin = require("./libs/supabaseAdmin");
const authenticate = require("./auth/auth");

const app = express();

app.use(express.json()); // <-- must be before routes
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/chatbot", authenticate, chatbotRouter);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
