#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // On Linux, Wayland does not support foreign subwindow embedding (reparenting via wid).
        // Forcing GDK_BACKEND=x11 ensures GTK3 runs on X11 or XWayland, allowing libmpv
        // to embed its video surface directly into the application window via X11 Window ID.
        std::env::set_var("GDK_BACKEND", "x11");
    }

    lumen_app_lib::run();
}
