fn main() {
    // On Linux, link against libmpv so that:
    // 1. The binary ELF headers contain DT_NEEDED for libmpv.so.
    // 2. linuxdeploy automatically traces and bundles libmpv.so + all codec dependencies into the AppImage.
    // 3. dpkg-shlibdeps automatically detects and declares libmpv2 in Debian/Ubuntu .deb packages.
    #[cfg(target_os = "linux")]
    {
        println!("cargo:rustc-link-lib=dylib=mpv");
    }
}
