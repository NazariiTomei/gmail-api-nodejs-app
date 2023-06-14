const express = require("express");
const routes = require("./routes");

require("dotenv").config();

const app = express();

app.use('/api', routes);

app.listen(process.env.PORT, () => {
  console.log("listening on port " + process.env.PORT);
});

app.get("/", async (req, res) => {
  // const result=await sendMail();
  res.send("Welcome to Gmail API with NodeJS");
});