//! botttle — an agentic development environment.
//!
//! Today it is a GPU-rendered terminal workspace: tabs, splittable panes, and a
//! real PTY behind each pane. The pane tree and the event plumbing are built so
//! that agent-driven panes can sit beside shell panes later without reshaping
//! the app around them.

mod actions;
mod pane;
mod settings;
mod settings_view;
mod terminal;
mod theme;
mod workspace;

use gpui::{
    point, px, size, App, AppContext, Application, Bounds, TitlebarOptions, WindowBounds,
    WindowOptions,
};

use crate::workspace::Workspace;

fn main() {
    // Sets TERM and COLORTERM for every shell we spawn.
    alacritty_terminal::tty::setup_env();

    Application::new().run(|cx: &mut App| {
        settings::init(cx);
        theme::init(cx);
        actions::init(cx);

        cx.on_action(|_: &actions::Quit, cx| cx.quit());

        let bounds = Bounds::centered(None, size(px(1120.0), px(720.0)), cx);
        let window = cx
            .open_window(
                WindowOptions {
                    window_bounds: Some(WindowBounds::Windowed(bounds)),
                    titlebar: Some(TitlebarOptions {
                        title: Some("botttle".into()),
                        appears_transparent: true,
                        traffic_light_position: Some(point(px(16.0), px(16.0))),
                    }),
                    window_min_size: Some(size(px(600.0), px(400.0))),
                    app_id: Some("dev.botttle".to_string()),
                    ..Default::default()
                },
                |window, cx| cx.new(|cx| Workspace::new(window, cx)),
            )
            .expect("failed to open the botttle window");

        window
            .update(cx, |workspace, window, cx| {
                workspace.focus_active_pane(window, cx);
            })
            .ok();

        cx.activate(true);
    });
}
