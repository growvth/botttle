//! The pane tree.
//!
//! A tab holds one [`PaneGroup`]: either a single pane or nested rows and columns
//! of them. Splitting along the axis a pane already lives on adds a sibling
//! instead of nesting deeper, which is what keeps repeated splits flat and
//! predictable.

use gpui::{div, px, AnyElement, Axis, Entity, EntityId, IntoElement, ParentElement, Styled};

use crate::terminal::view::TerminalView;
use crate::theme::Theme;

/// Gap between neighbouring panes, in pixels.
const GUTTER: f32 = 6.0;

pub struct PaneGroup {
    root: Member,
}

enum Member {
    Pane(Entity<TerminalView>),
    Axis(PaneAxis),
}

struct PaneAxis {
    axis: Axis,
    members: Vec<Member>,
}

/// What happened when a pane was closed.
#[derive(Debug, PartialEq, Eq)]
pub enum RemoveResult {
    /// The pane is gone and the group still has panes left.
    Removed,
    /// The pane was the last one, so the whole group should go away.
    GroupEmpty,
    NotFound,
}

impl PaneGroup {
    pub fn new(pane: Entity<TerminalView>) -> Self {
        Self {
            root: Member::Pane(pane),
        }
    }

    /// Splits `target` along `axis`, placing `new_pane` after it.
    pub fn split(&mut self, target: EntityId, axis: Axis, new_pane: Entity<TerminalView>) -> bool {
        self.root.split(target, axis, new_pane)
    }

    pub fn remove(&mut self, target: EntityId) -> RemoveResult {
        match &self.root {
            Member::Pane(pane) if pane.entity_id() == target => RemoveResult::GroupEmpty,
            Member::Pane(_) => RemoveResult::NotFound,
            Member::Axis(_) => {
                if self.root.remove(target) {
                    RemoveResult::Removed
                } else {
                    RemoveResult::NotFound
                }
            }
        }
    }

    /// Every pane, left to right and top to bottom. Used for cycling focus.
    pub fn panes(&self) -> Vec<Entity<TerminalView>> {
        let mut panes = Vec::new();
        self.root.collect(&mut panes);
        panes
    }

    pub fn render(&self, active: Option<EntityId>, theme: &Theme) -> AnyElement {
        self.root.render(active, theme)
    }
}

impl Member {
    fn split(&mut self, target: EntityId, axis: Axis, new_pane: Entity<TerminalView>) -> bool {
        match self {
            Member::Pane(pane) => {
                if pane.entity_id() != target {
                    return false;
                }
                let existing = Member::Pane(pane.clone());
                *self = Member::Axis(PaneAxis {
                    axis,
                    members: vec![existing, Member::Pane(new_pane)],
                });
                true
            }
            Member::Axis(pane_axis) => {
                if pane_axis.axis == axis {
                    let position = pane_axis.members.iter().position(
                        |member| matches!(member, Member::Pane(pane) if pane.entity_id() == target),
                    );
                    if let Some(index) = position {
                        pane_axis.members.insert(index + 1, Member::Pane(new_pane));
                        return true;
                    }
                }

                pane_axis
                    .members
                    .iter_mut()
                    .any(|member| member.split(target, axis, new_pane.clone()))
            }
        }
    }

    fn remove(&mut self, target: EntityId) -> bool {
        let Member::Axis(pane_axis) = self else {
            return false;
        };

        let position = pane_axis
            .members
            .iter()
            .position(|member| matches!(member, Member::Pane(pane) if pane.entity_id() == target));

        match position {
            Some(index) => {
                pane_axis.members.remove(index);
            }
            None => {
                if !pane_axis
                    .members
                    .iter_mut()
                    .any(|member| member.remove(target))
                {
                    return false;
                }
            }
        }

        // An axis with a single child is just that child.
        if pane_axis.members.len() == 1 {
            let only = pane_axis.members.pop().expect("checked length");
            *self = only;
        }
        true
    }

    fn collect(&self, panes: &mut Vec<Entity<TerminalView>>) {
        match self {
            Member::Pane(pane) => panes.push(pane.clone()),
            Member::Axis(pane_axis) => {
                for member in &pane_axis.members {
                    member.collect(panes);
                }
            }
        }
    }

    fn render(&self, active: Option<EntityId>, theme: &Theme) -> AnyElement {
        match self {
            Member::Pane(pane) => {
                let is_focused = active == Some(pane.entity_id());
                div()
                    .flex()
                    .flex_1()
                    .min_w_0()
                    .min_h_0()
                    .overflow_hidden()
                    .rounded(Theme::radius())
                    .border_1()
                    // The focused pane is marked by its border alone: enough to
                    // find at a glance, quiet enough to ignore while reading output.
                    .border_color(if is_focused {
                        theme.focus_ring()
                    } else {
                        theme.border
                    })
                    .child(pane.clone())
                    .into_any_element()
            }
            Member::Axis(pane_axis) => {
                let container = div().flex().flex_1().min_w_0().min_h_0().gap(px(GUTTER));
                let container = match pane_axis.axis {
                    Axis::Horizontal => container.flex_row(),
                    Axis::Vertical => container.flex_col(),
                };
                container
                    .children(
                        pane_axis
                            .members
                            .iter()
                            .map(|member| member.render(active, theme)),
                    )
                    .into_any_element()
            }
        }
    }
}
