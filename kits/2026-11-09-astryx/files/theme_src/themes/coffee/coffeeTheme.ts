import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';

const TERRACOTTA = '#C8553D';
const ring = (pct: string) =>
  `inset 0px 0px 0px 2px color-mix(in srgb, ${TERRACOTTA} ${pct}, transparent)`;

export const coffeeTheme = defineTheme({
  name: 'coffee',
  extends: neutralTheme,
  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'Figtree',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: 'Georgia',
      fallbacks: '"Times New Roman", Times, serif',
      weights: {3: 'bold', 4: 'bold'},
    },
    code: {
      family: 'ui-monospace',
      fallbacks:
        '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },
  radius: {base: 0, multiplier: 0},
  tokens: {
    '--color-accent': TERRACOTTA,
    '--color-accent-muted': ['#F3D9D2', '#5A2A20'],
    '--color-text-accent': ['#A8442F', '#E8957F'],
    '--color-icon-accent': ['#A8442F', '#E8957F'],
    '--color-on-accent': '#FFFFFF',
    '--focus-outline-color': TERRACOTTA,
    '--radius-none': '0px',
    '--radius-inner': '0px',
    '--radius-element': '0px',
    '--radius-container': '0px',
    '--radius-page': '0px',
    '--radius-full': '0px',
    '--shadow-low': 'none',
    '--shadow-med': 'none',
    '--shadow-high': 'none',
    '--shadow-inset-hover': ring('30%'),
    '--shadow-inset-selected': ring('50%'),
  },
});
