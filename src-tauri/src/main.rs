#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

#[cfg(target_os = "linux")]
fn configure_linux_webview() {
    const DISABLE_DMABUF_RENDERER: &str = "WEBKIT_DISABLE_DMABUF_RENDERER";

    if std::env::var_os(DISABLE_DMABUF_RENDERER).is_none() {
        // SAFETY: this runs at the very start of main, before Tauri or any other
        // application code can create threads or initialize WebKitGTK.
        unsafe { std::env::set_var(DISABLE_DMABUF_RENDERER, "1") };
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    configure_linux_webview();

    computability_lib::run();
}
