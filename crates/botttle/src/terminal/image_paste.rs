//! Pasting an image into a terminal.
//!
//! A terminal can't carry pixels, so a clipboard image is written to a file and
//! the path is typed into the pane instead. That is the same shape as dropping a
//! file onto a terminal, which is how the coding CLIs — Claude Code, Codex —
//! already take images.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use anyhow::{Context as _, Result};
use gpui::{Image, ImageFormat};

/// Pasted images older than this are removed the next time one is written.
pub const MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);

/// Where pasted images are written. Under the system temp dir, so nothing is
/// left behind permanently.
pub fn directory() -> PathBuf {
    std::env::temp_dir().join("botttle-images")
}

pub fn extension(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::Webp => "webp",
        ImageFormat::Gif => "gif",
        ImageFormat::Svg => "svg",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Tiff => "tiff",
    }
}

/// Writes a clipboard image into `directory` and returns its path.
pub fn write(image: &Image, now: SystemTime) -> Result<PathBuf> {
    let directory = directory();
    fs::create_dir_all(&directory)
        .with_context(|| format!("could not create {}", directory.display()))?;
    prune(&directory, MAX_AGE, now);

    let stamp = now
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let path = directory.join(format!("pasted-{stamp}.{}", extension(image.format)));

    fs::write(&path, &image.bytes)
        .with_context(|| format!("could not write {}", path.display()))?;
    Ok(path)
}

/// Deletes previously pasted images that are older than `max_age`. Best effort:
/// a file that can't be read or removed is left alone.
pub fn prune(directory: &Path, max_age: Duration, now: SystemTime) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };

    for entry in entries.flatten() {
        let is_ours = entry
            .file_name()
            .to_str()
            .is_some_and(|name| name.starts_with("pasted-"));
        if !is_ours {
            continue;
        }

        let Ok(modified) = entry.metadata().and_then(|metadata| metadata.modified()) else {
            continue;
        };
        if now.duration_since(modified).is_ok_and(|age| age > max_age) {
            let _ = fs::remove_file(entry.path());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extensions_match_the_clipboard_format() {
        assert_eq!(extension(ImageFormat::Png), "png");
        assert_eq!(extension(ImageFormat::Jpeg), "jpg");
        assert_eq!(extension(ImageFormat::Tiff), "tiff");
    }

    #[test]
    fn writes_the_bytes_it_was_given() {
        let bytes = b"\x89PNG\r\n\x1a\nnot-really-a-png".to_vec();
        let image = Image::from_bytes(ImageFormat::Png, bytes.clone());

        let path = write(&image, SystemTime::now()).expect("writes");
        assert_eq!(path.extension().and_then(|e| e.to_str()), Some("png"));
        assert_eq!(fs::read(&path).expect("reads back"), bytes);

        fs::remove_file(&path).ok();
    }

    #[test]
    fn pruning_only_removes_our_own_stale_files() {
        let directory = std::env::temp_dir().join("botttle-images-prune-test");
        fs::create_dir_all(&directory).expect("temp dir");
        let stale = directory.join("pasted-1.png");
        let fresh = directory.join("pasted-2.png");
        let theirs = directory.join("someone-elses.png");
        for path in [&stale, &fresh, &theirs] {
            fs::write(path, b"x").expect("write");
        }

        // Everything on disk was just written, so "now" is moved into the future
        // to age the files rather than waiting for them to get old.
        let later = SystemTime::now() + Duration::from_secs(60);
        prune(&directory, Duration::from_secs(30), later);
        assert!(!stale.exists());
        assert!(!fresh.exists());
        assert!(theirs.exists(), "files we did not write are left alone");

        fs::remove_dir_all(&directory).ok();
    }
}
