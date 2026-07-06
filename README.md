# Brittney Lauren Stationery — Coming Soon

A landing page for Brittney Lauren Stationery. Visitors enter their name and email to be notified at launch. On submit, the signup card animates into a mailbox and a success message appears.

## Stack

| Layer | Choice |
|---|---|
| HTML/CSS | Plain, no build step |
| Interactivity | [Alpine.js](https://alpinejs.dev) via CDN |
| Animation | [GSAP](https://gsap.com) via CDN |
| Serverless API | Vercel Functions |
| Email/Newsletter | MailerLite |
| Testing | Playwright + axe-core |
| Hosting | Vercel |

## Project structure

```
project-root/
├── api/
│   └── subscribe.js          — POST endpoint, proxies to MailerLite
├── src/
│   ├── index.html            — single page, inline SVGs for mailbox and logo
│   ├── css/
│   │   ├── reset.css
│   │   ├── global.css        — fonts, CSS variables, body defaults
│   │   └── signup.css        — scene layout, envelope card, form, themes
│   ├── javascript/
│   │   ├── signup-form.js    — Alpine component + GSAP mail animation
│   │   └── theme-cycle.js    — auto-cycling themes (4 themes, 5s interval)
│   └── assets/
│       ├── fonts/
│       └── images/
├── tests/
│   ├── form.spec.js          — validation, submission states, keyboard, reduced motion
│   ├── accessibility.spec.js — axe-core audit + manual a11y checks
│   └── api.spec.js           — /api/subscribe endpoint tests
├── .github/workflows/
│   └── playwright.yml        — CI: runs tests on every push/PR
├── vercel.json               — security headers (CSP, X-Frame-Options, etc.)
├── playwright.config.js
└── package.json
```

## Local development

**Prerequisites:** Node.js 20+, Vercel CLI (`npm i -g vercel`)

```bash
npm install
npx playwright install chromium
```

Copy the environment file and fill in your values:

```bash
cp .env.example .env
```

Start the dev server (required — plain file servers won't run the API):

```bash
vercel dev
```

The page is served at `http://localhost:3000/src/`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `MAILERLITE_API_KEY` | Yes (production) | Bearer token from MailerLite → Integrations → API |
| `MAILERLITE_GROUP_ID_LANDING_PAGE` | No | Group ID to tag subscribers. Found under Subscribers → Groups |
| `DEV_SUBSCRIBE_RESULT` | Dev only | Set to `success` or `fail` to control the stub response locally |

In production, set these in Vercel → Project → Settings → Environment Variables. Never commit real values to git.

## Running tests

Tests require `vercel dev` to already be running on port 3000:

```bash
# Terminal 1
vercel dev

# Terminal 2
npm test                  # all tests
npm run test:ui           # Playwright UI (good for debugging)
npm run test:a11y         # accessibility only
npm run test:api          # API endpoint only
```

## Themes

The page cycles through four themes automatically every 5 seconds. Each theme changes the card background, accent colour, logo and stamp colour, tagline, and illustration.

| Theme | Tagline | Illustration |
|---|---|---|
| Green (default) | Stationery is an art | Leaf |
| Warm | For handwriting enthusiasts | Fox girl |
| Pink | Stationery is a human touch | Paper plane |
| Blue | For those who share love | Bubbles |

To add or modify a theme, edit the `THEMES` array in `src/javascript/theme-cycle.js`.

## Animation

On successful form submission:

1. The theme cycle stops
2. The envelope card tilts back and rises (~55vh)
3. It swoops toward the mailbox slot with a bounce
4. A `clip-path: inset()` on the stationary `#envelope-wrapper` masks the envelope as it enters the slot — making it appear to slide inside
5. The success message fades in over the mailbox

Users with `prefers-reduced-motion` enabled skip straight to a crossfade.

## Security

- All user input is rendered via Alpine's `x-text` (sets `textContent`, never parsed as HTML — XSS-safe)
- Input length is capped at the HTML level (`maxlength="200"` for name, `maxlength="254"` for email)
- The API validates and trims both fields server-side before forwarding to MailerLite
- Security headers are set in `vercel.json`: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options

## CI/CD

GitHub Actions runs the full Playwright test suite on every push and pull request to every branch. The workflow starts `vercel dev` in the background, waits for it to be ready, then runs tests. Alpine.js and GSAP are intercepted from the CDN and served from `node_modules` to prevent timeouts.

Required GitHub secrets:

| Secret | Where to find it |
|---|---|
| `BL_VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after running `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after running `vercel link` |
| `MAILERLITE_API_KEY` | MailerLite → Integrations → API |
| `MAILERLITE_GROUP_ID_LANDING_PAGE` | MailerLite → Subscribers → Groups |

## Deployment

Vercel deploys automatically on push to `main`. No build step needed — Vercel serves `src/` as static files and runs `api/subscribe.js` as a serverless function.