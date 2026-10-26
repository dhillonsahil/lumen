use crate::ffi::{LibMpvApi, MpvEvent, MpvFormat, MpvHandle};
use lumen_core::error::PlaybackError;
use std::ffi::{CStr, CString};
use std::ptr;
use std::sync::Arc;
use tracing::{debug, info};

pub struct MpvInstance {
    handle: *mut MpvHandle,
    api: Arc<LibMpvApi>,
}

unsafe impl Send for MpvInstance {}
unsafe impl Sync for MpvInstance {}

impl MpvInstance {
    pub fn new(api: Arc<LibMpvApi>) -> Result<Self, PlaybackError> {
        let handle = unsafe { (api.mpv_create)() };
        if handle.is_null() {
            return Err(PlaybackError::InitFailed(
                "mpv_create returned null pointer".into(),
            ));
        }

        Ok(Self { handle, api })
    }

    pub fn initialize(&self) -> Result<(), PlaybackError> {
        let res = unsafe { (self.api.mpv_initialize)(self.handle) };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::InitFailed(format!(
                "mpv_initialize failed (code {}): {}",
                res, err_str
            )));
        }
        info!("libmpv engine initialized successfully");
        Ok(())
    }

    pub fn set_option_string(&self, name: &str, val: &str) -> Result<(), PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::CommandError {
            command: name.to_string(),
            message: e.to_string(),
        })?;
        let c_val = CString::new(val).map_err(|e| PlaybackError::CommandError {
            command: name.to_string(),
            message: e.to_string(),
        })?;

        let res = unsafe {
            (self.api.mpv_set_option_string)(self.handle, c_name.as_ptr(), c_val.as_ptr())
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("set_option failed ({}): {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn command(&self, args: &[&str]) -> Result<(), PlaybackError> {
        let c_args: Result<Vec<CString>, _> = args.iter().map(|s| CString::new(*s)).collect();
        let c_args = c_args.map_err(|e| PlaybackError::CommandError {
            command: format!("{:?}", args),
            message: e.to_string(),
        })?;

        let mut pointers: Vec<*const std::ffi::c_char> =
            c_args.iter().map(|cs| cs.as_ptr()).collect();
        pointers.push(ptr::null());

        let res = unsafe { (self.api.mpv_command)(self.handle, pointers.as_ptr()) };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::CommandError {
                command: format!("{:?}", args),
                message: format!("code {}: {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn command_string(&self, cmd: &str) -> Result<(), PlaybackError> {
        let c_cmd = CString::new(cmd).map_err(|e| PlaybackError::CommandError {
            command: cmd.to_string(),
            message: e.to_string(),
        })?;

        let res = unsafe { (self.api.mpv_command_string)(self.handle, c_cmd.as_ptr()) };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::CommandError {
                command: cmd.to_string(),
                message: format!("code {}: {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn set_property_string(&self, name: &str, val: &str) -> Result<(), PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;
        let c_val = CString::new(val).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;

        let res = unsafe {
            (self.api.mpv_set_property_string)(self.handle, c_name.as_ptr(), c_val.as_ptr())
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("set_property_string failed ({}): {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn set_property_double(&self, name: &str, val: f64) -> Result<(), PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;
        let mut d = val;

        let res = unsafe {
            (self.api.mpv_set_property)(
                self.handle,
                c_name.as_ptr(),
                MpvFormat::Double,
                &mut d as *mut f64 as *mut std::ffi::c_void,
            )
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("set_property_double failed ({}): {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn set_property_int64(&self, name: &str, val: i64) -> Result<(), PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;
        let mut i = val;

        let res = unsafe {
            (self.api.mpv_set_property)(
                self.handle,
                c_name.as_ptr(),
                MpvFormat::Int64,
                &mut i as *mut i64 as *mut std::ffi::c_void,
            )
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("set_property_int64 failed ({}): {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn set_property_flag(&self, name: &str, val: bool) -> Result<(), PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;
        let mut b: std::ffi::c_int = if val { 1 } else { 0 };

        let res = unsafe {
            (self.api.mpv_set_property)(
                self.handle,
                c_name.as_ptr(),
                MpvFormat::Flag,
                &mut b as *mut std::ffi::c_int as *mut std::ffi::c_void,
            )
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("set_property_flag failed ({}): {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn get_property_string(&self, name: &str) -> Result<String, PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;

        let res_ptr = unsafe { (self.api.mpv_get_property_string)(self.handle, c_name.as_ptr()) };
        if res_ptr.is_null() {
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: "get_property_string returned null".into(),
            });
        }

        let s = unsafe { CStr::from_ptr(res_ptr).to_string_lossy().into_owned() };
        unsafe { (self.api.mpv_free)(res_ptr as *mut std::ffi::c_void) };
        Ok(s)
    }

    pub fn get_property_double(&self, name: &str) -> Result<f64, PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;
        let mut val: f64 = 0.0;

        let res = unsafe {
            (self.api.mpv_get_property)(
                self.handle,
                c_name.as_ptr(),
                MpvFormat::Double,
                &mut val as *mut f64 as *mut std::ffi::c_void,
            )
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("get_property_double failed ({}): {}", res, err_str),
            });
        }
        Ok(val)
    }

    pub fn get_property_int64(&self, name: &str) -> Result<i64, PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;
        let mut val: i64 = 0;

        let res = unsafe {
            (self.api.mpv_get_property)(
                self.handle,
                c_name.as_ptr(),
                MpvFormat::Int64,
                &mut val as *mut i64 as *mut std::ffi::c_void,
            )
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("get_property_int64 failed ({}): {}", res, err_str),
            });
        }
        Ok(val)
    }

    pub fn get_property_flag(&self, name: &str) -> Result<bool, PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;
        let mut val: std::ffi::c_int = 0;

        let res = unsafe {
            (self.api.mpv_get_property)(
                self.handle,
                c_name.as_ptr(),
                MpvFormat::Flag,
                &mut val as *mut std::ffi::c_int as *mut std::ffi::c_void,
            )
        };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("get_property_flag failed ({}): {}", res, err_str),
            });
        }
        Ok(val != 0)
    }

    pub fn observe_property(
        &self,
        id: u64,
        name: &str,
        format: MpvFormat,
    ) -> Result<(), PlaybackError> {
        let c_name = CString::new(name).map_err(|e| PlaybackError::PropertyError {
            property: name.to_string(),
            message: e.to_string(),
        })?;

        let res =
            unsafe { (self.api.mpv_observe_property)(self.handle, id, c_name.as_ptr(), format) };
        if res < 0 {
            let err_str = self.error_string(res);
            return Err(PlaybackError::PropertyError {
                property: name.to_string(),
                message: format!("observe_property failed ({}): {}", res, err_str),
            });
        }
        Ok(())
    }

    pub fn wait_event(&self, timeout: f64) -> *mut MpvEvent {
        unsafe { (self.api.mpv_wait_event)(self.handle, timeout) }
    }

    pub fn error_string(&self, code: std::ffi::c_int) -> String {
        unsafe {
            let ptr = (self.api.mpv_error_string)(code);
            if ptr.is_null() {
                format!("Unknown error {}", code)
            } else {
                CStr::from_ptr(ptr).to_string_lossy().into_owned()
            }
        }
    }

    pub fn raw_handle(&self) -> *mut MpvHandle {
        self.handle
    }
}

impl Drop for MpvInstance {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            debug!("Destroying mpv instance");
            unsafe {
                (self.api.mpv_terminate_destroy)(self.handle);
            }
            self.handle = ptr::null_mut();
        }
    }
}
