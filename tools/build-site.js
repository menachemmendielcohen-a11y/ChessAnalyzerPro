// Generates the static website (Hebrew + English pages, sitemap.xml, robots.txt).
// Usage:  node tools/build-site.js https://your-domain.example
// Links (download / Chrome store / YouTube) are NOT set here - edit website/config.js.
'use strict';
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'website');
const urlFile = path.join(__dirname, 'site-url.txt');
let SITE = (process.argv[2] || (fs.existsSync(urlFile) ? fs.readFileSync(urlFile, 'utf8') : '') || 'https://chessanalyzerpro.example').trim().replace(/\/+$/, '');
fs.writeFileSync(urlFile, SITE + '\n');
const VERSION = require('../app/package.json').version;
const TODAY = new Date().toISOString().slice(0, 10);

const CLS = [
  ['brilliant', '!!'], ['great', '!'], ['best', '★'], ['good', '✓'],
  ['inaccuracy', '?!'], ['mistake', '?'], ['blunder', '??'], ['miss', '✕'],
];

const L = {
  he: {
    dir: 'rtl', locale: 'he_IL', base: '', other: 'en', otherLabel: 'English',
    nav: { home: 'דף הבית', install: 'הוראות התקנה', features: 'יכולות', video: 'סרטון הדרכה', faq: 'שאלות נפוצות' },
    home: {
      title: 'Chess Analyzer Pro – תוכנה לניתוח שחמט בחינם עם Stockfish',
      desc: 'Chess Analyzer Pro להורדה בחינם: תוכנת שחמט ל־Windows לניתוח משחקי Chess.com עם מנוע השחמט Stockfish מובנה. סימון טעויות, מהלכים מבריקים, דיוק ומד יתרון – בעברית.',
      eyebrow: 'חינם · קוד פתוח · בעברית',
      h1: 'ניתוח משחקי שחמט מקצועי, בחינם, על המחשב שלכם',
      lead: 'Chess Analyzer Pro היא תוכנת שחמט חינמית ל־Windows שמנתחת את המשחקים שלכם מ־Chess.com בעזרת מנוע השחמט Stockfish – מובנה בתוכנה, בלי התקנות נוספות ובלי אינטרנט.',
      btnDownload: 'הורדת Chess Analyzer Pro ל־Windows',
      btnChrome: 'התקנת התוסף ל־Chrome',
      soonDownload: 'קובץ ההתקנה יהיה זמין להורדה כאן בקרוב.',
      soonChrome: 'התוסף ממתין לאישור בחנות Chrome Web Store. הקישור יופיע כאן מיד עם הפרסום.',
      extZip: 'בינתיים: הורדת התוסף כקובץ ZIP להתקנה ידנית',
      meta: 'גרסה עדכנית: <b data-version>' + VERSION + '</b> · Windows 10/11 (64 ביט) · קובץ התקנה אחד הכולל את Stockfish',
      shotAlt: 'צילום מסך של Chess Analyzer Pro: לוח שחמט עם חיצי המלצה, מד יתרון, סיכום דיוק ורשימת מהלכים מסווגים',
      howTitle: 'איך זה עובד?',
      howLead: 'המערכת בנויה משני חלקים שעובדים יחד: תוסף קטן לדפדפן ותוכנת ניתוח למחשב.',
      how: [
        ['⬇️', 'מורידים את המשחק', 'תוסף ה־Chrome מוסיף כפתור לעמוד המשחק ב־Chess.com ושומר כל משחק שהסתיים כקובץ PGN.'],
        ['📂', 'פותחים בתוכנה', 'לוחצים על "בחר משחק מהמחשב", בוחרים את קובץ ה־PGN – והמשחק מוצג על לוח אינטראקטיבי.'],
        ['🔍', 'מקבלים ניתוח מלא', 'מנוע השחמט בודק כל מהלך, מסמן טעויות והזדמנויות ומראה מה היה עדיף לשחק.'],
      ],
      featTitle: 'היכולות המרכזיות',
      featLead: 'כל מה שצריך כדי להבין איפה שיחקתם טוב, איפה טעיתם ואיך להשתפר – בתוכנה לניתוח שחמט בחינם.',
      feats: [
        ['🏷️', 'סיווג איכות לכל מהלך', 'מבריק, מצוין, הטוב ביותר, טוב, אי־דיוק, טעות, טעות חמורה והחמצה – עם סמל וצבע, ליד המהלך וגם על הלוח.'],
        ['🎯', 'שלושת המהלכים המומלצים', 'בכל עמדה מוצגים שלושה חיצים על הלוח: ירוק למהלך הטוב ביותר, כחול לשני וכתום לשלישי.'],
        ['📊', 'מד יתרון', 'מד אנכי לצד הלוח מראה מי מוביל, עם הערכה מספרית של המנוע שמתעדכנת בכל מהלך.'],
        ['💯', 'אחוזי דיוק וסיכום משחק', 'דיוק (Accuracy) לכל שחקן וספירה של המהלכים המבריקים, המצוינים, הטעויות והטעויות החמורות.'],
        ['💡', 'הסבר ומהלך עדיף', 'לכל מהלך מוצג הסבר קצר מדוע קיבל את הסיווג, ובמקרה של טעות – המהלך שהיה טוב יותר.'],
        ['🔌', 'Stockfish מובנה, בלי אינטרנט', 'מנוע שחמט חינמי למחשב שמותקן יחד עם התוכנה ופועל אוטומטית ברקע. כל הניתוח נעשה אצלכם במחשב.'],
      ],
      legendTitle: 'מה אומר כל סימון?',
      legendLead: 'התוכנה מסווגת כל מהלך לפי השינוי בסיכויי הניצחון שמחשב המנוע.',
      cls: {
        brilliant: ['מהלך מבריק', 'מהלך יוצא דופן, לרוב הקרבת כלי שהמנוע מאשר.'],
        great: ['מהלך מצוין', 'המהלך היחיד ששומר על העמדה או על היתרון.'],
        best: ['המהלך הטוב ביותר', 'בדיוק מה שהמנוע ממליץ.'],
        good: ['מהלך טוב', 'מהלך נכון, גם אם לא המדויק ביותר.'],
        inaccuracy: ['אי־דיוק', 'מהלך מעט פחות מוצלח.'],
        mistake: ['טעות', 'מהלך שפוגע במצב השחקן.'],
        blunder: ['טעות חמורה', 'מהלך שפוגע בעמדה בצורה משמעותית.'],
        miss: ['מהלך שהוחמץ', 'החמצת הזדמנות אחרי טעות של היריב.'],
      },
      arrows: ['המהלך הטוב ביותר', 'המהלך השני בטיבו', 'המהלך השלישי בטיבו'],
      videoTitle: 'סרטון הדרכה',
      videoLead: 'סרטון קצר שמראה את כל התהליך: התקנה, הורדת משחק מ־Chess.com וניתוח שלו.',
      videoSoon: 'סרטון ההדרכה יעלה לכאן בקרוב',
      aboutTitle: 'תוכנת שחמט עם Stockfish – ולא האתר הרשמי של Stockfish',
      about: [
        'מחפשים מנוע שחמט להורדה בחינם? Chess Analyzer Pro היא תוכנה לניתוח משחקי שחמט שכוללת בתוכה את Stockfish, אחד ממנועי השחמט החזקים בעולם. ההתקנה מוסיפה למחשב גם את התוכנה וגם את המנוע, כך שאין צורך בהורדת מנוע שחמט למחשב בנפרד או בהגדרות ידניות.',
        'חשוב להבהיר: זהו אינו האתר הרשמי של Stockfish, והפרויקט אינו קשור למפתחי Stockfish או ל־Chess.com. Stockfish מפותח על ידי קהילת Stockfish ומופץ ברישיון GPLv3; האתר הרשמי שלו הוא <a href="https://stockfishchess.org" rel="noopener" target="_blank">stockfishchess.org</a>.',
        'Chess Analyzer Pro עצמה היא תוכנה חופשית בקוד פתוח תחת רישיון GNU GPL גרסה 3.',
      ],
      fair: 'משחק הוגן: הניתוח מיועד למשחקים שהסתיימו בלבד. התוסף אינו מוריד משחק שעדיין מתנהל, והתוכנה אינה מנתחת משחק לא גמור.',
      faqTitle: 'שאלות נפוצות',
      faq: [
        ['האם Chess Analyzer Pro באמת בחינם?', 'כן. התוכנה והתוסף חינמיים לגמרי, ללא מנוי וללא הגבלה על מספר המשחקים. זו תוכנה בקוד פתוח תחת רישיון GPLv3.'],
        ['האם צריך להוריד את Stockfish בנפרד?', 'לא. מנוע השחמט Stockfish כלול בקובץ ההתקנה ומופעל אוטומטית ברקע כשבוחרים משחק לניתוח.'],
        ['האם צריך חיבור לאינטרנט כדי לנתח?', 'לא. כל הניתוח מתבצע במחשב שלכם. אינטרנט נדרש רק כדי להוריד את המשחק מ־Chess.com.'],
        ['אילו קבצים התוכנה פותחת?', 'קובצי PGN – הפורמט המקובל לשמירת משחקי שחמט. אפשר לפתוח גם קובצי PGN ממקורות אחרים, לא רק מ־Chess.com.'],
        ['אפשר להשתמש בתוכנה בזמן משחק?', 'לא. התוכנה מיועדת ללמידה ממשחקים שהסתיימו. שימוש במנוע בזמן משחק פעיל הוא רמאות ואסור לפי כללי Chess.com.'],
        ['באילו מערכות הפעלה התוכנה עובדת?', 'Windows 10 ו־Windows 11 בגרסת 64 ביט. התוסף פועל בדפדפן Chrome ובדפדפנים מבוססי Chromium.'],
      ],
      ctaTitle: 'מוכנים לנתח את המשחק הבא?',
      ctaLink: 'להוראות ההתקנה המלאות',
    },
    install: {
      title: 'הוראות התקנה ושימוש – Chess Analyzer Pro',
      desc: 'מדריך פשוט בעברית: התקנת תוסף Chrome, הורדת תוכנת השחמט ל־Windows, הורדת משחק מ־Chess.com כקובץ PGN, פתיחתו ב־Chess Analyzer Pro וקריאת תוצאות הניתוח.',
      h1: 'הוראות התקנה ושימוש',
      lead: 'שישה צעדים פשוטים – מההתקנה ועד לניתוח המשחק הראשון. אין צורך בידע טכני.',
      steps: [
        ['מתקינים את תוסף ה־Chrome', 'לוחצים על הכפתור "התקנת התוסף ל־Chrome". בעמוד שנפתח בחנות Chrome Web Store לוחצים על "הוספה ל־Chrome" ומאשרים. זהו – התוסף מותקן. עד שהתוסף יאושר בחנות אפשר להתקין אותו ידנית: מורידים את קובץ ה־ZIP של התוסף, מחלצים אותו לתיקייה, פותחים בדפדפן את chrome://extensions, מפעילים "מצב מפתח" (Developer mode), לוחצים "טען פריט unpacked" (Load unpacked) ובוחרים את התיקייה שחולצה.', 'chrome'],
        ['מורידים את תוכנת ה־Windows', 'לוחצים על "הורדת Chess Analyzer Pro ל־Windows". הקובץ ChessAnalyzerProSetup.exe יישמר בתיקיית ההורדות.', 'download'],
        ['מתקינים את התוכנה', 'לוחצים פעמיים על הקובץ שהורד וממשיכים לפי ההוראות על המסך. מנוע השחמט Stockfish מותקן אוטומטית יחד עם התוכנה – אין צורך להוריד או להגדיר שום דבר נוסף. ייתכן ש־Windows יציג אזהרה על תוכנה לא מוכרת; במקרה כזה לוחצים על "מידע נוסף" ואז על "הפעל בכל זאת".'],
        ['מורידים משחק מ־Chess.com', 'נכנסים ל־Chess.com ופותחים משחק שהסתיים (למשל מתוך "ארכיון המשחקים"). בפינה התחתונה של העמוד יופיע כפתור ירוק "הורדת המשחק (PGN)". לחיצה עליו שומרת את המשחק כקובץ PGN בתיקיית ההורדות. משחק שעדיין מתנהל לא ניתן להוריד.'],
        ['פותחים את המשחק בתוכנה', 'מפעילים את Chess Analyzer Pro, לוחצים על "בחר משחק מהמחשב" ובוחרים את קובץ ה־PGN שהורד. אפשר גם לגרור את הקובץ אל חלון התוכנה.'],
        ['מנתחים וקוראים את התוצאות', 'הניתוח מתחיל מעצמו ונמשך בדרך כלל פחות מדקה. עוברים בין המהלכים עם הכפתורים ◀ ▶ או עם מקשי החיצים במקלדת, ורואים:', null, [
          'סמל צבעוני ליד כל מהלך – ברשימת המהלכים ועל הלוח.',
          'הסבר קצר על המהלך, ובמקרה של טעות – המהלך שהיה טוב יותר.',
          'שלושה חיצים על הלוח: ירוק (הטוב ביותר), כחול (השני) וכתום (השלישי).',
          'מד היתרון לצד הלוח, שמראה מי מוביל.',
          'אחוזי הדיוק של כל שחקן וסיכום המשחק.',
        ]],
      ],
      note: 'טיפ: בתפריט "עומק ניתוח" אפשר לבחור בין ניתוח מהיר, רגיל ומעמיק. ניתוח מעמיק מדויק יותר אבל אורך יותר זמן.',
      legendTitle: 'מקרא הסימונים',
      backHome: 'חזרה לדף הבית',
    },
    footer: {
      license: 'Chess Analyzer Pro היא תוכנה חופשית בקוד פתוח תחת רישיון <a href="https://www.gnu.org/licenses/gpl-3.0.html" rel="noopener" target="_blank">GNU GPL גרסה 3</a>. התוכנה כוללת את מנוע השחמט Stockfish (GPLv3) – <a href="https://github.com/official-stockfish/Stockfish" rel="noopener" target="_blank">קוד המקור של Stockfish</a>.',
      disclaimer: 'פרויקט עצמאי. אינו האתר הרשמי של Stockfish ואינו קשור ל־Stockfish או ל־Chess.com.',
      source: 'קוד המקור של Chess Analyzer Pro',
      sourceSoon: '(קישור לקוד המקור יתווסף עם פרסום התוכנה)',
    },
  },
  en: {
    dir: 'ltr', locale: 'en_US', base: 'en/', other: 'he', otherLabel: 'עברית',
    nav: { home: 'Home', install: 'Installation guide', features: 'Features', video: 'Video tutorial', faq: 'FAQ' },
    home: {
      title: 'Chess Analyzer Pro – Free Chess Analysis Software with Stockfish',
      desc: 'Chess Analyzer Pro download: a free chess analyzer for Windows with the Stockfish chess engine built in. Analyse Chess.com games from PGN files – blunders, brilliant moves, accuracy and an evaluation bar.',
      eyebrow: 'Free · Open source · Works offline',
      h1: 'Professional chess game analysis, free, on your own PC',
      lead: 'Chess Analyzer Pro is a free chess analyzer for Windows. It reviews your Chess.com games with the Stockfish chess engine – built in, with nothing extra to install and no internet needed.',
      btnDownload: 'Download Chess Analyzer Pro for Windows',
      btnChrome: 'Install the Chrome extension',
      soonDownload: 'The installer will be available for download here soon.',
      soonChrome: 'The extension is awaiting approval in the Chrome Web Store. The link will appear here as soon as it is published.',
      extZip: 'Meanwhile: download the extension as a ZIP for manual installation',
      meta: 'Latest version: <b data-version>' + VERSION + '</b> · Windows 10/11 (64-bit) · One installer, Stockfish included',
      shotAlt: 'Screenshot of Chess Analyzer Pro: chess board with suggestion arrows, evaluation bar, accuracy summary and a classified move list',
      howTitle: 'How does it work?',
      howLead: 'Two parts work together: a small browser extension and a desktop analysis program.',
      how: [
        ['⬇️', 'Download the game', 'The Chrome extension adds a button to the Chess.com game page and saves any finished game as a PGN file.'],
        ['📂', 'Open it in the program', 'Click "Choose a game from your computer", pick the PGN file, and the game appears on an interactive board.'],
        ['🔍', 'Get a full analysis', 'The chess engine checks every move, marks mistakes and missed chances, and shows what would have been better.'],
      ],
      featTitle: 'Key features',
      featLead: 'Everything you need from a chess game analysis tool to see where you played well, where you went wrong and how to improve.',
      feats: [
        ['🏷️', 'A quality label for every move', 'Brilliant, Great, Best, Good, Inaccuracy, Mistake, Blunder and Miss – with an icon and colour, next to the move and on the board.'],
        ['🎯', 'Top three engine moves', 'Three arrows on the board in every position: green for the best move, blue for the second and orange for the third.'],
        ['📊', 'Evaluation bar', 'A vertical bar beside the board shows who is ahead, with the engine\'s numeric evaluation updated on every move.'],
        ['💯', 'Accuracy and game summary', 'An accuracy percentage for each player and a count of brilliant moves, great moves, mistakes and blunders.'],
        ['💡', 'Explanations and better moves', 'Every move comes with a short reason for its label and, after a mistake, the move that would have been better.'],
        ['🔌', 'Stockfish built in, fully offline', 'A free chess engine that installs together with the program and starts automatically in the background. All analysis stays on your PC.'],
      ],
      legendTitle: 'What does each mark mean?',
      legendLead: 'Each move is classified by how much it changed the winning chances calculated by the engine.',
      cls: {
        brilliant: ['Brilliant', 'An exceptional move, usually a piece sacrifice the engine approves.'],
        great: ['Great move', 'The only move that holds the position or keeps the advantage.'],
        best: ['Best move', 'Exactly what the engine recommends.'],
        good: ['Good move', 'A sound move, even if not the most precise.'],
        inaccuracy: ['Inaccuracy', 'A slightly weaker move.'],
        mistake: ['Mistake', 'A move that hurts the player\'s position.'],
        blunder: ['Blunder', 'A move that seriously damages the position.'],
        miss: ['Miss', 'A missed chance after the opponent\'s error.'],
      },
      arrows: ['Best move', 'Second-best move', 'Third-best move'],
      videoTitle: 'Video tutorial',
      videoLead: 'A short video that walks through everything: installing, downloading a game from Chess.com and analysing it.',
      videoSoon: 'The tutorial video will be added here soon',
      videoNote: 'The video has Hebrew captions.',
      aboutTitle: 'A Stockfish chess analyzer – not the official Stockfish website',
      about: [
        'Looking for a free chess engine download? Chess Analyzer Pro is chess analysis software that ships with Stockfish, one of the strongest chess engines in the world. One installer sets up both the PGN analyzer and the engine, so there is no separate engine download and nothing to configure.',
        'To be clear: this is not the official Stockfish website, and the project is not affiliated with the Stockfish developers or with Chess.com. Stockfish is developed by the Stockfish community and distributed under the GPLv3; its official site is <a href="https://stockfishchess.org" rel="noopener" target="_blank">stockfishchess.org</a>.',
        'Chess Analyzer Pro itself is free, open-source software released under the GNU GPL version 3.',
      ],
      fair: 'Fair play: analysis is for finished games only. The extension will not download a game that is still in progress, and the program will not analyse an unfinished game.',
      faqTitle: 'Frequently asked questions',
      faq: [
        ['Is Chess Analyzer Pro really free?', 'Yes. The program and the extension are completely free, with no subscription and no limit on the number of games. It is open-source software under the GPLv3.'],
        ['Do I need to download Stockfish separately?', 'No. The Stockfish chess engine is included in the installer and starts automatically in the background when you pick a game.'],
        ['Do I need an internet connection to analyse?', 'No. All analysis runs on your computer. You only need the internet to download the game from Chess.com.'],
        ['Which files can it open?', 'PGN files – the standard format for chess games. PGN files from other sources work too, not only Chess.com.'],
        ['Can I use it during a game?', 'No. The program is for learning from finished games. Using an engine during a live game is cheating and against Chess.com rules.'],
        ['Which systems are supported?', 'Windows 10 and Windows 11, 64-bit. The extension works in Chrome and Chromium-based browsers.'],
      ],
      ctaTitle: 'Ready to analyse your next game?',
      ctaLink: 'Read the full installation guide',
    },
    install: {
      title: 'Installation & User Guide – Chess Analyzer Pro',
      desc: 'A simple step-by-step guide: install the Chrome extension, download the free chess analyzer for Windows, save a Chess.com game as PGN, open it in Chess Analyzer Pro and read the analysis.',
      h1: 'Installation and user guide',
      lead: 'Six simple steps from installing to analysing your first game. No technical knowledge needed.',
      steps: [
        ['Install the Chrome extension', 'Click "Install the Chrome extension". On the Chrome Web Store page that opens, click "Add to Chrome" and confirm. That is it – the extension is installed. Until the extension is approved in the store you can install it manually: download the extension ZIP, extract it to a folder, open chrome://extensions, turn on "Developer mode", click "Load unpacked" and pick the extracted folder.', 'chrome'],
        ['Download the Windows program', 'Click "Download Chess Analyzer Pro for Windows". The file ChessAnalyzerProSetup.exe is saved to your Downloads folder.', 'download'],
        ['Install the program', 'Double-click the downloaded file and follow the on-screen steps. The Stockfish chess engine is installed automatically with the program – nothing else to download or set up. Windows may warn about an unrecognised app; if so, click "More info" and then "Run anyway".'],
        ['Download a game from Chess.com', 'Go to Chess.com and open a finished game (for example from your game archive). A green "Download game (PGN)" button appears in the bottom corner of the page. Clicking it saves the game as a PGN file in your Downloads folder. Games still in progress cannot be downloaded.'],
        ['Open the game in the program', 'Start Chess Analyzer Pro, click "Choose a game from your computer" and pick the PGN file you downloaded. You can also drag the file into the program window.'],
        ['Analyse and read the results', 'Analysis starts by itself and usually takes under a minute. Step through the moves with the ◀ ▶ buttons or the arrow keys, and you will see:', null, [
          'A coloured icon next to every move – in the move list and on the board.',
          'A short explanation of the move and, after a mistake, the better move.',
          'Three arrows on the board: green (best), blue (second) and orange (third).',
          'The evaluation bar beside the board, showing who is ahead.',
          'Each player\'s accuracy percentage and the game summary.',
        ]],
      ],
      note: 'Tip: the "Analysis depth" menu lets you choose fast, normal or deep analysis. Deep analysis is more precise but takes longer.',
      legendTitle: 'Legend',
      backHome: 'Back to the home page',
    },
    footer: {
      license: 'Chess Analyzer Pro is free, open-source software under the <a href="https://www.gnu.org/licenses/gpl-3.0.html" rel="noopener" target="_blank">GNU GPL version 3</a>. It includes the Stockfish chess engine (GPLv3) – <a href="https://github.com/official-stockfish/Stockfish" rel="noopener" target="_blank">Stockfish source code</a>.',
      disclaimer: 'An independent project. Not the official Stockfish website and not affiliated with Stockfish or Chess.com.',
      source: 'Chess Analyzer Pro source code',
      sourceSoon: '(a link to the source code will be added when the program is published)',
    },
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pageUrl = (lang, page) => `${SITE}/${L[lang].base}${page === 'index' ? '' : page + '.html'}`;

function head(lang, page, t, jsonld) {
  const l = L[lang];
  const root = lang === 'he' ? '' : '../';
  const url = pageUrl(lang, page);
  return `<!doctype html>
<html lang="${lang}" dir="${l.dir}" data-root="${root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="he" href="${pageUrl('he', page)}">
<link rel="alternate" hreflang="en" href="${pageUrl('en', page)}">
<link rel="alternate" hreflang="x-default" href="${pageUrl('en', page)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<!-- Google Search Console: paste your verification tag on the next line, e.g.
<meta name="google-site-verification" content="YOUR_CODE_HERE"> -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Chess Analyzer Pro">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/screenshot-analysis.png">
<meta property="og:locale" content="${l.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#12141a">
<link rel="icon" href="${root}favicon.ico">
<link rel="apple-touch-icon" href="${root}assets/logo.png">
<link rel="stylesheet" href="${root}assets/site.css">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
<header class="site-header"><div class="wrap">
  <a class="brand" href="${page === 'index' ? '#top' : './'}"><img src="${root}assets/logo.png" alt="" width="38" height="38">Chess Analyzer Pro</a>
  <nav class="nav" aria-label="${lang === 'he' ? 'ניווט ראשי' : 'Main'}">
    <a href="./"${page === 'index' ? ' aria-current="page"' : ''}>${l.nav.home}</a>
    <a href="./#features">${l.nav.features}</a>
    <a href="install.html"${page === 'install' ? ' aria-current="page"' : ''}>${l.nav.install}</a>
    <a href="./#video">${l.nav.video}</a>
    <a href="./#faq">${l.nav.faq}</a>
    <a class="lang" href="${lang === 'he' ? 'en/' : '../'}${page === 'index' ? '' : page + '.html'}" lang="${l.other}" hreflang="${l.other}">${l.otherLabel}</a>
  </nav>
</div></header>
<main id="top">`;
}

function foot(lang) {
  const l = L[lang];
  const root = lang === 'he' ? '' : '../';
  return `</main>
<footer class="site-footer"><div class="wrap">
  <nav aria-label="${lang === 'he' ? 'קישורי תחתית' : 'Footer'}"><a href="./">${l.nav.home}</a><a href="install.html">${l.nav.install}</a><a href="./#faq">${l.nav.faq}</a></nav>
  <p>${l.footer.license}</p>
  <p><a data-link="source">${l.footer.source}</a> <span data-soon="source" hidden>${l.footer.sourceSoon}</span></p>
  <p>${l.footer.disclaimer}</p>
  <p>© <span id="year">2026</span> Chess Analyzer Pro</p>
</div></footer>
<script src="${root}config.js"></script>
<script src="${root}assets/site.js" defer></script>
</body>
</html>
`;
}

function cta(lang, kinds = ['download', 'chrome']) {
  const h = L[lang].home;
  const one = {
    download: `<div class="cta-item"><a class="btn btn-primary" data-link="download" download>⬇ ${h.btnDownload}</a><span class="soon" data-soon="download" hidden>${h.soonDownload}</span></div>`,
    chrome: `<div class="cta-item"><a class="btn btn-secondary" data-link="chrome">🧩 ${h.btnChrome}</a><span class="soon" data-soon="chrome" hidden>${h.soonChrome}</span><a class="alt-link" data-link="extzip">📦 ${h.extZip}</a></div>`,
  };
  return `<div class="cta">${kinds.map((k) => one[k]).join('')}</div>`;
}

function legend(lang) {
  const c = L[lang].home.cls;
  return `<ul class="legend">${CLS.map(([k, s]) => `<li><span class="badge" style="background:var(--c-${k})" aria-hidden="true">${s}</span><span><b>${c[k][0]}</b><span class="t">${c[k][1]}</span></span></li>`).join('')}</ul>`;
}

function home(lang) {
  const l = L[lang];
  const h = l.home;
  const root = lang === 'he' ? '' : '../';
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Chess Analyzer Pro',
      applicationCategory: 'GameApplication', applicationSubCategory: 'Chess analysis software', operatingSystem: 'Windows 10, Windows 11',
      softwareVersion: VERSION, description: h.desc, url: pageUrl(lang, 'index'), image: `${SITE}/assets/screenshot-analysis.png`,
      inLanguage: ['he', 'en'], license: 'https://www.gnu.org/licenses/gpl-3.0.html', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Chess Analyzer Pro', alternateName: 'ChessAnalyzerPro', url: SITE + '/', inLanguage: lang },
    {
      '@context': 'https://schema.org', '@type': 'VideoObject',
      name: `${h.videoTitle} – Chess Analyzer Pro`, description: h.videoLead,
      thumbnailUrl: `${SITE}/assets/tutorial-poster.jpg`, uploadDate: '2026-11-17', duration: 'PT1M28S',
      contentUrl: `${SITE}/assets/tutorial.mp4`, inLanguage: 'he',
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: h.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ];
  const colors = ['#45b34a', '#3b82f6', '#f59e0b'];
  return `${head(lang, 'index', h, jsonld)}
<div class="hero"><div class="wrap hero-grid">
  <div>
    <span class="eyebrow">${h.eyebrow}</span>
    <h1>${h.h1}</h1>
    <p class="lead">${h.lead}</p>
    ${cta(lang)}
    <p class="meta">${h.meta}</p>
  </div>
  <img class="shot" src="${root}assets/screenshot-analysis.png" width="1783" height="974" alt="${esc(h.shotAlt)}" fetchpriority="high">
</div></div>

<section><div class="wrap">
  <div class="section-head"><h2>${h.howTitle}</h2><p class="muted">${h.howLead}</p></div>
  <div class="grid">${h.how.map(([i, a, b]) => `<div class="card"><div class="ico" aria-hidden="true">${i}</div><h3>${a}</h3><p>${b}</p></div>`).join('')}</div>
</div></section>

<section class="alt" id="features"><div class="wrap">
  <div class="section-head"><h2>${h.featTitle}</h2><p class="muted">${h.featLead}</p></div>
  <div class="grid">${h.feats.map(([i, a, b]) => `<div class="card"><div class="ico" aria-hidden="true">${i}</div><h3>${a}</h3><p>${b}</p></div>`).join('')}</div>
</div></section>

<section><div class="wrap">
  <div class="section-head"><h2>${h.legendTitle}</h2><p class="muted">${h.legendLead}</p></div>
  ${legend(lang)}
  <ul class="arrows-list">${h.arrows.map((a, i) => `<li><span class="sw" style="background:${colors[i]}" aria-hidden="true"></span>${a}</li>`).join('')}</ul>
</div></section>

<section class="alt" id="video"><div class="wrap">
  <div class="section-head"><h2>${h.videoTitle}</h2><p class="muted">${h.videoLead}</p></div>
  <div class="video" id="video-frame" data-title="${esc(h.videoTitle)} – Chess Analyzer Pro"><div><span class="play" aria-hidden="true">▶</span>${h.videoSoon}</div></div>${h.videoNote ? `\n  <p class="video-note muted">${h.videoNote}</p>` : ''}
</div></section>

<section><div class="wrap">
  <div class="section-head"><h2>${h.aboutTitle}</h2></div>
  ${h.about.map((p) => `<p>${p}</p>`).join('\n  ')}
  <p class="note">${h.fair}</p>
</div></section>

<section class="alt" id="faq"><div class="wrap">
  <div class="section-head"><h2>${h.faqTitle}</h2></div>
  ${h.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('\n  ')}
</div></section>

<section id="download"><div class="wrap">
  <div class="section-head"><h2>${h.ctaTitle}</h2></div>
  ${cta(lang)}
  <p class="meta"><a href="install.html">${h.ctaLink}</a></p>
</div></section>
${foot(lang)}`;
}

function install(lang) {
  const l = L[lang];
  const t = l.install;
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: l.nav.home, item: pageUrl(lang, 'index') },
        { '@type': 'ListItem', position: 2, name: l.nav.install, item: pageUrl(lang, 'install') },
      ],
    },
  ];
  return `${head(lang, 'install', t, jsonld)}
<div class="hero"><div class="wrap">
  <h1>${t.h1}</h1>
  <p class="lead">${t.lead}</p>
</div></div>
<section><div class="wrap">
  <ol class="steps">
${t.steps.map(([a, b, btn, list]) => `    <li><h2 style="font-size:21px;margin:0">${a}</h2><p>${b}</p>${list ? `<ul>${list.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}${btn ? `<div style="margin-top:14px">${cta(lang, [btn])}</div>` : ''}</li>`).join('\n')}
  </ol>
  <p class="note">${t.note}</p>
</div></section>
<section class="alt"><div class="wrap">
  <div class="section-head"><h2>${t.legendTitle}</h2></div>
  ${legend(lang)}
  <p class="meta"><a href="./">${t.backHome}</a></p>
</div></section>
${foot(lang)}`;
}

fs.mkdirSync(path.join(out, 'en'), { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), home('he'));
fs.writeFileSync(path.join(out, 'install.html'), install('he'));
fs.writeFileSync(path.join(out, 'en', 'index.html'), home('en'));
fs.writeFileSync(path.join(out, 'en', 'install.html'), install('en'));

const pages = ['index', 'install'];
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.flatMap((p) => ['he', 'en'].map((lang) => `  <url>
    <loc>${pageUrl(lang, p)}</loc>
    <lastmod>${TODAY}</lastmod>
    <xhtml:link rel="alternate" hreflang="he" href="${pageUrl('he', p)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl('en', p)}"/>
    <priority>${p === 'index' ? '1.0' : '0.8'}</priority>
  </url>`)).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(out, 'sitemap.xml'), sm);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('Website generated for', SITE);
