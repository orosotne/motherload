import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

/** Pure game logic (GAME_SPEC §9): renderer-free and deterministic. */
const LOGIC = [
  'src/core/**',
  'src/data/**',
  'src/world/**',
  'src/sim/**',
  'src/story/**',
  'src/save/**',
];

export default defineConfig([
  globalIgnores(['dist/', 'coverage/', 'release/', 'src-tauri/target/', 'src-tauri/gen/']),
  {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // GAME_SPEC §11.5: files up to 300 lines, one responsibility per module.
      'max-lines': ['error', { max: 300 }],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: LOGIC,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'three', message: 'Game logic must not import Three.js (GAME_SPEC §9.2).' },
          ],
          patterns: [
            {
              group: ['three/*'],
              message: 'Game logic must not import Three.js (GAME_SPEC §9.2).',
            },
          ],
        },
      ],
    },
  },
  {
    files: [...LOGIC, 'tests/**', 'scripts/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded Rng from src/core/rng.ts (GAME_SPEC §9.4).',
        },
      ],
    },
  },
  prettier,
]);
