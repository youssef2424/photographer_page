# Photographer Website

A modern, responsive bilingual (EN/AR) photography website.

- Stack: HTML, CSS, JS, PHP
- i18n: JSON content files in `content/`
- Galleries: JSON-driven, images in `images/`
- Libraries (CDN): Swiper.js, Lightbox2

## Quick Start
1) Upload the entire `photographer/` folder to your PHP hosting (cPanel/Apache/Nginx).
2) Put your images into `images/` (use the subfolders provided).
3) Edit text in `content/copy.en.json` and `content/copy.ar.json`.
4) Edit homepage slider and wedding album in `content/home.json`.
5) Edit portfolio categories and images in `content/gallery.json`.
6) Set your recipient email in `contact.php` (`$to` variable).

Open `index.html` in a browser. The language toggle persists via localStorage.

## File Structure
photographer/
├─ index.html
├─ about.html
├─ portfolio.html
├─ packages.html
├─ contact.html
├─ contact.php
├─ content/
│  ├─ copy.en.json
│  ├─ copy.ar.json
│  ├─ home.json
│  └─ gallery.json
├─ css/
│  └─ style.css
├─ js/
│  └─ main.js
├─ images/
│  ├─ hero/
│  ├─ weddings/
│  ├─ portraits/
│  └─ events/

## Managing Content
- Text: `content/copy.en.json`, `content/copy.ar.json`
- Home slider and wedding album: `content/home.json`
- Portfolio categories and images: `content/gallery.json`
- Packages (names, features, prices): in `copy.*.json` under `packages`

## Default Language
Change `DEFAULT_LANG` in `js/main.js` to `"ar"` if you prefer Arabic by default.

## Contact Form
- Frontend: `contact.html` (AJAX via `js/main.js`)
- Backend: `contact.php` (validates and uses `mail()`)
- Response messages are localized via copy JSON.

## Accessibility & SEO
- Semantic HTML, alt text from JSON
- Meta tags per page
- Mobile-first layout, lazy-loaded images

## Notes
- Use free images from Unsplash/Pexels.
- If emails don’t send on your host, ask your provider to enable PHP `mail()` or configure SMTP and PHPMailer.
