require('dotenv').config();

const util = require('util');
const _ = require('lodash');
const { Cookie, CookieJar } = require('tough-cookie');
const RecaptchaPlugin = require('@extra/recaptcha');
const sleep = require('sleep-promise');
const { firefox } = require('playwright-extra');
const logger = require('../logger');

const RecaptchaOptions = {
  visualFeedback: true,
  provider: {
    id: '2captcha',
    token: process.env.CAPTCHA_API_KEY,
  },
};
firefox.use(RecaptchaPlugin(RecaptchaOptions));

const Auth = {
  get: async () => {
    if (Auth.auth) {
      return Auth.auth;
    }
    return Auth.refresh();
  },

  refresh: async () => {
    logger.info('Refreshing Walmart auth');

    const cookieJar = new CookieJar();
    let body;

    const browser = await firefox.launch({
      headless: true,
      proxy: {
        server: process.env.PROXY_RANDOM_SERVER,
        username: process.env.PROXY_RANDOM_USERNAME,
        password: process.env.PROXY_RANDOM_PASSWORD,
      },
    });
    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:85.0) Gecko/20100101 Firefox/85.0',
      });

      const page = await context.newPage();

      logger.info('Navigating to login page...');
      await page.goto(
        'https://www.walmart.com/account/login?returnUrl=/pharmacy/clinical-services/immunization/scheduled?imzType=covid',
        {
          waitUntil: 'domcontentloaded',
        }
      );

      await page.solveRecaptchas();

      logger.info('Filling in credentials...');
      await page.fill('input[name=email]', process.env.WALMART_USERNAME);
      await sleep(_.random(50, 150));
      await page.fill('input[name=password]', process.env.WALMART_PASSWORD);
      await sleep(_.random(50, 150));

      const responsePromise = page.waitForResponse((response) =>
        response
          .url()
          .startsWith('https://www.walmart.com/account/electrode/api/signin')
      );

      await page.click('[type=submit]');
      await page.solveRecaptchas();

      const response = await responsePromise;
      logger.info(
        `Signin ajax response: ${response.url()}: ${response.status()}`
      );
      body = await response.json();
      if (!body?.payload?.cid) {
        throw new Error(
          `Login body does not contain expected data: ${response.statusCode}: ${body}`
        );
      }

      logger.info('Getting cookies');
      for (const cookie of await context.cookies()) {
        const putCookie = util.promisify(
          cookieJar.store.putCookie.bind(cookieJar.store)
        );
        await putCookie(
          new Cookie({
            key: cookie.name,
            value: cookie.value,
            domain: cookie.domain.replace(/^\./, ''),
            path: cookie.path,
            expires:
              cookie.expires && cookie.expires !== -1
                ? new Date(cookie.expires * 1000)
                : 'Infinity',
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
          })
        );
      }
    } catch (err) {
      logger.error(err);
      throw err;
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    const auth = {
      cookieJar,
      body,
    };
    Auth.set(auth);

    return auth;
  },

  set: (auth) => {
    Auth.auth = auth;
  },
};

module.exports = Auth;
