# INTRON GLOBAL website

Static bilingual company website ready for GitHub Pages.

## Structure

- `en/` - English website
- `ko/` - Korean website
- `index.html` - redirects visitors to the English website

Each language folder contains independent pages and assets. The language switch moves between matching files, for example `en/contact.html` and `ko/contact.html`.

## Deploy with GitHub Pages

1. Create a GitHub repository and push this folder to its `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Push to `main`, or run **Deploy to GitHub Pages** from the repository's Actions tab.

The included workflow publishes this entire folder as a static site. It does not need Node.js, a build command, or a custom base URL, so it works for both `username.github.io` and project Pages URLs.
