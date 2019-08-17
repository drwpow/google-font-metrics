const path = require('path');
const fs = require('fs');
const https = require('https');
const chalk = require('chalk');
const yaml = require('js-yaml');

// get genres based on rules / loose matches
function getGenre(name) {
  switch (name) {
    case 'Cardo':
    case 'Libre Caslon':
    case 'PT Serif':
    case 'Quattrocento':
      return ['serif', 'old-style'];
    case 'Literata':
    case 'Lora':
    case 'Merriweather':
    case 'Noto Serif JP':
    case 'Noto Serif KR':
    case 'Noto Serif SC':
    case 'Noto Serif TC':
    case 'Source Serif Pro':
      return ['serif', 'transitional'];
    case 'Bree Serif':
    case 'Crete Round':
    case 'Patua One':
    case 'Roboto Slab':
    case 'IBM Plex Serif':
      return ['serif', 'slab-serif'];
    case 'Abril Fatface':
    case 'DM Serif Display':
    case 'DM Serif Text':
    case 'Playfair Display':
    case 'Playfair Text':
      return ['serif', 'didone'];
    case 'Archivo':
    case 'Archivo Black':
    case 'Archivo Narrow':
    case 'Bungee':
    case 'Bungee Hairline':
    case 'Bungee Inline':
    case 'Bungee Outline':
    case 'Bungee Shade':
    case 'Carrois Gothic':
    case 'Carrois Gothic SC':
    case 'IBM Plex Sans':
    case 'IBM Plex Sans Condensed':
    case 'IBM Plex Mono':
    case 'Karla':
    case 'Libre Franklin':
    case 'Open Sans':
    case 'Red Hat Display':
    case 'Red Hat Text':
    case 'Roboto Condensed':
    case 'Roboto':
    case 'Roboto Mono':
    case 'Rozha One':
    case 'Source Code Pro':
    case 'Source Sans':
    case 'Source Sans Pro':
    case 'Work Sans':
      return ['sans-serif', 'grotesque'];
    case 'Asap':
    case 'Asap Condensed':
    case 'Fira Code':
    case 'Fira Sans':
    case 'Fira Sans Condensed':
    case 'Fira Sans Extra Condensed':
    case 'Fira Mono':
    case 'Hind':
    case 'Hind Guntur':
    case 'Hind Madurai':
    case 'Hind Siliguri':
    case 'Hind Vadodara':
    case 'Lato':
    case 'Merriweather Sans':
    case 'Noto Sans JP':
    case 'PT Sans':
    case 'PT Sans Caption':
    case 'PT Sans Narrow':
    case 'Ubuntu':
      return ['sans-serif', 'humanist'];
    case 'Darker Grotesque':
    case 'DM Sans':
    case 'Lexend Deca':
    case 'Lexend Exa':
    case 'Lexend Giga':
    case 'Lexend Mega':
    case 'Lexend Peta':
    case 'Lexend Tera':
    case 'Lexend Zeta':
    case 'Montserrat':
    case 'Poppins':
    case 'Space Mono':
      return ['sans-serif', 'geometric'];
    default:
      return [];
  }
}

function getFoundry(name) {
  switch (name) {
    case 'Source Code Pro':
    case 'Source Sans':
    case 'Source Sans Pro':
    case 'Source Serif Pro':
      return 'Adobe';
    case 'IBM Plex Sans':
    case 'IBM Plex Sans Condensed':
    case 'IBM Plex Mono':
      return 'Bold Monday';
    case 'Carrois Gothic':
    case 'Carrois Gothic SC':
    case 'Finger Paint':
    case 'Fira Code':
    case 'Fira Sans':
    case 'Fira Sans Condensed':
    case 'Fira Sans Extra Condensed':
    case 'Fira Mono':
    case 'Share':
    case 'Share Tech':
    case 'Share Tech Mono':
      return 'Carrois Apostrophe';
    case 'DM Sans':
    case 'DM Serif Display':
    case 'DM Serif Text':
    case 'Space Mono':
      return 'Colophon';
    case 'Yanone Kaffeesatz':
      return 'Cyreal';
    case 'Alegreya Sans':
    case 'Alegreya Sans SC':
    case 'Merriweather':
    case 'Merriweather Sans':
    case 'Nunito':
    case 'Nunito Sans':
    case 'Roboto':
    case 'Roboto Condensed':
    case 'Roboto Mono':
    case 'Roboto Slab':
    case 'Quattrocento':
    case 'Quattrocento Sans':
      return 'Google Design';
    case 'Halant':
    case 'Hind':
    case 'Hind Guntur':
    case 'Hind Madurai':
    case 'Hind Siliguri':
    case 'Hind Vadodara':
    case 'Kalam':
    case 'Karma':
    case 'Khand':
    case 'Kumar One':
    case 'Kumar One Outline':
    case 'Laila':
    case 'Poppins':
    case 'Rajdhani':
    case 'Rozha One':
    case 'Sarpanch':
    case 'Teko':
    case 'Tillana':
      return 'Indian Type Foundry';
    case 'Belgrano':
    case 'Flamenco':
    case 'Fugaz One':
    case 'Medula One':
    case 'Patua One':
    case 'Sofia':
      return 'LatinoType';
    case 'Abel':
      return 'MADType';
    case 'PT Sans':
    case 'PT Sans Caption':
    case 'PT Sans Narrow':
    case 'PT Serif':
      return 'ParaType';
    case 'Red Hat Display':
    case 'Red Hat Text':
      return 'Pentagram';
    case 'Spectral':
    case 'Spectral SC':
      return 'Production Type';
    case 'Abril Fatface':
    case 'Bree Serif':
    case 'Crete Round':
    case 'Jockey One':
    case 'Literata':
      return 'TypeTogether';
    default:
      return undefined;
  }
}

const FONT_GENRE_FALLBACK = {
  'Sans Serif': 'sans-serif',
  Monospace: 'sans-serif',
  Handwriting: 'calligraphic',
  Serif: 'serif',
};

const STYLE_NAME = {
  '100': 'thin',
  '100i': 'thin italic',
  '200': 'extra-light',
  '200i': 'extra-light italic',
  '300': 'light',
  '300i': 'light italic',
  '400': 'regular',
  '400i': 'regular italic',
  '500': 'medium',
  '500i': 'medium italic',
  '600': 'semi-bold',
  '600i': 'semi-bold italic',
  '700': 'bold',
  '700i': 'bold italic',
  '800': 'extra-bold',
  '800i': 'extra-bold italic',
  '900': 'black',
  '900i': 'black italic',
};

function format(googleFont) {
  const [genre, subgenre] = getGenre(googleFont.family);
  const foundry = getFoundry(googleFont.family);

  const font = {
    name: googleFont.family,
    genre:
      genre ||
      FONT_GENRE_FALLBACK[googleFont.category] ||
      googleFont.category.toLowerCase(),
    monospace: googleFont.category === 'Monospace',
    styles: Object.keys(googleFont.fonts).map(slug => ({
      name: STYLE_NAME[slug] || undefined,
      weight: parseInt(slug.replace(/i$/, ''), 10),
      style: slug.includes('i') ? 'italic' : 'normal',
    })),
    designers: googleFont.designers,
    added: googleFont.dateAdded,
    updated: googleFont.lastModified,
  };

  if (subgenre) font.subgenre = subgenre;
  if (foundry) font.foundry = foundry;

  return font;
}

https.get(`https://fonts.google.com/metadata/fonts`, res => {
  let rawData = '';

  res.on('data', chunk => {
    rawData += chunk;
  });

  res.on('end', () => {
    const parsed = JSON.parse(rawData.replace(/\)]}'\n/, ''));
    const allFonts = parsed.familyMetadataList;

    const output = yaml.safeDump(allFonts.map(data => format(data)));

    fs.writeFileSync(path.resolve(__dirname, 'fonts.yml'), output, 'utf8');
    console.log(chalk.green(`︎ Fonts updated ${new Date().toGMTString()}`));
  });
});
