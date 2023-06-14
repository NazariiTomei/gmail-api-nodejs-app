require("dotenv").config();

const auth = {
  type: "OAuth2",
  user: "blackbear20412@gmail.com",
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
};

const mailoptions = {
  from: "Daniel <blackbear20412@gmail.com>",
  to: "blackbear20412@gmail.com",
  subject: "Gmail API NodeJS",
};

module.exports = {
  auth,
  mailoptions,
};