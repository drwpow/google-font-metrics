/**
 * Node.js script that takes fonts.yaml and calculates CSS units from those
 * fonts in Puppeteer.
 */

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const puppeteer = require('puppeteer');
const yaml = require('js-yaml');

const FONT_HEIGHT = 800; // all measurements based on an 800px font height
const UNITS = [
  { unit: 'cap', color: 'red' }, // colors help debugging
  { unit: 'ch', color: 'black' },
  { unit: 'em', color: 'yellow' },
  { unit: 'ex', color: 'blue' },
  { unit: 'ic', color: 'green' },
  { unit: 'lh', color: 'orange' },
];

function formatCSVLine(font, style, styleMeasurements) {
  // Order: name, style, genre, subgenre, monospace, [units], foundry, designers, added, updated
  const measurements = UNITS.map(({ unit }) => `"${styleMeasurements[unit]}"`);

  return [
    `"${font.name}"`,
    `"${style.name}"`,
    `"${font.genre}"`,
    `"${font.subgenre || ''}"`,
    `"${font.monospace}"`,
    ...measurements,
    `"${font.foundry || ''}"`,
    `"${font.designers.join(', ')}"`,
    `"${font.added}"`,
    `"${font.updated}"`,
  ].join(',');
}

function googleFontName(font) {
  return font.name.replace(/ /g, '+');
}

function googleFontStyle(style) {
  return `${style.weight}${style.style === 'italic' ? 'i' : ''}`;
}

function fontSource(font) {
  if (font.source) {
    // TODO: local font
    return '';
  }
  // Google font
  const styles = font.styles.map(style => googleFontStyle(style)).join(',');
  return `https://fonts.googleapis.com/css?family=${googleFontName(
    font
  )}:${styles}`;
}

function cssSelector(style) {
  return `font-style__${googleFontStyle(style)}`;
}

function html(font) {
  return `
    <head>
      <style type="text/css">
        .font-test {
          font-family: "${font.name}";
          font-size: ${FONT_HEIGHT}px;
        }
        ${font.styles
          .map(
            style => `
        .${cssSelector(style)} {
          font-weight: ${style.weight};
          font-style: ${style.style};
        }`
          )
          .join('')}
        ${UNITS.map(
          ({ color, unit }) => `
        .${unit} { background: ${color}; height: 16px; width: 1${unit}; }`
        ).join('')}
      </style>
    </head>
    <body>
      <div class="font-test">
      ${font.styles
        .map(
          style => `
        <div class="font-style ${cssSelector(style)}">
          ${UNITS.map(({ unit }) => `<div class="${unit}"></div>`).join('\n')}
        </div>`
        )
        .join('\n        ')}
      </div>
    </body>
  `;
}

async function generateCSV() {
  const timeStart = process.hrtime();
  // Order: name, style, genre, subgenre, monospace, [units], foundry, designers, added, updated
  const csv = [
    `"font family","style","genre","subgenre","monospace",${UNITS.map(
      ({ unit }) => `"${unit}"`
    ).join(',')},"foundry","designers","added","updated"`,
  ];

  const fonts = yaml.safeLoad(
    fs.readFileSync(path.resolve(__dirname, 'fonts.yml'), 'utf8')
  );

  const browser = await puppeteer.launch();

  console.log(chalk.bold('Measuring fonts:'));

  const totalCount = fonts.reduce(
    (total, font) => total + font.styles.length,
    0
  );
  let count = 0;

  // Measure all fonts in parallel
  const fontData = await Promise.all(
    fonts.map(async font => {
      const page = await browser.newPage();
      await page.setContent(html(font));

      // load font & wait for download
      // note: we load all styles at once to save time & reduce requests
      await page.addStyleTag({ url: fontSource(font) });

      const lines = await Promise.all(
        font.styles.map(async style => {
          // Measure each unit in parallel
          const measurements = await Promise.all(
            UNITS.map(async ({ unit }) => {
              const selector = `.${cssSelector(style)} .${unit}`;
              // eslint-disable-next-line no-shadow
              const width = await page.evaluate(selector => {
                const el = document.querySelector(selector);
                return el.getBoundingClientRect().width;
              }, selector);
              return [unit, width];
            })
          );

          // convert array to map (the array won’t be in order)
          const styleMeasurements = measurements.reduce(
            (obj, [unit, width]) => ({ ...obj, [unit]: width }),
            {}
          );

          count += 1;

          console.log(
            chalk.green(
              `✔︎ [${count} / ${totalCount}] ${font.name} ${style.name}`
            )
          );
          return formatCSVLine(font, style, styleMeasurements);
        })
      );

      return lines.join('\n');
    })
  );

  // Add all fonts to CSV
  csv.push(...fontData);

  // Finish
  await browser.close();

  const timeEnd = process.hrtime(timeStart);
  console.log(
    chalk.green(
      `🏁 Done in ${chalk.bold(
        timeEnd[0] + Math.round(timeEnd[1] / 100000000) / 10
      )}s`
    )
  );

  fs.writeFileSync(
    path.resolve(__dirname, 'font-data.csv'),
    [...csv, ''].join('\n'), // newline EOF
    'utf8'
  );

  console.log(chalk.green('📔 font-data.csv updated!'));
}

// Run
generateCSV();
