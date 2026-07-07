/**
 * theme-cycle.js
 *
 * Cycles the envelope card through three visual themes on a timer.
 * Each theme changes: card background color, accent color (borders,
 * button), tagline text, and the illustration image.
 *
 * Works alongside the GSAP submit animation in signup-form.js —
 * the cycle is paused when submission starts and never resumes
 * (the envelope flies away on success, or the error state takes over).
 *
 * Respects prefers-reduced-motion: theme transitions still happen but
 * without the crossfade animation (instant swap instead).
 */

const THEMES = [
  {
    name:            'green',
    cardBg:          '#E1EFD4',
    accent:          '#6F7D5F',
    accentText:      '#4D5742',
    stampLetterColor:'#E1EFD4',
    tagline:         'Stationery is an art',
    illustration:    './assets/images/leaf2.svg',
    illustrationAlt: '',
    illustrationPosition: 'start',
  },
  {
    name:            'warm',
    cardBg:          '#F5F5F5',
    accent:          '#C28262',
    accentText:      '#8B5A3C',
    stampLetterColor:'#FCEBE3',
    tagline:         'For handwriting enthusiasts',
    illustration:    './assets/images/foxgirl.svg',
    illustrationAlt: '',
    illustrationPosition: 'end',
  },
  {
    name:            'pink',
    cardBg:          '#FDD6D8',
    accent:          '#DF4A95',
    accentText:      '#B02070',
    stampLetterColor:'#FDD6D8',
    tagline:         'Stationery is a human touch',
    illustration:    './assets/images/big_plane.svg',
    illustrationAlt: '',
    illustrationPosition: 'end',
  },
  {
    name:            'blue',
    cardBg:          '#E9EEF3',
    accent:          '#5085B6',
    accentText:      '#2D5A8A',
    stampLetterColor:'#35498E',
    tagline:         'For those who share love',
    illustration:    './assets/images/mermaidv2.svg',
    illustrationAlt: '',
    illustrationPosition: 'end',
  },
];

const CYCLE_DURATION   = 5000; // ms between theme changes
const FADE_DURATION    = 0.4;  // seconds for GSAP crossfade

let currentIndex  = 0;
let intervalId    = null;
let isTransitioning = false;

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// DOM refs — resolved once after DOMContentLoaded
// ---------------------------------------------------------------------------
let body;
let envelope;
let heading;
let illustration;

// ---------------------------------------------------------------------------
// Apply a theme
// ---------------------------------------------------------------------------

function applyTheme(theme, animate = true) {
  if (isTransitioning) return;

  if (!animate || prefersReduced) {
    setThemeValues(theme);
    return;
  }

  isTransitioning = true;

  // Fade out the content that changes (heading + illustration)
  gsap.to([heading, illustration], {
    opacity: 0,
    duration: FADE_DURATION,
    ease: 'power2.in',
    onComplete: () => {
      setThemeValues(theme);
      // Fade content back in after swap
      gsap.to([heading, illustration], {
        opacity: 1,
        duration: FADE_DURATION,
        ease: 'power2.out',
        onComplete: () => { isTransitioning = false; },
      });
    },
  });

  // Simultaneously transition the card background and stamp letter color via CSS
  envelope.style.backgroundColor = theme.cardBg;
  envelope.style.setProperty('--stamp-letter-color', theme.stampLetterColor);
}

function setThemeValues(theme) {
  // Update tagline
  heading.textContent = theme.tagline;

  // Swap illustration
  illustration.src = theme.illustration;
  illustration.alt = theme.illustrationAlt;
  illustration.style.setProperty('--justify', theme.illustrationPosition);

  // Update CSS custom property so all accent-colored elements
  // (input borders, button border, focus ring) update at once
  envelope.style.setProperty('--theme-accent', theme.accent);
  body.style.setProperty('--theme-accent-text', theme.accentText);
  envelope.style.setProperty('--stamp-letter-color', theme.stampLetterColor);
  envelope.style.backgroundColor = theme.cardBg;

  // Update data attribute for any CSS selectors that need it
  envelope.dataset.theme = theme.name;
}

// ---------------------------------------------------------------------------
// Cycle control
// ---------------------------------------------------------------------------

function advance() {
  currentIndex = (currentIndex + 1) % THEMES.length;
  applyTheme(THEMES[currentIndex]);
}

function startThemeCycle() {
  if (intervalId) return;
  intervalId = setInterval(advance, CYCLE_DURATION);
}

function stopThemeCycle() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

window.__THEME_NAMES__ = THEMES.map(theme => theme.name);

document.addEventListener('DOMContentLoaded', () => {
  body     = document.getElementById('body');
  envelope     = document.getElementById('envelope');
  heading      = document.getElementById('signup-heading');
  illustration = document.getElementById('theme-illustration');

  if (!envelope || !heading || !illustration) {
    console.warn('theme-cycle: required elements not found');
    return;
  }

  // Apply first theme immediately (no animation on load)
  applyTheme(THEMES[0], false);

  // Start cycling
  startThemeCycle();
});