export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'ended'
  | 'error';

export interface PlaybackStatus {
  state: PlaybackState;
  path: string | null;
  title: string | null;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  speed: number;
  current_audio_track: number | null;
  current_sub_track: number | null;
  video_width: number | null;
  video_height: number | null;
  hwdec_active: boolean;
  cache_seconds: number;
  seeking: boolean;
  error_message: string | null;
}

export type TrackType = 'video' | 'audio' | 'subtitle';

export interface TrackInfo {
  id: number;
  track_type: TrackType;
  title: string | null;
  language?: string | null;
  lang?: string | null;
  codec: string | null;
  default_track?: boolean;
  forced_track?: boolean;
  dependent_track?: boolean;
  selected?: boolean;
  external?: boolean;
  is_default?: boolean;
  is_forced?: boolean;
  is_selected?: boolean;
  is_external?: boolean;
  external_filename: string | null;
  audio_channels: number | null;
  audio_samplerate: number | null;
}

export type MediaTrack = TrackInfo;

export interface Chapter {
  index: number;
  title: string;
  time: number;
}

export interface PlaylistItem {
  id: string;
  path: string;
  title: string;
  duration: number;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface Playlist {
  items: PlaylistItem[];
  current_index: number | null;
  shuffle: boolean;
  repeat_mode: RepeatMode;
}

export interface HistoryItem {
  path: string;
  title: string;
  last_position: number;
  duration: number;
  last_played_at: string;
  completed: boolean;
}

export interface LibraryItem {
  id: number;
  path: string;
  title: string;
  duration: number;
  file_size: number;
  format: string;
}

export interface EqualizerState {
  enabled: boolean;
  preset: string;
  bands: [number, number, number, number, number, number, number, number, number, number];
}

export interface VideoAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
  rotation: number;
  flip_h: boolean;
  flip_v: boolean;
  aspect_ratio: string;
  zoom: number;
  pan_x: number;
  pan_y: number;
  deinterlace: boolean;
}

export interface SubtitleStyle {
  font: string;
  font_size: number;
  color: string;
  border_color: string;
  border_size: number;
  shadow_offset: number;
  background_color: string;
  pos_y_percent: number;
}

export interface AppSettings {
  theme?: string;
  accent_color?: string;
  preferred_audio_lang: string;
  preferred_subtitle_lang: string;
  hwdec: string;
  resume_playback: boolean;
  autoplay_next?: boolean;
  watched_folders?: string[];
  seek_step_short: number;
  seek_step_long: number;
  volume_step: number;
  audio_delay: number;
  subtitle_delay: number;
  channel_mode: string;
  auto_load_subtitles: boolean;
  subtitle_style: SubtitleStyle;
  shortcuts: Record<string, string>;
}

export interface MpvDiagnostics {
  libmpv_loaded: boolean;
  mpv_version: string;
  active_vo: string;
  active_gpu_context: string;
  hwdec_current: string;
  current_file: string | null;
  current_audio_track: MediaTrack | null;
  current_sub_track: MediaTrack | null;
  recent_error: string | null;
}

