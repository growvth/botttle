//! Draws a terminal grid and routes input to it.
//!
//! The grid is rendered as one styled text element per row. A monospace font
//! keeps columns aligned, and per-cell colors and attributes are applied as text
//! highlights, which keeps the whole view inside gpui's normal layout system.

use std::ops::Range;
use std::path::PathBuf;

use alacritty_terminal::event::Event as AlacrittyEvent;
use alacritty_terminal::grid::Dimensions;
use alacritty_terminal::index::{Column, Line, Point, Side};
use alacritty_terminal::selection::{Selection, SelectionType};
use alacritty_terminal::term::cell::Flags;
use alacritty_terminal::term::TermMode;
use alacritty_terminal::vte::ansi::CursorShape;
use anyhow::Result;
use futures::channel::mpsc::UnboundedReceiver;
use futures::StreamExt;
use gpui::{
    canvas, div, font, prelude::*, px, App, Bounds, ClipboardItem, Context, Entity, EventEmitter,
    FocusHandle, Focusable, FontStyle, FontWeight, HighlightStyle, KeyDownEvent, MouseButton,
    MouseDownEvent, MouseMoveEvent, MouseUpEvent, Pixels, Point as GpuiPoint, Render, ScrollDelta,
    ScrollWheelEvent, SharedString, StrikethroughStyle, StyledText, Task, UnderlineStyle, Window,
};

use crate::terminal::color::{self, resolve};
use crate::terminal::keys;
use crate::terminal::{Terminal, TerminalSize};
use crate::theme::Theme;

/// Lines scrolled per wheel notch when the platform reports discrete steps.
const LINES_PER_SCROLL_NOTCH: f32 = 3.0;

/// Things the workspace cares about: they change what the tab strip shows.
#[derive(Clone, Debug)]
pub enum TerminalViewEvent {
    TitleChanged,
    Exited,
}

pub struct TerminalView {
    terminal: Terminal,
    focus_handle: FocusHandle,
    /// Where the grid was last painted, used to map mouse positions to cells.
    content_bounds: Bounds<Pixels>,
    /// The scrollback offset of the last painted frame, for the same reason.
    display_offset: usize,
    selecting: bool,
    _event_pump: Task<()>,
}

impl TerminalView {
    /// Starts a shell and wraps it in a view. Failing to open a PTY is reported
    /// to the caller rather than left inside a broken pane.
    pub fn spawn(working_directory: Option<PathBuf>, cx: &mut App) -> Result<Entity<Self>> {
        // The real geometry arrives on the first paint; this is just enough for
        // the shell to start up with a sane window size.
        let (terminal, events) = Terminal::new(TerminalSize::default(), working_directory)?;
        Ok(cx.new(|cx| Self::new(terminal, events, cx)))
    }

    fn new(
        terminal: Terminal,
        mut events: UnboundedReceiver<AlacrittyEvent>,
        cx: &mut Context<Self>,
    ) -> Self {
        let event_pump = cx.spawn(async move |this, cx| {
            while let Some(event) = events.next().await {
                if this
                    .update(cx, |view, cx| view.handle_event(event, cx))
                    .is_err()
                {
                    break;
                }
            }
        });

        Self {
            terminal,
            focus_handle: cx.focus_handle(),
            content_bounds: Bounds::default(),
            display_offset: 0,
            selecting: false,
            _event_pump: event_pump,
        }
    }

    pub fn title(&self) -> SharedString {
        match &self.terminal.title {
            Some(title) if !title.trim().is_empty() => SharedString::from(title.clone()),
            _ if self.terminal.exited => SharedString::from("exited"),
            _ => SharedString::from("shell"),
        }
    }

    pub fn has_exited(&self) -> bool {
        self.terminal.exited
    }

    pub fn copy(&mut self, cx: &mut Context<Self>) {
        if let Some(text) = self.terminal.selected_text() {
            if !text.is_empty() {
                cx.write_to_clipboard(ClipboardItem::new_string(text));
            }
        }
    }

    pub fn paste(&mut self, cx: &mut Context<Self>) {
        let Some(text) = cx.read_from_clipboard().and_then(|item| item.text()) else {
            return;
        };
        let bracketed = self
            .terminal
            .lock()
            .mode()
            .contains(TermMode::BRACKETED_PASTE);

        if bracketed {
            self.terminal.write(b"\x1b[200~".to_vec());
            self.terminal.write(text.replace('\x1b', "").into_bytes());
            self.terminal.write(b"\x1b[201~".to_vec());
        } else {
            self.terminal.write(text.replace("\r\n", "\r").into_bytes());
        }
        self.terminal.scroll_to_bottom();
        cx.notify();
    }

    pub fn clear(&mut self, cx: &mut Context<Self>) {
        // Ctrl-L, so the running program decides what "clear" means.
        self.terminal.write(vec![0x0c]);
        cx.notify();
    }

    fn handle_event(&mut self, event: AlacrittyEvent, cx: &mut Context<Self>) {
        match event {
            AlacrittyEvent::Wakeup => cx.notify(),
            AlacrittyEvent::Title(title) => {
                self.terminal.title = Some(title);
                cx.emit(TerminalViewEvent::TitleChanged);
                cx.notify();
            }
            AlacrittyEvent::ResetTitle => {
                self.terminal.title = None;
                cx.emit(TerminalViewEvent::TitleChanged);
                cx.notify();
            }
            AlacrittyEvent::PtyWrite(text) => self.terminal.write(text.into_bytes()),
            AlacrittyEvent::ClipboardStore(_, text) => {
                cx.write_to_clipboard(ClipboardItem::new_string(text));
            }
            AlacrittyEvent::ClipboardLoad(_, format) => {
                if let Some(text) = cx.read_from_clipboard().and_then(|item| item.text()) {
                    self.terminal.write(format(&text).into_bytes());
                }
            }
            AlacrittyEvent::ColorRequest(index, format) => {
                let theme = cx.global::<Theme>();
                let hsla = match index {
                    0..=15 => theme.ansi[index],
                    256 => theme.terminal_foreground,
                    257 => theme.terminal_background,
                    _ => theme.cursor,
                };
                self.terminal
                    .write(format(color::to_rgb(hsla)).into_bytes());
            }
            AlacrittyEvent::TextAreaSizeRequest(format) => {
                self.terminal
                    .write(format(self.terminal.size().into()).into_bytes());
            }
            AlacrittyEvent::ChildExit(_) | AlacrittyEvent::Exit => {
                self.terminal.exited = true;
                cx.emit(TerminalViewEvent::Exited);
                cx.notify();
            }
            AlacrittyEvent::Bell
            | AlacrittyEvent::MouseCursorDirty
            | AlacrittyEvent::CursorBlinkingChange => {}
        }
    }

    fn on_key_down(&mut self, event: &KeyDownEvent, _: &mut Window, cx: &mut Context<Self>) {
        let mode = *self.terminal.lock().mode();
        let Some(bytes) = keys::to_bytes(&event.keystroke, mode) else {
            return;
        };

        self.terminal.write(bytes);
        self.terminal.scroll_to_bottom();
        cx.stop_propagation();
        cx.notify();
    }

    fn on_scroll_wheel(
        &mut self,
        event: &ScrollWheelEvent,
        _: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let line_height = self.terminal.size().line_height;
        let lines = match event.delta {
            ScrollDelta::Lines(delta) => delta.y,
            ScrollDelta::Pixels(delta) => f32::from(delta.y) / f32::from(line_height).max(1.0),
        };

        let lines = (lines * LINES_PER_SCROLL_NOTCH).round() as i32;
        if lines != 0 {
            self.terminal.scroll(lines);
            cx.notify();
        }
    }

    fn on_mouse_down(
        &mut self,
        event: &MouseDownEvent,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        window.focus(&self.focus_handle);

        let Some((point, side)) = self.grid_point(event.position) else {
            return;
        };
        self.selecting = true;
        let selection_type = if event.click_count >= 3 {
            SelectionType::Lines
        } else if event.click_count == 2 {
            SelectionType::Semantic
        } else {
            SelectionType::Simple
        };

        let mut term = self.terminal.lock();
        term.selection = Some(Selection::new(selection_type, point, side));
        drop(term);
        cx.notify();
    }

    fn on_mouse_move(&mut self, event: &MouseMoveEvent, _: &mut Window, cx: &mut Context<Self>) {
        if !self.selecting {
            return;
        }
        let Some((point, side)) = self.grid_point(event.position) else {
            return;
        };

        let mut term = self.terminal.lock();
        if let Some(selection) = term.selection.as_mut() {
            selection.update(point, side);
        }
        drop(term);
        cx.notify();
    }

    fn on_mouse_up(&mut self, _: &MouseUpEvent, _: &mut Window, _: &mut Context<Self>) {
        self.selecting = false;
    }

    /// Maps a window position to a cell, plus which half of the cell it landed on.
    fn grid_point(&self, position: GpuiPoint<Pixels>) -> Option<(Point, Side)> {
        let size = self.terminal.size();
        if !self.content_bounds.contains(&position) {
            return None;
        }

        let relative_x = f32::from(position.x - self.content_bounds.origin.x);
        let relative_y = f32::from(position.y - self.content_bounds.origin.y);
        let column = (relative_x / f32::from(size.cell_width).max(1.0)).floor();
        let row = (relative_y / f32::from(size.line_height).max(1.0)).floor() as i32;

        let side = if column.fract() >= 0.5 {
            Side::Right
        } else {
            Side::Left
        };
        let column = (column as usize).min(size.columns().saturating_sub(1));
        let line = Line(row - self.display_offset as i32);

        Some((Point::new(line, Column(column)), side))
    }

    /// Called from the paint pass with the grid's real geometry.
    fn measured(
        &mut self,
        bounds: Bounds<Pixels>,
        cell_width: Pixels,
        line_height: Pixels,
        cx: &mut Context<Self>,
    ) {
        self.content_bounds = bounds;

        let size = TerminalSize::new(cell_width, line_height, bounds.size);
        let previous = self.terminal.size();
        let reflowed = size.columns() != previous.columns() || size.lines() != previous.lines();

        self.terminal.resize(size);
        if reflowed {
            cx.notify();
        }
    }

    fn build_rows(&mut self, theme: &Theme) -> Vec<Row> {
        let (rows, display_offset) = {
            let term = self.terminal.lock();
            let columns = term.columns();
            let screen_lines = term.screen_lines();
            let content = term.renderable_content();
            let colors = content.colors;
            let selection = content.selection;
            let display_offset = content.display_offset as i32;

            let cursor_row = content.cursor.point.line.0 + display_offset;
            let cursor_column = content.cursor.point.column.0;
            let cursor_visible = content.cursor.shape != CursorShape::Hidden;

            let mut rows: Vec<RowBuilder> = (0..screen_lines)
                .map(|_| RowBuilder::new(columns))
                .collect();

            for indexed in content.display_iter {
                let row_index = indexed.point.line.0 + display_offset;
                if row_index < 0 || row_index as usize >= screen_lines {
                    continue;
                }
                let cell = indexed.cell;
                // The second half of a wide character is a placeholder; the font
                // already draws the glyph at double width.
                if cell
                    .flags
                    .intersects(Flags::WIDE_CHAR_SPACER | Flags::LEADING_WIDE_CHAR_SPACER)
                {
                    continue;
                }

                let mut foreground = resolve(cell.fg, colors, theme);
                let mut background = resolve(cell.bg, colors, theme);
                if cell.flags.contains(Flags::INVERSE) {
                    std::mem::swap(&mut foreground, &mut background);
                }
                if cell.flags.contains(Flags::DIM) {
                    foreground = color::dim(foreground);
                }
                if cell.flags.contains(Flags::HIDDEN) {
                    foreground = background;
                }
                if selection.is_some_and(|range| range.contains(indexed.point)) {
                    background = theme.selection;
                }
                if cursor_visible
                    && row_index == cursor_row
                    && indexed.point.column.0 == cursor_column
                {
                    background = theme.cursor;
                    foreground = theme.terminal_background;
                }

                let style = HighlightStyle {
                    color: Some(foreground),
                    background_color: (background != theme.terminal_background)
                        .then_some(background),
                    font_weight: cell.flags.contains(Flags::BOLD).then_some(FontWeight::BOLD),
                    font_style: cell
                        .flags
                        .contains(Flags::ITALIC)
                        .then_some(FontStyle::Italic),
                    underline: cell.flags.intersects(Flags::ALL_UNDERLINES).then(|| {
                        UnderlineStyle {
                            thickness: px(1.0),
                            color: Some(foreground),
                            wavy: cell.flags.contains(Flags::UNDERCURL),
                        }
                    }),
                    strikethrough: cell.flags.contains(Flags::STRIKEOUT).then(|| {
                        StrikethroughStyle {
                            thickness: px(1.0),
                            color: Some(foreground),
                        }
                    }),
                    fade_out: None,
                };

                rows[row_index as usize].push(cell.c, style);
            }

            (rows, display_offset)
        };

        self.display_offset = display_offset.max(0) as usize;
        rows.into_iter().map(RowBuilder::finish).collect()
    }
}

impl EventEmitter<TerminalViewEvent> for TerminalView {}

impl Focusable for TerminalView {
    fn focus_handle(&self, _: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl Render for TerminalView {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.global::<Theme>().clone();
        let font_size = theme.font_size;
        let line_height = theme.line_height();
        let font_id = window
            .text_system()
            .resolve_font(&font(theme.font_family.clone()));
        let cell_width = window
            .text_system()
            .em_advance(font_id, font_size)
            .unwrap_or(px(8.0));

        let rows = self.build_rows(&theme);
        let entity = cx.entity().downgrade();

        div()
            .key_context("Terminal")
            .track_focus(&self.focus_handle)
            .size_full()
            .p_2()
            .bg(theme.terminal_background)
            .text_color(theme.terminal_foreground)
            .font_family(theme.font_family.clone())
            .text_size(font_size)
            .line_height(line_height)
            .on_key_down(cx.listener(Self::on_key_down))
            .on_scroll_wheel(cx.listener(Self::on_scroll_wheel))
            .on_mouse_down(MouseButton::Left, cx.listener(Self::on_mouse_down))
            .on_mouse_move(cx.listener(Self::on_mouse_move))
            .on_mouse_up(MouseButton::Left, cx.listener(Self::on_mouse_up))
            .child(
                div()
                    .relative()
                    .size_full()
                    .overflow_hidden()
                    .child(
                        canvas(
                            move |bounds, _, cx| {
                                entity
                                    .update(cx, |view, cx| {
                                        view.measured(bounds, cell_width, line_height, cx)
                                    })
                                    .ok();
                            },
                            |_, _, _, _| {},
                        )
                        .absolute()
                        .size_full(),
                    )
                    .children(rows.into_iter().map(|row| {
                        div()
                            .h(line_height)
                            .child(StyledText::new(row.text).with_highlights(row.highlights))
                    })),
            )
    }
}

/// One rendered row: the text plus the styles that apply to byte ranges of it.
struct Row {
    text: SharedString,
    highlights: Vec<(Range<usize>, HighlightStyle)>,
}

/// Accumulates cells into a row, merging neighbours that share a style so the
/// text system sees as few runs as possible.
struct RowBuilder {
    text: String,
    highlights: Vec<(Range<usize>, HighlightStyle)>,
    current: Option<(usize, HighlightStyle)>,
}

impl RowBuilder {
    fn new(columns: usize) -> Self {
        Self {
            text: String::with_capacity(columns),
            highlights: Vec::new(),
            current: None,
        }
    }

    fn push(&mut self, c: char, style: HighlightStyle) {
        let offset = self.text.len();
        match &self.current {
            Some((_, current)) if *current == style => {}
            Some((start, current)) => {
                self.highlights.push((*start..offset, *current));
                self.current = Some((offset, style));
            }
            None => self.current = Some((offset, style)),
        }
        self.text.push(c);
    }

    fn finish(mut self) -> Row {
        if let Some((start, style)) = self.current.take() {
            self.highlights.push((start..self.text.len(), style));
        }
        Row {
            text: SharedString::from(self.text),
            highlights: self.highlights,
        }
    }
}
