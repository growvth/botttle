//! Turning things into shell input.

use std::path::Path;

/// Renders a path as a single shell word, so a directory with spaces or quotes
/// in it still arrives at the prompt in one piece.
pub fn quote(path: &Path) -> String {
    let path = path.to_string_lossy();
    let needs_quoting = path.is_empty()
        || path
            .chars()
            .any(|c| !matches!(c, 'a'..='z' | 'A'..='Z' | '0'..='9' | '/' | '.' | '_' | '-' | '~'));

    if needs_quoting {
        format!("'{}'", path.replace('\'', r"'\''"))
    } else {
        path.into_owned()
    }
}

/// Joins dropped or pasted paths into something a prompt can take, with a
/// trailing space so the next word does not run into the last path.
pub fn quote_all<'a>(paths: impl IntoIterator<Item = &'a Path>) -> String {
    let mut line = String::new();
    for path in paths {
        line.push_str(&quote(path));
        line.push(' ');
    }
    line
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn paths_are_quoted_only_when_they_need_it() {
        assert_eq!(quote(Path::new("/tmp/pasted-1.png")), "/tmp/pasted-1.png");
        assert_eq!(
            quote(Path::new("/tmp/my images/a.png")),
            "'/tmp/my images/a.png'"
        );
        assert_eq!(quote(Path::new("/tmp/it's.png")), r"'/tmp/it'\''s.png'");
    }

    #[test]
    fn several_paths_arrive_as_separate_words() {
        let paths = [
            PathBuf::from("/a/one.png"),
            PathBuf::from("/b/two three.png"),
        ];
        assert_eq!(
            quote_all(paths.iter().map(PathBuf::as_path)),
            "/a/one.png '/b/two three.png' "
        );
    }
}
