<p align="center">
  <img src="./botttle.png" alt="botttle" width="96" />
</p>

<p align="center"><strong>botttle</strong></p>

<p align="center">
  An agentic development environment — a terminal workspace with tabs and panes,
  built in Rust on <a href="https://gpui.rs">GPUI</a>.
</p>

---

## What this is

botttle is a GPU-rendered terminal you can split and tab like an editor, built to
grow into a place where agents work next to you rather than in a separate window.

The terminal comes first, because everything an agent does in a development loop —
running builds, reading logs, driving tools — already happens in one. The pane
tree, tab model, and event plumbing are the parts that outlive the terminal.

## Status

Early. What works today:

- Real PTYs — each pane runs your login shell through a full ANSI emulator
  (`alacritty_terminal`), with 24-bit color, text attributes, and 10k lines of
  scrollback.
- **Tabs**, each holding its own pane layout.
- **Splittable panes** — split right or down, any depth; splitting along an axis a
  pane already lives on adds a sibling instead of nesting.
- Mouse selection (click, double-click for words, triple-click for lines), copy
  and paste, scrollback via the wheel, live font resizing.
- Window title tracking (OSC 0/2), clipboard escapes (OSC 52), and color queries.

Not there yet: IME composition, drag-to-resize splits, search, a config file, and
the agent layer itself.

## Running it

```bash
cargo run --release
```

Requires a recent stable Rust toolchain. On Linux, GPUI needs the usual Wayland or
X11 development packages.

## Keys

`⌘` on macOS; `ctrl+shift` elsewhere.

| Chord | Action |
| --- | --- |
| `⌘T` | New tab |
| `⌘W` | Close pane (closes the tab with the last pane) |
| `⌘⇧W` | Close tab |
| `⌘D` / `⌘⇧D` | Split right / split down |
| `⌘]` / `⌘[` | Focus next / previous pane |
| `⌘⇧]` / `⌘⇧[` | Next / previous tab |
| `⌘C` / `⌘V` | Copy selection / paste |
| `⌘K` | Clear |
| `⌘=` / `⌘-` / `⌘0` | Font size |

Everything else goes to the shell untouched, including bare `ctrl` chords.

## Layout

```
crates/botttle
├── main.rs        window setup and app wiring
├── workspace.rs   root view: tab strip, status bar, actions
├── pane.rs        the pane tree (split, close, collapse, render)
├── actions.rs     actions and their default key bindings
├── theme.rs       colors, fonts, sizing — a gpui global
└── terminal/
    ├── mod.rs     PTY + emulator, and the bridge to the main thread
    ├── view.rs    grid rendering, keyboard, mouse, selection
    ├── keys.rs    keystrokes to terminal byte sequences
    └── color.rs   ANSI colors to gpui colors
```

## License

MIT — see [LICENSE](./LICENSE).
