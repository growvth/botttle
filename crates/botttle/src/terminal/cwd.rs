//! Where a new pane should start.
//!
//! Opening a tab or a split in the directory you are already in is what every
//! terminal does, and it matters more here: panes are how work is organised, and
//! a new one that lands in `/` is a new one you have to `cd` out of.

use std::os::fd::{AsRawFd, OwnedFd};
use std::path::PathBuf;

/// The directory a brand new pane starts in, when there is no pane to inherit
/// from.
///
/// A GUI launch — from the dock, from Finder, from `open` — gives the process a
/// working directory of `/`, which is useless to a shell. Launching from a
/// terminal gives a directory worth keeping.
pub fn default_directory() -> Option<PathBuf> {
    let launched_in = std::env::current_dir()
        .ok()
        .filter(|path| path.parent().is_some() && path.is_dir());

    launched_in.or_else(home).filter(|path| path.is_dir())
}

pub fn home() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

/// Duplicates the pty controller so a terminal can keep asking about it after
/// the pty itself has moved into the IO thread. `None` if the duplicate fails,
/// which only costs us directory inheritance.
pub fn duplicate_master(file: &std::fs::File) -> Option<OwnedFd> {
    file.try_clone().ok().map(OwnedFd::from)
}

/// The process group in the foreground of a terminal: the shell sitting at its
/// prompt, or whatever program it is currently running.
pub fn foreground_process(master: &OwnedFd) -> Option<u32> {
    // SAFETY: `master` is an open file descriptor we own for the duration of
    // the call; tcgetpgrp only reads terminal state from it.
    let group = unsafe { libc::tcgetpgrp(master.as_raw_fd()) };
    (group > 0).then_some(group as u32)
}

/// The working directory of a running process, so a new pane can start where the
/// old one is. `None` when the process is gone or the platform has no answer.
pub fn of_process(pid: u32) -> Option<PathBuf> {
    platform::of_process(pid).filter(|path| path.is_dir())
}

#[cfg(target_os = "macos")]
mod platform {
    use std::ffi::OsStr;
    use std::os::unix::ffi::OsStrExt;
    use std::path::PathBuf;

    pub fn of_process(pid: u32) -> Option<PathBuf> {
        let mut info: libc::proc_vnodepathinfo = unsafe { std::mem::zeroed() };
        let size = std::mem::size_of::<libc::proc_vnodepathinfo>() as libc::c_int;

        // SAFETY: `info` is a zeroed value of exactly the type this call fills,
        // and `size` is its real size, so the kernel cannot write past it. The
        // result is only read when the call reports it filled the whole struct.
        let written = unsafe {
            libc::proc_pidinfo(
                pid as libc::c_int,
                libc::PROC_PIDVNODEPATHINFO,
                0,
                &mut info as *mut _ as *mut libc::c_void,
                size,
            )
        };
        if written != size {
            return None;
        }

        // libc splits the path buffer into chunks to stay compatible with older
        // compilers, so flatten it back into one NUL-terminated string.
        let path: Vec<u8> = info
            .pvi_cdir
            .vip_path
            .iter()
            .flatten()
            .take_while(|byte| **byte != 0)
            .map(|byte| *byte as u8)
            .collect();
        if path.is_empty() {
            return None;
        }

        Some(PathBuf::from(OsStr::from_bytes(&path)))
    }
}

#[cfg(target_os = "linux")]
mod platform {
    use std::path::PathBuf;

    pub fn of_process(pid: u32) -> Option<PathBuf> {
        std::fs::read_link(format!("/proc/{pid}/cwd")).ok()
    }
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
mod platform {
    use std::path::PathBuf;

    pub fn of_process(_pid: u32) -> Option<PathBuf> {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn our_own_working_directory_is_readable() {
        let pid = std::process::id();
        let found = of_process(pid).expect("this process has a working directory");
        assert_eq!(
            found.canonicalize().ok(),
            std::env::current_dir()
                .ok()
                .and_then(|d| d.canonicalize().ok())
        );
    }

    #[test]
    fn a_dead_process_has_no_directory() {
        // Reaped, out of range, and never a real pid.
        assert!(of_process(u32::MAX).is_none());
    }

    #[test]
    fn the_default_is_always_a_real_directory() {
        let directory = default_directory().expect("some directory is available");
        assert!(directory.is_dir());
        assert_ne!(directory, std::path::Path::new("/"));
    }
}
