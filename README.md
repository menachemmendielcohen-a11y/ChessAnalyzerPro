# Chess Analyzer Pro

מערכת חינמית בקוד פתוח לניתוח משחקי שחמט מ־Chess.com · Free, open-source analysis of finished Chess.com games.

| תיקייה / Folder | מה יש בה / Contents |
|---|---|
| `extension/` | תוסף Chrome שמוריד משחק שהסתיים כקובץ PGN / Chrome extension that saves a finished game as PGN |
| `app/` | תוכנת Windows (Electron) עם Stockfish מובנה / Windows desktop app with Stockfish built in |
| `website/` | האתר הרשמי (עברית + אנגלית) / Official website (Hebrew + English) |
| `tools/` | סקריפטים לבנייה ולבדיקה / Build and test scripts |

הניתוח מיועד **למשחקים שהסתיימו בלבד**: התוסף אינו מוריד משחק פעיל והתוכנה אינה מנתחת משחק לא גמור.
Analysis is for **finished games only**: the extension refuses games in progress and the app refuses unfinished PGNs.

## התוכנה / Desktop app

```
cd app
npm install
powershell -File ..\tools\fetch-engine.ps1   # מוריד את Stockfish הרשמי אל app\engine (פעם אחת)
npm start        # הרצה לפיתוח / run in development
npm test         # בדיקת ניתוח על משחק לדוגמה / headless analysis check
npm run dist     # יוצר app\dist\ChessAnalyzerProSetup.exe / builds the installer
```

קובץ ההתקנה כולל את Stockfish; המשתמש לא מתקין שום דבר נוסף והניתוח פועל ללא אינטרנט.

## התוסף / Chrome extension

```
cd app
npm run bundle:ext     # בונה את extension\content.js מתוך extension\src
```

בדיקה מקומית: `chrome://extensions` ← "מצב מפתח" ← "טען פריט unpacked" ← בחרו את תיקיית `extension`.
לפרסום: העלו את `extension-store.zip` ל־Chrome Web Store Developer Dashboard.

## האתר / Website

- **עדכון קישורים** (הורדה, חנות Chrome, YouTube, קוד מקור): עורכים רק את `website/config.js`. ערך ריק מציג הודעת "בקרוב" במקום קישור שבור.
- **הגדרת כתובת האתר** (canonical, sitemap, robots): `node tools/build-site.js https://הדומיין-שלכם`
- **טקסטים**: נמצאים ב־`tools/build-site.js`; אחרי שינוי מריצים אותו שוב.
- **פרסום**: מעלים את תוכן התיקייה `website/` לכל שירות אחסון סטטי (GitHub Pages, Netlify, Cloudflare Pages).
- **Google Search Console**: מוסיפים את תג האימות במקום המסומן ב־`<head>` (בפונקציה `head` שב־`tools/build-site.js`), ואז שולחים את `sitemap.xml`.

## רישיון / License

GPL-3.0-or-later – ראו `LICENSE`. רכיבי צד שלישי (Stockfish, כלי הלוח, chess.js, Electron) מפורטים ב־`THIRD-PARTY-NOTICES.md`.

מי שמפיץ את קובץ ההתקנה חייב, לפי GPLv3, לפרסם גם את קוד המקור המתאים: את המאגר הזה, ואת קוד המקור של Stockfish
(<https://github.com/official-stockfish/Stockfish/tree/sf_19>). לכן יש למלא את `sourceUrl` ב־`website/config.js` לפני הפצת התוכנה.

Chess Analyzer Pro אינו האתר הרשמי של Stockfish ואינו קשור ל־Stockfish או ל־Chess.com.
