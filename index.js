const start = 37
const { google } = require('googleapis');
const { faker } = require('@faker-js/faker')
const pt = require('puppeteer')
const axios = require('axios')
const nodemailer = require('nodemailer')
const data = require('./data.json')
const limit = data.length

require("dotenv").config();
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const repeat = async (func, times) => {
  await func(times);
  times && --times && await repeat(func, times);
}

const dummyGmail = (gmail, index) => {
  let binaryString = index.toString(2).split('').reverse().join('');
  return gmail.split("").map((item, idx) =>
    item + (binaryString.at(idx) === '1' ? '.' : '')
  ).join('') + '@gmail.com'
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

const typeinfo = async (page, item) => {
  try {
    await page.goto('https://www.upwork.com/nx/create-profile/welcome', {
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
      await (await page.$("input[type=file]")).uploadFile('./upwork/resume.pdf')
      await delay(6000)
      await page.$eval('[data-qa="resume-upload-continue-btn"]', el => el.click())
    }

    // https://www.upwork.com/nx/create-profile/title
    await page.waitForSelector('input[aria-labelledby="title-label"][aria-required="true"][type="text"]')
    await delay(1000)
    await page.$eval('input[aria-labelledby="title-label"][aria-required="true"][type="text"]', el => el.value = '')
    await delay(1000)
    await page.type(
      'input[aria-labelledby="title-label"][aria-required="true"][type="text"]',
      item.title,
      { delay: 50 }
    )
    await delay(3000)
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/employment
    await page.waitForSelector('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]')
    await delay(500)
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
      `Last year, I utilized my expertise and experience to successfully assist two startups in launching their web applications.`,
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
    // await (await page.$("input[type=file]")).uploadFile(`./upwork/${item.avatar}`)
    await (await page.$("input[type=file]")).uploadFile(`./upwork/img (${Math.ceil(Math.random() * 3)}).jpg`)
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
    await page.type('[inputmode="numeric"]', faker.phone.number('###-###-####'), { delay: 50 })
    await page.$eval('button[data-test="next-button"][type="button"][data-ev-label="wizard_next"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/submit
    await page.waitForSelector('button[data-qa="submit-profile-top-btn"]')
    await page.$eval('button[data-qa="submit-profile-top-btn"]', el => el.click())

    // https://www.upwork.com/nx/create-profile/finish
    await page.waitForSelector('a.up-n-link.air3-btn.air3-btn-secondary')
    await page.goto("https://www.upwork.com/freelancers/", {
      waitUntil: "domcontentloaded",
    });
    await delay(2000)
  } catch (error) {
    console.log("typeinfo", error)
    await page.screenshot({ path: 'fullpage.png', fullPage: true })
    console.log(page.url())
    typeinfo(page, item)
  }
}

const configSetting = async (page, item) => {
  try {
    try {
      // https://www.upwork.com/freelancers/
      await page.goto("https://www.upwork.com/freelancers/settings/profile", {
        waitUntil: "domcontentloaded",
      });
      // await delay(100000)
      // https://www.upwork.com/freelancers/settings/profile
      await page.waitForSelector("input#securityQuestion_answer")
      await page.type("input#securityQuestion_answer", "rewq4321`")
      await page.$eval("input#securityQuestion_lockingNotice", el => el.click())
      await page.$eval("input#securityQuestion_remember", el => el.click())
      await delay(500)
      await page.waitForSelector("button#control_save")
      await page.$eval("button#control_save", el => el.click())
      // await page.waitForSelector('input#sensitiveZone_password.up-input.width-md')
      // await page.type("input#sensitiveZone_password.up-input.width-md", "rewq4321`")
      // await page.waitForSelector("button#control_save.up-btn.mr-0.up-btn-primary")
      // await page.$eval("button#control_save.up-btn.mr-0.up-btn-primary", el => el.click())

      // https://www.upwork.com/freelancers/settings/profile
      await page.waitForSelector("div#dropdown-label-21")
      await page.$eval("div#dropdown-label-21", el => el.click())
      await page.waitForSelector("ul#dropdown-menu-21 li:nth-child(2)")
      await page.$eval("ul#dropdown-menu-21 li:nth-child(2)", el => el.click())
      await page.$eval("input.up-button-box-input[value='3']", el => el.click())
    } catch (error) {
      console.error(error)
      await page.screenshot({ path: 'fullpage.png', fullPage: true })
      console.log(page.url())
    }

    // https://www.upwork.com/ab/notification-settings/
    await page.goto('https://www.upwork.com/ab/notification-settings/', {
      waitUntil: "domcontentloaded",
    })
    await page.waitForSelector('div#dropdown-label-6[aria-labelledby="email-unread-activity dropdown-label-6"]')
    await page.$eval('div#dropdown-label-6[aria-labelledby="email-unread-activity dropdown-label-6"]', el => el.click())
    await page.waitForSelector('ul#dropdown-menu-6[aria-labelledby="email-unread-activity"] li')
    await page.$eval('ul#dropdown-menu-6[aria-labelledby="email-unread-activity"] li', el => el.click())

    // https://www.upwork.com/ab/portfolios/
    await page.goto('https://www.upwork.com/ab/portfolios/', {
      waitUntil: "domcontentloaded",
    })
    await page.waitForSelector('input#title')
    await page.type('input#title', 'Twilio API')
    await page.type('input#completionDate', '06/18/2018')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[value="2"]')
    await page.$eval('input[value="2"]', el => el.click())
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[type="file"]')
    await (await page.$("input[type=file]")).uploadFile('./upwork/twilio_api.jpg')
    await delay(10000)
    await page.type('textarea.up-textarea', "Twilio API Chat App")
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(3000)
    await page.waitForSelector('button.up-btn.up-btn-primary.m-0.pull-right')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(1000)

    await page.goto('https://www.upwork.com/ab/portfolios/', {
      waitUntil: "domcontentloaded",
    })
    await page.waitForSelector('input#title')
    await page.type('input#title', 'Chat App')
    await page.type('input#completionDate', '02/14/2017')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[value="2"]')
    await page.$eval('input[value="2"]', el => el.click())
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[type="file"]')
    await (await page.$("input[type=file]")).uploadFile('./upwork/chat_app.jpg')
    await delay(10000)
    await page.type('textarea.up-textarea', "React Chat App")
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(3000)
    await page.waitForSelector('button.up-btn.up-btn-primary.m-0.pull-right')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(1000)

    await page.goto('https://www.upwork.com/ab/portfolios/', {
      waitUntil: "domcontentloaded",
    })
    await page.waitForSelector('input#title')
    await page.type('input#title', 'DICOM Viewer')
    await page.type('input#completionDate', '10/24/2018')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[value="2"]')
    await page.$eval('input[value="2"]', el => el.click())
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[type="file"]')
    await (await page.$("input[type=file]")).uploadFile('./upwork/dicom.jpg')
    await delay(10000)
    await page.type('textarea.up-textarea', "Project for medical DICOM standard. Implementation of DICOM image processing and full Viewer developed in C++ using Qt, VTK and ITK frameworks.")
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(3000)
    await page.waitForSelector('button.up-btn.up-btn-primary.m-0.pull-right')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(1000)

    await page.goto('https://www.upwork.com/ab/portfolios/', {
      waitUntil: "domcontentloaded",
    })
    await page.waitForSelector('input#title')
    await page.type('input#title', 'Video Streaming')
    await page.type('input#completionDate', '02/14/2022')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[value="2"]')
    await page.$eval('input[value="2"]', el => el.click())
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await page.waitForSelector('input[type="file"]')
    await (await page.$("input[type=file]")).uploadFile('./upwork/video.jpg')
    await delay(10000)
    await page.type('textarea.up-textarea', "Video Steaming App")
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(3000)
    await page.waitForSelector('button.up-btn.up-btn-primary.m-0.pull-right')
    await page.$eval('button.up-btn.up-btn-primary.m-0.pull-right', el => el.click())
    await delay(1000)
  } catch (error) {
    console.log("configSetting", error)
    await page.screenshot({ path: 'fullpage.png', fullPage: true })
    console.log(page.url())
    await configSetting(page, item)
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
  const browser = await pt.launch({ "headless": false, args: ['--start-maximized'] })
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 850 });
  await page.goto('https://www.upwork.com/nx/signup/?dest=home', {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('div#onetrust-close-btn-container button[aria-label="Close"]')
  await page.$eval('div#onetrust-close-btn-container button[aria-label="Close"]', el => el.click())

  await page.waitForSelector('div[data-cy="button-box"][data-qa="work"]')
  await page.$eval('div[data-cy="button-box"][data-qa="work"]', el => el.click());
  await page.$eval(`button[type="button"][data-qa="btn-apply"]`, el => el.click());

  await page.waitForSelector('#first-name-input');
  await page.type('#first-name-input', faker.person.firstName("male"));
  await page.type('#last-name-input', faker.person.lastName("male"));
  await page.type('#redesigned-input-email', dummyGmail('lm8361616', start + 30 - inx));
  await page.type('#password-input', 'rewq4321`');
  await page.$eval('[aria-labelledby*="select-a-country"]', el => el.click())
  await page.waitForSelector('[autocomplete="country-name"]');
  await page.type('[autocomplete="country-name"]', item.country)
  await page.$eval('[aria-labelledby="select-a-country"] li', el => el.click())
  await page.$eval('#checkbox-terms', el => el.click());
  await page.$eval('#button-submit-form', el => el.click());

  await delay(10000);

  const verify_link = await readMail();
  console.log(verify_link)
  await page.goto(verify_link, {
    waitUntil: "domcontentloaded",
  });

  // await delay(10000);

  if (page.url().search('login') > 0) {
    await page.waitForSelector('#login_username')
    await page.type("#login_username", dummyGmail('lm8361616', start + 30 - inx))
    await delay(500)
    await page.waitForSelector('#login_password_continue')
    await page.$eval("#login_password_continue", el => el.click())
    await delay(500)
    await page.waitForSelector('#login_password')
    await page.type('#login_password', "rewq4321`")
    await delay(500)
    await page.waitForSelector('#login_control_continue')
    await page.$eval('#login_control_continue', el => el.click())
    await delay(500)
    try {
      await page.waitForSelector('#login_answer', {timeout: 3000})
      await page.type('#login_answer', 'rewq4321`')
      await page.waitForSelector('#login_remember')
      await page.$eval('#login_remember')
      await delay(500)
      await page.waitForSelector('#login_control_continue')
      await page.$eval('#login_control_continue', el => el.click())
    } catch (error) {
      
    }
  }

  await delay(5000);

  await typeinfo(page, item)

  await configSetting(page, item)

  await browser.close()

  await delay((Math.random() * 200 + 100) * 1000)
}, 30);
