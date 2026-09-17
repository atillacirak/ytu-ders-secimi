const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const filePath = 'file:///' + path.resolve(__dirname, 'intibak_not_dokumu.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: 'intibak_not_dokumu.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm'
    }
  });
  await browser.close();
  console.log('PDF successfully created!');
})();
