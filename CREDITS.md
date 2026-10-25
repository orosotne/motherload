# Credits

## Libraries

| Library                                                      | License | Used for                       |
| ------------------------------------------------------------ | ------- | ------------------------------ |
| [three.js](https://threejs.org)                              | MIT     | 3D rendering                   |
| [simplex-noise](https://github.com/jwagner/simplex-noise.js) | MIT     | Cave generation                |
| [lil-gui](https://lil-gui.georgealways.com)                  | MIT     | Debug panel, debug builds only |

The macOS app wraps the same game in [Tauri](https://tauri.app) (MIT or Apache-2.0). Its Rust
dependencies, pinned in `src-tauri/Cargo.lock`, come unchanged from crates.io under MIT,
Apache-2.0, BSD, ISC, Zlib and Unicode licenses; a few are under MPL-2.0.

Build and test tools (Vite, Vitest, TypeScript, ESLint, Prettier, the Tauri CLI) are not shipped
with the game.

## Fonts

| Font                                                 | Author                      | License                   | Files                                              |
| ---------------------------------------------------- | --------------------------- | ------------------------- | -------------------------------------------------- |
| [Fredoka](https://fonts.google.com/specimen/Fredoka) | The Fredoka Project Authors | SIL Open Font License 1.1 | `src/ui/fonts/`, license in `src/ui/fonts/OFL.txt` |

## Assets

None from outside. All models, materials and sounds are generated in code (GAME_SPEC §8). The
app icon (`src-tauri/app-icon.svg`) was drawn for this game; the files in `src-tauri/icons/` are
made from it with `tauri icon`.
