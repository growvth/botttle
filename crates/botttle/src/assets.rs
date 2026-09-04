//! Assets compiled into the binary.
//!
//! Everything the UI draws ships inside the executable, so `cargo run` from a
//! fresh clone looks the same as an installed build — there is no asset
//! directory to lose.

use std::borrow::Cow;

use anyhow::Result;
use gpui::{AssetSource, SharedString};

/// The app mark, at a size that stays sharp on a retina titlebar.
pub const LOGO: &str = "logo.png";

const LOGO_BYTES: &[u8] = include_bytes!("../assets/logo-256.png");

pub struct Assets;

impl AssetSource for Assets {
    fn load(&self, path: &str) -> Result<Option<Cow<'static, [u8]>>> {
        match path {
            LOGO => Ok(Some(Cow::Borrowed(LOGO_BYTES))),
            _ => Ok(None),
        }
    }

    fn list(&self, _path: &str) -> Result<Vec<SharedString>> {
        Ok(vec![SharedString::from(LOGO)])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_logo_is_a_png_and_is_reachable_by_name() {
        let bytes = Assets
            .load(LOGO)
            .expect("no error")
            .expect("the logo is embedded");
        assert_eq!(&bytes[..8], b"\x89PNG\r\n\x1a\n");

        // The IHDR dimensions, so a truncated or mis-scaled copy is caught here
        // rather than showing up as a blank titlebar.
        let width = u32::from_be_bytes(bytes[16..20].try_into().expect("IHDR width"));
        let height = u32::from_be_bytes(bytes[20..24].try_into().expect("IHDR height"));
        assert_eq!((width, height), (256, 256));
    }

    #[test]
    fn unknown_assets_are_absent_rather_than_an_error() {
        assert!(Assets.load("nope.png").expect("no error").is_none());
    }
}
