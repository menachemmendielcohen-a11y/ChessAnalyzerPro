// Chess Analyzer Pro website - wires buttons to the links in config.js. GPL-3.0-or-later.
(function () {
  'use strict';
  var cfg = window.CAP_CONFIG || {};
  var isHttps = function (u) { return typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u); };
  // A file on this site, e.g. 'downloads/x.zip' (no scheme, no '..', no leading slash).
  var isLocal = function (u) { return typeof u === 'string' && /^[\w-]+(\/[\w.-]+)+$/.test(u) && u.indexOf('..') < 0; };
  var root = document.documentElement.getAttribute('data-root') || '';
  var FILES = { download: true, extzip: true };

  // Buttons: active link when configured, otherwise a "coming soon" notice.
  function wire(kind, url) {
    document.querySelectorAll('[data-link="' + kind + '"]').forEach(function (a) {
      var note = a.parentElement.querySelector('[data-soon="' + kind + '"]');
      if (isHttps(url) || isLocal(url)) {
        a.href = isLocal(url) ? root + url : url;
        a.removeAttribute('aria-disabled');
        a.classList.remove('is-soon');
        if (FILES[kind] && isLocal(url)) a.setAttribute('download', '');
        if (!(FILES[kind]) && isHttps(url)) { a.target = '_blank'; a.rel = 'noopener'; }
        if (note) note.hidden = true;
      } else {
        a.removeAttribute('href');
        a.setAttribute('aria-disabled', 'true');
        a.classList.add('is-soon');
        if (note) note.hidden = false;
      }
    });
  }
  wire('download', cfg.downloadUrl);
  wire('chrome', cfg.chromeStoreUrl);
  wire('source', cfg.sourceUrl);
  wire('extzip', cfg.extensionZipUrl);

  document.querySelectorAll('[data-version]').forEach(function (el) {
    if (cfg.version) el.textContent = cfg.version;
  });

  // Tutorial video: embedded only once a YouTube link is configured.
  var m = /(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/.exec(cfg.youtubeUrl || '') || /^([\w-]{11})$/.exec(cfg.youtubeUrl || '');
  var box = document.getElementById('video-frame');
  if (box && m) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + m[1];
    f.title = box.getAttribute('data-title') || 'Chess Analyzer Pro';
    f.loading = 'lazy';
    f.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    box.textContent = '';
    box.appendChild(f);
    box.classList.add('has-video');
  } else if (box && isLocal(cfg.videoUrl)) {
    // No YouTube link: play the video file that is hosted on this site.
    var v = document.createElement('video');
    v.controls = true;
    v.preload = 'metadata';
    v.playsInline = true;
    v.src = root + cfg.videoUrl;
    if (isLocal(cfg.videoPoster)) v.poster = root + cfg.videoPoster;
    v.setAttribute('aria-label', box.getAttribute('data-title') || 'Chess Analyzer Pro');
    box.textContent = '';
    box.appendChild(v);
    box.classList.add('has-video');
  }

  var y =document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
