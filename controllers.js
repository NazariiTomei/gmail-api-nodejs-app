const axios = require("axios");
const { generateConfig } = require("./utils");
const nodemailer = require("nodemailer");
const CONSTANTS = require("./constants");
const { google } = require("googleapis");
const { populate } = require("dotenv");
const { libraryagent } = require("googleapis/build/src/apis/libraryagent");

require("dotenv").config();

const Base64 = {
  _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  urlsafe_decode64: function (input) {
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    while (input.length % 4) {
      input += '=';
    }
    var output = atob(input);
    try {
      output = decodeURIComponent(escape(output));
    } catch (err) { }
    return output;
  },
  atob: function (input) {
    var str = String(input).replace(/=+$/, '');
    if (str.length % 4 == 1) {
      throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      (buffer = str.charAt(idx++));
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = Base64._keyStr.indexOf(buffer);
    }
    return output;
  },
};

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function sendMail(req, res) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        ...CONSTANTS.auth,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      ...CONSTANTS.mailoptions,
      text: "The Gmail API with NodeJS works",
    };

    const result = await transport.sendMail(mailOptions);
    res.send(result);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
}

async function getUser(req, res) {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
}

async function getDrafts(req, res) {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/drafts`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function readMail(req, res) {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    const list_url = `https://gmail.googleapis.com/gmail/v1/users/blackbear20412@gmail.com/messages?maxResults=10&q=from:donotreply@upwork.com%20is:unread`;
    const list_config = generateConfig(list_url, token);
    const list = await axios(list_config);

    const message_url = `https://gmail.googleapis.com/gmail/v1/users/blackbear20412@gmail.com/messages/${list.data.messages.reverse()[0].id}`;
    const message_config = generateConfig(message_url, token);
    const message = await axios(message_config);

    const parsedMessage = Base64.urlsafe_decode64(message.data.payload.parts[1].body.data.replace(/_/g, "/").replace(/-/g, "+"));
    const start_pos = parsedMessage.lastIndexOf("https://www.upwork.com/signup/verify-email/token/");
    const last_pos = parsedMessage.indexOf('"', start_pos);

    const link = parsedMessage.substring(start_pos, last_pos);
    res.json(link);
  } catch (error) {
    res.send(error);
  }
}

module.exports = {
  getUser,
  sendMail,
  getDrafts,
  readMail,
};