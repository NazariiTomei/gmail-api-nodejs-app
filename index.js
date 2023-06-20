const { google } = require("googleapis");
const pt = require('puppeteer')
const axios = require('axios')
const nodemailer = require('nodemailer')
const data = require('./data.json')
const limit = data.length

require("dotenv").config();
const start = 63;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const repeat = async (func, times) => {
  await func(times);
  times && --times && await repeat(func, times);
}

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

const sendMail = async () => {
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
      text: "All operation is completed!",
    };

    const result = await transport.sendMail(mailOptions);
    console.log('completed!')
  } catch (error) {
    console.log(error);
  }
}

const typeinfo = async (page, item) => {
  try {
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

    // https://www.upwork.com/nx/create-profile/work-preference
    await page.waitForSelector('input[type="checkbox"][data-ev-label="button_box_checkbox"][value="false"]')
    await page.$eval('input[type="checkbox"][data-ev-label="button_box_checkbox"][value="false"]', el => el.click())
    await delay(500)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/resume-import
    await page.waitForSelector('button[data-qa="resume-upload-btn-mobile"]')
    await delay(1000)
    await page.$eval('button[data-qa="resume-upload-btn-mobile"]', el => el.click())
    try {
      await page.waitForSelector('button[data-qa="resume-upload-edit-existing-btn"]', { timeout: 1000 })
      await page.$eval('button[data-qa="resume-upload-edit-existing-btn"]', el => el.click())
    } catch (err) {
      await page.waitForSelector("input[type=file]")
      await delay(1000)
      await (await page.$("input[type=file]")).uploadFile('C:/upwork/resume.pdf')
      await delay(6000)
      await page.$eval('[data-qa="resume-upload-continue-btn"]', el => el.click())
    }

    // https://www.upwork.com/nx/create-profile/title
    await page.waitForSelector('input[aria-labelledby="title-label"][aria-required="true"][type="text"][placeholder="Software Engineer | Javascript | iOS"]')
    await delay(1000)
    await page.$eval('input[aria-labelledby="title-label"][aria-required="true"][type="text"][placeholder="Software Engineer | Javascript | iOS"]', el => el.value = '')
    await delay(1000)
    await page.type(
      'input[aria-labelledby="title-label"][aria-required="true"][type="text"][placeholder="Software Engineer | Javascript | iOS"]',
      item.title,
      { delay: 50 }
    )
    await delay(3000)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/employment
    await page.waitForSelector('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]')
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/education
    await page.waitForSelector('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]')
    await delay(500)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())
    await delay(500)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    await delay(3000)
    if (page.url().search('certifications') > 0) {
      // https://www.upwork.com/nx/create-profile/certifications
      await page.waitForSelector('button[data-test="skip-button"][type="button"][data-ev-label="wizard_skip"]')
      await delay(500)
      await page.$eval('button[data-test="skip-button"][type="button"][data-ev-label="wizard_skip"]', el => el.click())
      await delay(3000)
    }

    await delay(2000)
    // https://www.upwork.com/nx/create-profile/languages
    await page.waitForSelector('[data-test="dropdown-toggle"]')
    await delay(1000)
    await page.$eval('[data-test="dropdown-toggle"]', el => el.click())
    await delay(1000)
    await page.$eval('[aria-labelledby="dropdown-label-english"] li:nth-child(4)', el => el.click())
    await delay(1000)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())
    await delay(1000)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())
    await delay(3000)

    // https://www.upwork.com/nx/create-profile/skills
    await page.waitForSelector('[aria-labelledby="skills-input"]')
    const skills_length = item.skills.length;
    await repeat(async (skill_inx) => {
      await page.focus('[aria-labelledby="skills-input"]')
      await delay(1000)
      await page.type('[aria-labelledby="skills-input"]', item.skills[skills_length - skill_inx], { delay: 50 })
      await delay(1000)
      await page.$eval('[aria-labelledby="skills-input"] li', el => el.click())
      await delay(1000)
    }, skills_length)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    await delay(2000)
    // https://www.upwork.com/nx/create-profile/overview
    await page.waitForSelector('textarea[aria-labelledby="overview-label"][aria-describedby="overview-counter"]')
    await page.$eval('textarea[aria-labelledby="overview-label"][aria-describedby="overview-counter"]', el => el.value = '')
    await page.type('textarea[aria-labelledby="overview-label"][aria-describedby="overview-counter"]',
      `Full Stack Developer and system administrator with over 6+ years of experience in software engineering and developing new features and apps for different products and companies by using programming tools like Laravel, Ruby on Rails, Express JS, HTML, CSS, Node JS, React JS, Vue JS and Angular.

  Longtime Shopify expert, I have 6+ years of experience on the Shopify and Shopify Plus platform, I'm well versed and experienced on every aspect of the platform.
  
  Capable of analyzing customer feedback in order to find the best way to create new and enhance the existing product features.
  Will Always Be With You and Provide High Quality and Friendly Service.
  
  My core skills include:
  - Backend
  * Node.js/MogngoDB/ExpressJS
  * Ruby/Ruby on Rails
  * Mysql/PostgreSQL
  * php/CI/Symfony/CakePHP/Laravel
  
  - Front End
  * React JS/ Next.JS / Redux / React Native
  * Vue/nuxt.js
  * Wordpress/ Shopify/Woocomerce/Squarespace/Opencart
  * Javascript/Jquery
  * HTML/CSS, SCSS, SASS, Bootstrap, TailwindCSS
  
  - Other Services
  * Github, Bitbucket, Gitlab,
  * Microservices, GraphQL, RESTful API, System Administrator.
  
  Let me help you to grow your business successfully`,
      { delay: 10 }
    )
    await delay(500)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/categories
    await page.waitForSelector('[aria-labelledby*="dropdown-search-multi-label"]')
    await page.$eval('[aria-labelledby*="dropdown-search-multi-label"]', el => el.click())
    await delay(500)
    await page.$eval('[aria-labelledby="dropdown-search-multi-label"] li:nth-child(11) [aria-labelledby="dropdown-search-multi-label"] li:nth-child(11)', el => el.click())
    await delay(1000)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())
    await delay(1000)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/rate
    await page.waitForSelector('input[type="text"][aria-describedby*="hourly-rate-description"]')
    await delay(1000)
    await page.type('input[type="text"][aria-describedby*="hourly-rate-description"]', `${item.rate}`, { delay: 10 })
    await delay(1000)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/location
    await page.waitForSelector('[aria-labelledby="street-label"]')
    await page.$eval('[data-qa="open-loader"]', el => el.click())
    await delay(2000)
    await (await page.$("input[type=file]")).uploadFile(`C:/upwork/${item.avatar}`)
    await page.$eval('button[data-qa="btn-save"]', el => el.click())
    await delay(1000)
    await page.$eval('button[data-qa="btn-save"]', el => el.click())
    await delay(6000)
    await page.$eval('[aria-labelledby="street-label"]', el => el.value = '')
    await page.type('[aria-labelledby="street-label"]', item.street, { delay: 50 })
    await page.type('[aria-labelledby="city-label"]', item.city, { delay: 50 })
    await delay(2000)
    await page.$eval('[aria-labelledby="city-label"] li', el => el.click())
    await page.type('[aria-labelledby="postal-code-label"]', item.zipcode, { delay: 50 })
    await page.type('[inputmode="numeric"]', item.phone, { delay: 50 })
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())
  } catch (error) {
    console.log(error)
    await page.goto('https://www.upwork.com/nx/create-profile/welcome', {
      waitUntil: "domcontentloaded",
    });
    typeinfo()
  }

}

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

repeat(async (inx) => {
  const item = data[limit - inx];
  const browser = await pt.launch({ headless: false })
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1050 });
  await page.goto('https://www.upwork.com/nx/signup/?dest=home', {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('div#onetrust-close-btn-container button[aria-label="Close"]')
  await page.$eval('div#onetrust-close-btn-container button[aria-label="Close"]', el => el.click())

  await page.waitForSelector('div[data-cy="button-box"][data-qa="work"]')
  await page.$eval('div[data-cy="button-box"][data-qa="work"]', el => el.click());
  await page.$eval(`button[type="button"][data-qa="btn-apply"]`, el => el.click());

  await page.waitForSelector('#first-name-input');
  await page.type('#first-name-input', item.name);
  await page.type('#last-name-input', item.surname);
  await page.type('#redesigned-input-email', `lm8361616+${start + limit - inx}@gmail.com`);
  await page.type('#password-input', 'rewq4321`');
  await page.$eval('[aria-labelledby*="select-a-country"]', el => el.click())
  await page.waitForSelector('[autocomplete="country-name"]');
  await page.type('[autocomplete="country-name"]', item.country)
  await page.$eval('[aria-labelledby="select-a-country"] li', el => el.click())
  await page.$eval('#checkbox-terms', el => el.click());
  await page.$eval('#button-submit-form', el => el.click());

  await delay(10000);

  const verify_link = await readMail();
  await page.goto(verify_link, {
    waitUntil: "domcontentloaded",
  });

  if (page.url().search('login') > 0) {
    await page.waitForSelector('#login_username')
    await page.type("#login_username", `lm8361616+${start + limit - inx}@gmail.com`)
    await delay(500)
    await page.waitForSelector('#login_password_continue')
    await page.$eval("#login_password_continue", el => el.click())
    await delay(500)
    await page.waitForSelector('#login_password')
    await page.type('#login_password', "rewq4321`")
    await delay(500)
    await page.waitForSelector('#login_control_continue')
    await page.$eval('#login_control_continue', el => el.click())
  }

  await delay(6000);

  await typeinfo(page, item)

  await page.waitForSelector('button[data-qa="submit-profile-top-btn"]')
  await page.$eval('button[data-qa="submit-profile-top-btn"]', el => el.click())
  await delay(5000)
  await browser.close()
}, 20);

sendMail();
