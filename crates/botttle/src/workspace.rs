//! The root view: window chrome, the tab strip, the pane tree of the active tab,
//! and the settings panel when it is open.

use std::collections::HashMap;

use gpui::{
    div, prelude::*, px, Axis, Context, Entity, EntityId, FocusHandle, Focusable, Render,
    SharedString, Subscription, Window,
};

use crate::actions::*;
use crate::pane::{PaneGroup, RemoveResult};
use crate::settings::Settings;
use crate::settings_view::{SettingsView, SettingsViewEvent};
use crate::terminal::view::{TerminalView, TerminalViewEvent};
use crate::theme::Theme;

/// Room for the macOS traffic lights, which sit over our own titlebar.
#[cfg(target_os = "macos")]
const TITLEBAR_LEADING_PADDING: f32 = 78.0;
#[cfg(not(target_os = "macos"))]
const TITLEBAR_LEADING_PADDING: f32 = 10.0;

pub struct Workspace {
    tabs: Vec<Tab>,
    active_tab: usize,
    focus_handle: FocusHandle,
    settings: Option<Entity<SettingsView>>,
    /// Kept alive for as long as the settings panel is open.
    settings_subscription: Option<Subscription>,
    /// Shown in the status bar; set when something failed in a way worth saying
    /// out loud, such as a shell that would not start.
    status: Option<SharedString>,
}

struct Tab {
    group: PaneGroup,
    active_pane: EntityId,
    /// Per pane: title/exit notifications, and focus tracking so clicking a pane
    /// makes it the target of the next split or close.
    subscriptions: HashMap<EntityId, Vec<Subscription>>,
}

impl Workspace {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let mut workspace = Self {
            tabs: Vec::new(),
            active_tab: 0,
            focus_handle: cx.focus_handle(),
            settings: None,
            settings_subscription: None,
            status: None,
        };
        workspace.open_tab(window, cx);
        workspace
    }

    fn open_tab(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let Some(pane) = self.spawn_pane(cx) else {
            return;
        };

        let subscriptions = self.watch_pane(&pane, window, cx);
        let mut map = HashMap::new();
        map.insert(pane.entity_id(), subscriptions);

        self.tabs.push(Tab {
            group: PaneGroup::new(pane.clone()),
            active_pane: pane.entity_id(),
            subscriptions: map,
        });
        self.active_tab = self.tabs.len() - 1;
        self.focus_pane(&pane, window, cx);
        cx.notify();
    }

    fn spawn_pane(&mut self, cx: &mut Context<Self>) -> Option<Entity<TerminalView>> {
        let working_directory = std::env::current_dir().ok();
        match TerminalView::spawn(working_directory, cx) {
            Ok(pane) => {
                self.status = None;
                Some(pane)
            }
            Err(error) => {
                self.status = Some(SharedString::from(format!("{error:#}")));
                cx.notify();
                None
            }
        }
    }

    fn watch_pane(
        &self,
        pane: &Entity<TerminalView>,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) -> Vec<Subscription> {
        let id = pane.entity_id();
        let focus_handle = pane.focus_handle(cx);

        vec![
            cx.subscribe(pane, |_, _, event: &TerminalViewEvent, cx| match event {
                // Both change what the tab strip should say.
                TerminalViewEvent::TitleChanged | TerminalViewEvent::Exited => cx.notify(),
            }),
            // Clicking into a pane focuses it directly, so the workspace learns
            // which pane is current by watching focus rather than clicks.
            cx.on_focus_in(&focus_handle, window, move |this, _, cx| {
                if let Some(tab) = this.tabs.get_mut(this.active_tab) {
                    if tab.active_pane != id {
                        tab.active_pane = id;
                        cx.notify();
                    }
                }
            }),
        ]
    }

    fn focus_pane(
        &mut self,
        pane: &Entity<TerminalView>,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        if let Some(tab) = self.tabs.get_mut(self.active_tab) {
            tab.active_pane = pane.entity_id();
        }
        window.focus(&pane.focus_handle(cx));
        cx.notify();
    }

    fn active_pane(&self) -> Option<Entity<TerminalView>> {
        let tab = self.tabs.get(self.active_tab)?;
        tab.group
            .panes()
            .into_iter()
            .find(|pane| pane.entity_id() == tab.active_pane)
    }

    fn split(&mut self, axis: Axis, window: &mut Window, cx: &mut Context<Self>) {
        let Some(target) = self.tabs.get(self.active_tab).map(|tab| tab.active_pane) else {
            return;
        };
        let Some(pane) = self.spawn_pane(cx) else {
            return;
        };

        let subscriptions = self.watch_pane(&pane, window, cx);
        let Some(tab) = self.tabs.get_mut(self.active_tab) else {
            return;
        };
        if !tab.group.split(target, axis, pane.clone()) {
            return;
        }
        tab.subscriptions.insert(pane.entity_id(), subscriptions);
        self.focus_pane(&pane, window, cx);
    }

    fn close_active_pane(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let Some(tab) = self.tabs.get_mut(self.active_tab) else {
            return;
        };
        let target = tab.active_pane;

        match tab.group.remove(target) {
            RemoveResult::Removed => {
                tab.subscriptions.remove(&target);
                let next = tab.group.panes().first().cloned();
                if let Some(pane) = next {
                    self.focus_pane(&pane, window, cx);
                }
            }
            RemoveResult::GroupEmpty => self.close_tab(self.active_tab, window, cx),
            RemoveResult::NotFound => {}
        }
        cx.notify();
    }

    fn close_tab(&mut self, index: usize, window: &mut Window, cx: &mut Context<Self>) {
        if index >= self.tabs.len() {
            return;
        }
        self.tabs.remove(index);

        if self.tabs.is_empty() {
            cx.quit();
            return;
        }

        self.active_tab = self.active_tab.min(self.tabs.len() - 1);
        self.focus_active_pane(window, cx);
        cx.notify();
    }

    fn activate_tab(&mut self, index: usize, window: &mut Window, cx: &mut Context<Self>) {
        if index >= self.tabs.len() {
            return;
        }
        self.active_tab = index;
        self.focus_active_pane(window, cx);
        cx.notify();
    }

    pub fn focus_active_pane(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if let Some(pane) = self.active_pane() {
            window.focus(&pane.focus_handle(cx));
        }
    }

    fn cycle_tab(&mut self, delta: isize, window: &mut Window, cx: &mut Context<Self>) {
        if self.tabs.len() < 2 {
            return;
        }
        let count = self.tabs.len() as isize;
        let next = (self.active_tab as isize + delta).rem_euclid(count) as usize;
        self.activate_tab(next, window, cx);
    }

    fn cycle_pane(&mut self, delta: isize, window: &mut Window, cx: &mut Context<Self>) {
        let Some(tab) = self.tabs.get(self.active_tab) else {
            return;
        };
        let panes = tab.group.panes();
        if panes.len() < 2 {
            return;
        }

        let current = panes
            .iter()
            .position(|pane| pane.entity_id() == tab.active_pane)
            .unwrap_or(0) as isize;
        let next = (current + delta).rem_euclid(panes.len() as isize) as usize;
        let pane = panes[next].clone();
        self.focus_pane(&pane, window, cx);
    }

    fn open_settings(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.settings.is_some() {
            return;
        }

        let view = cx.new(SettingsView::new);
        self.settings_subscription = Some(cx.subscribe_in(
            &view,
            window,
            |this, _, _: &SettingsViewEvent, window, cx| this.close_settings(window, cx),
        ));
        window.focus(&view.focus_handle(cx));
        self.settings = Some(view);
        cx.notify();
    }

    fn close_settings(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.settings.take().is_some() {
            self.settings_subscription = None;
            self.focus_active_pane(window, cx);
            cx.notify();
        }
    }

    fn adjust_font_size(&mut self, delta: f32, cx: &mut Context<Self>) {
        Settings::update(cx, |settings| {
            settings.terminal_font_size = (settings.terminal_font_size + delta).clamp(6.0, 40.0);
        });
    }

    fn reset_font_size(&mut self, cx: &mut Context<Self>) {
        Settings::update(cx, |settings| {
            settings.terminal_font_size = crate::settings::DEFAULT_FONT_SIZE;
        });
    }

    fn render_tab_strip(&self, theme: &Theme, cx: &mut Context<Self>) -> impl IntoElement {
        let tabs =
            self.tabs
                .iter()
                .enumerate()
                .map(|(index, tab)| {
                    let is_active = index == self.active_tab;
                    let panes = tab.group.panes();
                    let focused_pane = panes
                        .iter()
                        .find(|pane| pane.entity_id() == tab.active_pane)
                        .or_else(|| panes.first());
                    let title = focused_pane
                        .map(|pane| pane.read(cx).title())
                        .unwrap_or_else(|| SharedString::from("shell"));
                    let exited = focused_pane.is_some_and(|pane| pane.read(cx).has_exited());
                    let dot = if exited {
                        theme.danger
                    } else if is_active {
                        theme.accent
                    } else {
                        theme.text_muted
                    };

                    div()
                        .id(("tab", index))
                        .flex()
                        .items_center()
                        .gap_2()
                        .h(px(26.0))
                        .px_3()
                        .rounded(Theme::radius())
                        .child(div().size(px(6.0)).rounded(px(3.0)).bg(dot))
                        .when(panes.len() > 1, |element| {
                            element.child(
                                div()
                                    .text_color(theme.text_muted)
                                    .child(format!("{}", panes.len())),
                            )
                        })
                        .child(div().min_w_0().truncate().child(title))
                        .when(is_active, |element| {
                            element.bg(theme.elevated).text_color(theme.text)
                        })
                        .when(!is_active, |element| {
                            element
                                .text_color(theme.text_muted)
                                .hover(|style| style.bg(theme.elevated))
                        })
                        .on_click(cx.listener(move |this, _, window, cx| {
                            this.activate_tab(index, window, cx)
                        }))
                        .child(
                            div()
                                .id(("close-tab", index))
                                .px_1()
                                .rounded(px(2.0))
                                .text_color(theme.text_muted)
                                .hover(|style| style.text_color(theme.danger))
                                .child("×")
                                .on_click(cx.listener(move |this, _, window, cx| {
                                    cx.stop_propagation();
                                    this.close_tab(index, window, cx);
                                })),
                        )
                })
                .collect::<Vec<_>>();

        div()
            .flex()
            .items_center()
            .gap_1()
            .h(px(38.0))
            .pl(px(TITLEBAR_LEADING_PADDING))
            .pr_2()
            .bg(theme.surface)
            .border_b_1()
            .border_color(theme.border)
            .children(tabs)
            .child(
                div()
                    .id("new-tab")
                    .flex()
                    .items_center()
                    .justify_center()
                    .size(px(24.0))
                    .rounded(Theme::radius())
                    .text_color(theme.text_muted)
                    .hover(|style| style.bg(theme.elevated).text_color(theme.text))
                    .child("+")
                    .on_click(cx.listener(|this, _, window, cx| this.open_tab(window, cx))),
            )
    }

    fn render_status_bar(&self, theme: &Theme, cx: &mut Context<Self>) -> impl IntoElement {
        let panes = self
            .tabs
            .get(self.active_tab)
            .map(|tab| tab.group.panes().len())
            .unwrap_or(0);

        let left = match &self.status {
            Some(status) => div().text_color(theme.danger).child(status.clone()),
            None => div().text_color(theme.text_muted).child(format!(
                "{} tab{} · {} pane{} · {}",
                self.tabs.len(),
                if self.tabs.len() == 1 { "" } else { "s" },
                panes,
                if panes == 1 { "" } else { "s" },
                theme.name
            )),
        };

        div()
            .flex()
            .items_center()
            .justify_between()
            .h(px(24.0))
            .px_3()
            .bg(theme.surface)
            .border_t_1()
            .border_color(theme.border)
            .text_size(px(11.0))
            .child(left)
            .child(
                div()
                    .id("open-settings")
                    .px_2()
                    .rounded(px(2.0))
                    .text_color(theme.text_muted)
                    .hover(|style| style.text_color(theme.text))
                    .cursor_pointer()
                    .child(SharedString::from(shortcut_hint()))
                    .on_click(cx.listener(|this, _, window, cx| this.open_settings(window, cx))),
            )
    }
}

impl Focusable for Workspace {
    fn focus_handle(&self, _: &gpui::App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl Render for Workspace {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.global::<Theme>().clone();
        let active = self.tabs.get(self.active_tab);
        let content = active.map(|tab| tab.group.render(Some(tab.active_pane), &theme));

        div()
            .key_context(WORKSPACE_CONTEXT)
            .track_focus(&self.focus_handle)
            .relative()
            .size_full()
            .flex()
            .flex_col()
            .bg(theme.background)
            .text_color(theme.text)
            .text_size(theme.ui_font_size)
            .font_family(theme.ui_font_family.clone())
            .on_action(cx.listener(|this, _: &NewTab, window, cx| this.open_tab(window, cx)))
            .on_action(cx.listener(|this, _: &CloseTab, window, cx| {
                this.close_tab(this.active_tab, window, cx)
            }))
            .on_action(cx.listener(|this, _: &NextTab, window, cx| this.cycle_tab(1, window, cx)))
            .on_action(
                cx.listener(|this, _: &PreviousTab, window, cx| this.cycle_tab(-1, window, cx)),
            )
            .on_action(cx.listener(|this, _: &SplitRight, window, cx| {
                this.split(Axis::Horizontal, window, cx)
            }))
            .on_action(
                cx.listener(|this, _: &SplitDown, window, cx| {
                    this.split(Axis::Vertical, window, cx)
                }),
            )
            .on_action(
                cx.listener(|this, _: &ClosePane, window, cx| this.close_active_pane(window, cx)),
            )
            .on_action(
                cx.listener(|this, _: &FocusNextPane, window, cx| this.cycle_pane(1, window, cx)),
            )
            .on_action(cx.listener(|this, _: &FocusPreviousPane, window, cx| {
                this.cycle_pane(-1, window, cx)
            }))
            .on_action(cx.listener(|this, _: &CopySelection, _, cx| {
                if let Some(pane) = this.active_pane() {
                    pane.update(cx, |pane, cx| pane.copy(cx));
                }
            }))
            .on_action(cx.listener(|this, _: &PasteClipboard, _, cx| {
                if let Some(pane) = this.active_pane() {
                    pane.update(cx, |pane, cx| pane.paste(cx));
                }
            }))
            .on_action(cx.listener(|this, _: &ClearScreen, _, cx| {
                if let Some(pane) = this.active_pane() {
                    pane.update(cx, |pane, cx| pane.clear(cx));
                }
            }))
            .on_action(
                cx.listener(|this, _: &IncreaseFontSize, _, cx| this.adjust_font_size(1.0, cx)),
            )
            .on_action(
                cx.listener(|this, _: &DecreaseFontSize, _, cx| this.adjust_font_size(-1.0, cx)),
            )
            .on_action(cx.listener(|this, _: &ResetFontSize, _, cx| this.reset_font_size(cx)))
            .on_action(
                cx.listener(|this, _: &OpenSettings, window, cx| this.open_settings(window, cx)),
            )
            .on_action(
                cx.listener(|this, _: &CloseSettings, window, cx| this.close_settings(window, cx)),
            )
            .child(self.render_tab_strip(&theme, cx))
            .child(div().flex().flex_1().min_h_0().p_2().children(content))
            .child(self.render_status_bar(&theme, cx))
            .children(self.settings.clone())
    }
}

fn shortcut_hint() -> &'static str {
    if cfg!(target_os = "macos") {
        "⌘T tab · ⌘D split · ⌘] pane · ⌘, settings"
    } else {
        "ctrl+shift T tab · D split · ] pane · , settings"
    }
}
