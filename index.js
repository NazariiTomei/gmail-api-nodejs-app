const { google } = require("googleapis");
const pt = require('puppeteer')
const axios = require('axios')

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

const generateConfig = (url, accessToken) => {
  return {
    method: "get",
    url: url,
    headers: {
      Authorization: `Bearer ${accessToken} `,
      "Content-type": "application/json",
    },
  };
};


const readMail = async () => {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    const list_url = `https://gmail.googleapis.com/gmail/v1/users/lm8361616@gmail.com/messages?maxResults=10&q=from:donotreply@upwork.com`;
    const list_config = generateConfig(list_url, token);
    const list = await axios(list_config);

    const message_url = `https://gmail.googleapis.com/gmail/v1/users/lm8361616@gmail.com/messages/${list.data.messages[0].id}`;
    const message_config = generateConfig(message_url, token);
    const message = await axios(message_config);

    const parsedMessage = Base64.urlsafe_decode64(message.data.payload.parts[1].body.data.replace(/_/g, "/").replace(/-/g, "+"));
    const start_pos = parsedMessage.lastIndexOf("https://www.upwork.com/nx/signup/verify-email/token/");
    const last_pos = parsedMessage.indexOf('"', start_pos);

    const link = parsedMessage.substring(start_pos, last_pos);
    return link;
  } catch (error) {
    console.log(error)
    return ''
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

(async () => {
  const browser = await pt.launch({ headless: false })
  const page = await browser.newPage();
  await page.goto('https://www.upwork.com/nx/signup/', {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector('div#onetrust-close-btn-container button[aria-label="Close"]')
  await page.$eval('div#onetrust-close-btn-container button[aria-label="Close"]', el => el.click())

  await page.waitForSelector('div[data-cy="button-box"][data-qa="work"]')
  await page.$eval('div[data-cy="button-box"][data-qa="work"]', el => el.click());
  await page.$eval(`button[type="button"][data-qa="btn-apply"]`, el => el.click());

  await page.waitForSelector('#first-name-input');
  await page.type('#first-name-input', 'Alex');
  await page.type('#last-name-input', 'Don');
  await page.type('#redesigned-input-email', 'lm8361616+9@gmail.com');
  await page.type('#password-input', 'rewq4321`');
  await page.$eval('div#country-dropdown div#dropdown-label-7 div span.flex-1.ellipsis', el => el.innerHTML = "Canada")
  await page.$eval('#checkbox-terms', el => el.click());
  await page.$eval('#button-submit-form', el => el.click());

  await delay(2000);

  const verify_link = await readMail();
  console.log(verify_link)
  await page.goto(verify_link, {
    waitUntil: "domcontentloaded",
  });

  // https://www.upwork.com/nx/create-profile/welcome
  await page.waitForSelector('button[data-qa="get-started-btn"]')
  await page.$eval('button[data-qa="get-started-btn"]', el => el.click())

  // https://www.upwork.com/nx/create-profile/experience
  await page.waitForSelector('input[type="radio"][value="FREELANCED_BEFORE"]')
  await page.$eval('input[type="radio"][value="FREELANCED_BEFORE"]', el => el.click())
  await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

  // https://www.upwork.com/nx/create-profile/goal
  await page.waitForSelector('input[type="radio"][value="GET_EXPERIENCE"]')
  await page.$eval('input[type="radio"][value="GET_EXPERIENCE"]', el => el.click())
  await delay(500)
  await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())
  console.log('123123')

  // https://www.upwork.com/nx/create-profile/work-preference
  await page.waitForSelector('input[type="checkbox"][data-ev-label="button_box_checkbox"][value="false"]')
  await page.$eval('input[type="checkbox"][data-ev-label="button_box_checkbox"][value="false"]', el => el.click())
  await delay(500)
  await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

  await delay(5000);
  await browser.close()
})()
