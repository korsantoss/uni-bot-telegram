process.env.NTBA_FIX_319 = 1;

const express = require('express');
const app = express();

app.set('port', (process.env.PORT || 5000));

app.get('/', (req, res) => {
  const result = 'App is running!';
  res.send(result);
}).listen(app.get('port'), () => {
  console.log('App is running, server is listening on port', app.get('port'));
});

const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');

const token = process.env.TOKEN;

const bot = new TelegramBot(token, {polling: true});

const chromeOptions = {
  headless: true,
  defaultViewport: null,
  args: [
      "--incognito",
      "--no-sandbox",
      "--single-process",
      "--no-zygote"
  ],
};

// comando para iniciar o bot
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `Seja bem vindo!\n\nComandos:\n/atvs - procurar as atividades disponíveis`);
});

// comando para listar as atividades
bot.onText(/\/atvs/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Pera aê! Tô procurando as atividades.");
  const browser = await puppeteer.launch(chromeOptions);
  try {
    const page = await browser.newPage();
    await page.goto('https://ftc.blackboard.com/ultra/calendar');
    await page.waitForSelector('#agree_button');
    await page.click('#agree_button');
    await page.$eval('#user_id', (user, value) => user.value = value, process.env.USER_BB);
    await page.$eval('#password', (password, value) => password.value = value, process.env.PASSWORD_BB);
    await page.waitForSelector('#entry-login');
    await page.click('#entry-login');

    bot.sendMessage(msg.chat.id, "Só mais um instante!!");

    await page.waitForSelector('#bb-calendar1-deadline');
    await page.click('#bb-calendar1-deadline');
    await page.waitForSelector('div.element-card.due-item');

    const atvList = await page.evaluate(() => {
      const atvsElements = document.querySelectorAll('div.element-card.due-item');
      const atvsArray = [];
      atvsElements.forEach((atv) => {
        const name = atv.querySelector('div.name a').innerText;
        const data_entrega = atv.querySelector('div.content > span').innerText;
        const disciplina = atv.querySelector('div.content a').innerText;
        const textAtv = `${name}\n${data_entrega}\n${disciplina}\n\n`;
        atvsArray.push(textAtv);
      });
      const result = atvsArray.splice(",").join("");
      return result;
  });
    bot.sendMessage(msg.chat.id, "Pronto!!!");
    bot.sendMessage(msg.chat.id, atvList);
    await browser.close();
  } catch(e) {
    bot.sendMessage(msg.chat.id, "Ops!! Ocorreu um erro.");
    await browser.close();
  }
});