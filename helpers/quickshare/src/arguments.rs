use std::path::PathBuf;

use crate::protocol::VisibilityName;

pub const USAGE: &str = "usage: neoshell-quickshare [--device-name <name>] [--download-dir <path>] \
[--visibility visible|invisible|temporarily]";

/// `None` fields fall back to the library defaults: the hostname and the XDG
/// download directory.
pub struct Arguments {
    pub device_name: Option<String>,
    pub download_directory: Option<PathBuf>,
    pub visibility: VisibilityName,
}

impl Arguments {
    pub fn parse(mut raw_arguments: impl Iterator<Item = String>) -> Result<Self, String> {
        let mut arguments = Arguments {
            device_name: None,
            download_directory: None,
            visibility: VisibilityName::Invisible,
        };
        while let Some(flag) = raw_arguments.next() {
            let value = raw_arguments
                .next()
                .ok_or_else(|| format!("{flag} needs a value"))?;
            arguments.apply(&flag, value)?;
        }
        Ok(arguments)
    }

    fn apply(&mut self, flag: &str, value: String) -> Result<(), String> {
        match flag {
            "--device-name" => self.device_name = Some(value),
            "--download-dir" => self.download_directory = Some(existing_directory(&value)?),
            "--visibility" => self.visibility = value.parse()?,
            other => return Err(format!("unknown argument {other:?}")),
        }
        Ok(())
    }
}

pub fn existing_directory(path: &str) -> Result<PathBuf, String> {
    let directory = PathBuf::from(path);
    if !directory.is_dir() {
        return Err(format!("{path:?} is not a directory"));
    }
    Ok(directory)
}
