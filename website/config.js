/*
 * Chess Analyzer Pro website - the ONLY file you need to edit to update links.
 * הקובץ היחיד שצריך לערוך כדי לעדכן קישורים באתר.
 *
 * A value can be a full https:// link or a file inside the site (e.g. 'downloads/...').
 * ערך יכול להיות קישור https:// מלא או קובץ שנמצא באתר עצמו (למשל 'downloads/...').
 *
 * Leave a value empty ('') while it is not available yet: the site then shows a
 * "coming soon" notice instead of a dead link.
 * השאירו ערך ריק ('') כל עוד הקישור לא קיים: האתר יציג הודעת "בקרוב" במקום קישור שבור.
 */
window.CAP_CONFIG = {
  // Current version of the Windows program / גרסת התוכנה הנוכחית
  version: '1.2.0',

  // The installer (GitHub Releases, always the latest version) / קובץ ההתקנה (GitHub Releases, תמיד הגרסה האחרונה)
  downloadUrl: 'https://github.com/menachemmendielcohen-a11y/ChessAnalyzerPro/releases/latest/download/ChessAnalyzerProSetup.exe',

  // Chrome Web Store page of the extension (empty until it is approved) / עמוד התוסף בחנות Chrome (ריק עד האישור)
  chromeStoreUrl: '',

  // The extension as a ZIP for manual installation / התוסף כקובץ ZIP להתקנה ידנית
  extensionZipUrl: 'https://github.com/menachemmendielcohen-a11y/ChessAnalyzerPro/releases/latest/download/ChessAnalyzerPro-Chrome-Extension.zip',

  // Tutorial video file hosted on this site (used when no YouTube link is set) / קובץ סרטון ההדרכה באתר (בשימוש כשאין קישור YouTube)
  videoUrl: 'assets/tutorial.mp4',
  videoPoster: 'assets/tutorial-poster.jpg',

  // YouTube tutorial: full link or just the video ID. When set, it replaces the video file above.
  // סרטון ההדרכה ב־YouTube: קישור מלא או מזהה. כשמוגדר – מחליף את קובץ הסרטון שלמעלה.
  youtubeUrl: '',

  // Source code (required by the GPLv3 licence) / קוד המקור (נדרש לפי רישיון GPLv3)
  sourceUrl: 'https://github.com/menachemmendielcohen-a11y/ChessAnalyzerPro',
};
