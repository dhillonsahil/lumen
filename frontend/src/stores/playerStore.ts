import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import {
  PlaybackStatus,
  MediaTrack,
  Chapter,
  Playlist,
  HistoryItem,
  LibraryItem,
  EqualizerState,
  VideoAdjustments,
  AppSettings,
  RepeatMode,
} from '../types';

interface PlayerStore {
  status: PlaybackStatus;
  tracks: MediaTrack[];
  chapters: Chapter[];
  playlist: Playlist;
  history: HistoryItem[];
  library: LibraryItem[];
  equalizer: EqualizerState;
  videoAdjustments: VideoAdjustments;
  settings: AppSettings | null;
  diagnostics: import('../types').MpvDiagnostics | null;

  activeModal: 'tracks' | 'equalizer' | 'video' | 'settings' | 'open_url' | 'diagnostics' | null;
  activeDrawer: 'playlist' | 'library' | null;
  controlsVisible: boolean;
  isFullscreen: boolean;
  isMiniPlayer: boolean;

  // Actions
  init: () => Promise<void>;
  fetchDiagnostics: () => Promise<void>;
  setControlsVisible: (visible: boolean) => void;
  setActiveModal: (modal: PlayerStore['activeModal']) => void;
  setActiveDrawer: (drawer: PlayerStore['activeDrawer']) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => Promise<void>;
  toggleMiniPlayer: () => Promise<void>;

  // Playback commands
  openMedia: (paths: string[]) => Promise<void>;
  openFolder: (path: string) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  stop: () => Promise<void>;
  stopMedia: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  seekRelative: (seconds: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  setAudioTrack: (id: number | null) => Promise<void>;
  setSubtitleTrack: (id: number | null) => Promise<void>;
  loadExternalSubtitle: (path: string) => Promise<void>;
  takeScreenshot: (path: string) => Promise<void>;
  frameStep: (forward: boolean) => Promise<void>;

  // Extended controls
  setAudioDelay: (sec: number) => Promise<void>;
  setSubtitleDelay: (sec: number) => Promise<void>;
  setVideoAdjustments: (adj: Partial<VideoAdjustments>) => Promise<void>;
  setEqualizer: (eq: Partial<EqualizerState>) => Promise<void>;

  // Playlist commands
  fetchPlaylist: () => Promise<void>;
  addToPlaylist: (paths: string[]) => Promise<void>;
  playPlaylistItem: (index: number) => Promise<void>;
  removePlaylistItem: (index: number) => Promise<void>;
  reorderPlaylistItem: (from: number, to: number) => Promise<void>;
  clearPlaylist: () => Promise<void>;
  setShuffle: (shuffle: boolean) => Promise<void>;
  setRepeat: (mode: RepeatMode) => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;

  // Library & History
  fetchHistory: () => Promise<void>;
  fetchLibrary: () => Promise<void>;
  scanFolder: (path: string) => Promise<void>;

  // Settings
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  status: {
    state: 'idle',
    path: null,
    title: null,
    position: 0,
    duration: 0,
    volume: 100,
    muted: false,
    speed: 1.0,
    current_audio_track: null,
    current_sub_track: null,
    video_width: null,
    video_height: null,
    hwdec_active: false,
    cache_seconds: 0,
    seeking: false,
    error_message: null,
  },
  tracks: [],
  chapters: [],
  playlist: {
    items: [],
    current_index: null,
    shuffle: false,
    repeat_mode: 'off',
  },
  history: [],
  library: [],
  equalizer: {
    enabled: false,
    preset: 'Flat',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  videoAdjustments: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    gamma: 0,
    rotation: 0,
    flip_h: false,
    flip_v: false,
    aspect_ratio: 'auto',
    zoom: 1.0,
    pan_x: 0,
    pan_y: 0,
    deinterlace: false,
  },
  settings: null,
  diagnostics: null,

  activeModal: null,
  activeDrawer: null,
  controlsVisible: true,
  isFullscreen: false,
  isMiniPlayer: false,

  setControlsVisible: (visible) => set({ controlsVisible: visible }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),
  setIsFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

  toggleFullscreen: async () => {
    try {
      const next = await invoke<boolean>('toggle_fullscreen');
      set({ isFullscreen: next });
    } catch (e) {
      console.warn('Native fullscreen toggle failed, falling back to window API', e);
      try {
        const win = getCurrentWebviewWindow();
        const current = await win.isFullscreen();
        const next = !current;
        await win.setFullscreen(next);
        set({ isFullscreen: next });
      } catch (err) {
        console.error('All fullscreen toggles failed', err);
      }
    }
  },

  toggleMiniPlayer: async () => {
    try {
      const isMini = await invoke<boolean>('toggle_mini_player');
      set({ isMiniPlayer: isMini });
    } catch (e) {
      console.warn('Native mini-player toggle failed, falling back to window API', e);
      try {
        const win = getCurrentWebviewWindow();
        const isMini = get().isMiniPlayer;
        if (!isMini) {
          await win.setAlwaysOnTop(true);
          await win.setSize(new LogicalSize(480, 270));
          set({ isMiniPlayer: true });
        } else {
          await win.setAlwaysOnTop(false);
          await win.setSize(new LogicalSize(1280, 720));
          set({ isMiniPlayer: false });
        }
      } catch (err) {
        console.error('All mini-player toggles failed', err);
      }
    }
  },

  init: async () => {
    // Helper to update body and html classes for native video transparency
    const updateBodyClass = (status: PlaybackStatus) => {
      const hasMedia =
        status.state === 'playing' ||
        status.state === 'paused' ||
        status.state === 'loading' ||
        status.duration > 0 ||
        !!status.path;
      if (hasMedia) {
        document.documentElement.classList.add('media-loaded');
        document.body.classList.add('media-loaded');
      } else {
        document.documentElement.classList.remove('media-loaded');
        document.body.classList.remove('media-loaded');
      }
    };

    // 1. Listen to typed events from Rust
    await listen<PlaybackStatus>('playback:state-changed', (event) => {
      set({ status: event.payload });
      updateBodyClass(event.payload);
    });

    await listen<number>('playback:position-changed', (event) => {
      set((state) => ({
        status: { ...state.status, position: event.payload },
      }));
    });

    await listen<number>('playback:duration-changed', (event) => {
      set((state) => ({
        status: { ...state.status, duration: event.payload },
      }));
    });

    await listen<MediaTrack[]>('playback:tracks-changed', (event) => {
      set({ tracks: event.payload });
    });

    await listen<Chapter[]>('playback:chapters-changed', (event) => {
      set({ chapters: event.payload });
    });

    await listen<number>('playback:buffering-changed', (event) => {
      set((state) => ({
        status: { ...state.status, cache_seconds: event.payload },
      }));
    });

    await listen<string>('playback:error', (event) => {
      set((state) => ({
        status: { ...state.status, state: 'error', error_message: event.payload },
      }));
    });

    await listen('playback:ended', () => {
      const { status, playlist } = get();
      if (status.state === 'playing' && playlist.items.length > 0) {
        get().nextTrack();
      }
    });

    await listen('playback:file-loaded', () => {
      get().fetchPlaylist();
      get().fetchHistory();
    });

    // 2. Fetch initial state
    try {
      const initialStatus = await invoke<PlaybackStatus>('get_playback_state');
      set({ status: initialStatus });
      updateBodyClass(initialStatus);
    } catch (e) {
      console.warn('Could not fetch initial playback state', e);
    }

    get().fetchPlaylist();
    get().fetchHistory();
    get().fetchLibrary();
    get().fetchSettings();
    get().fetchDiagnostics();
  },

  fetchDiagnostics: async () => {
    try {
      const diag = await invoke<import('../types').MpvDiagnostics>('get_diagnostics');
      set({ diagnostics: diag });
    } catch (e) {
      console.warn('Failed to fetch mpv diagnostics', e);
    }
  },

  openMedia: async (paths) => {
    document.documentElement.classList.add('media-loaded');
    document.body.classList.add('media-loaded');
    set((s) => ({
      status: { ...s.status, state: 'loading', path: paths[0] || null },
    }));
    try {
      const pl = await invoke<Playlist>('open_media', { paths });
      set({ playlist: pl });
    } catch (e) {
      console.error('Failed to open media', e);
    }
  },

  openFolder: async (path) => {
    document.documentElement.classList.add('media-loaded');
    document.body.classList.add('media-loaded');
    try {
      const pl = await invoke<Playlist>('open_folder', { path });
      set({ playlist: pl });
    } catch (e) {
      console.error('Failed to open folder', e);
    }
  },

  openUrl: async (url) => {
    document.documentElement.classList.add('media-loaded');
    document.body.classList.add('media-loaded');
    await invoke('open_url', { url });
    await get().fetchPlaylist();
  },

  play: async () => {
    set((s) => ({ status: { ...s.status, state: 'playing' } }));
    await invoke('play');
  },

  pause: async () => {
    set((s) => ({ status: { ...s.status, state: 'paused' } }));
    await invoke('pause');
  },

  togglePlay: async () => {
    set((s) => ({
      status: {
        ...s.status,
        state: s.status.state === 'playing' ? 'paused' : 'playing',
      },
    }));
    await invoke('toggle_play');
  },

  stop: async () => {
    document.documentElement.classList.remove('media-loaded');
    document.body.classList.remove('media-loaded');
    set((s) => ({
      status: {
        ...s.status,
        state: 'stopped',
        position: 0,
      },
    }));
    await invoke('stop');
  },

  stopMedia: async () => {
    document.documentElement.classList.remove('media-loaded');
    document.body.classList.remove('media-loaded');
    try {
      await invoke('stop');
      await invoke('clear_playlist');
    } catch (e) {
      console.warn('Failed to stop media', e);
    }
    set((s) => ({
      status: {
        ...s.status,
        state: 'idle',
        path: null,
        title: null,
        position: 0,
        duration: 0,
      },
      playlist: {
        ...s.playlist,
        items: [],
        current_index: null,
      },
    }));
  },

  seek: async (seconds) => {
    set((s) => ({ status: { ...s.status, position: seconds } }));
    await invoke('seek', { positionSeconds: seconds });
  },

  seekRelative: async (seconds) => {
    set((s) => ({
      status: {
        ...s.status,
        position: Math.max(0, Math.min(s.status.duration || 0, s.status.position + seconds)),
      },
    }));
    await invoke('seek_relative', { seconds });
  },

  setVolume: async (volume) => {
    set((s) => ({
      status: {
        ...s.status,
        volume,
        muted: volume > 0 ? false : s.status.muted,
      },
    }));
    await invoke('set_volume', { volume });
  },

  setMuted: async (muted) => {
    set((s) => ({
      status: { ...s.status, muted },
    }));
    await invoke('set_muted', { muted });
  },

  setSpeed: async (speed) => {
    set((s) => ({
      status: { ...s.status, speed },
    }));
    await invoke('set_speed', { speed });
  },

  setAudioTrack: async (trackId) => {
    await invoke('set_audio_track', { trackId });
  },

  setSubtitleTrack: async (trackId) => {
    await invoke('set_subtitle_track', { trackId });
  },

  loadExternalSubtitle: async (path) => {
    await invoke('load_external_subtitle', { path });
    const tracks = await invoke<MediaTrack[]>('get_tracks');
    set({ tracks });
  },

  takeScreenshot: async (path) => {
    await invoke('take_screenshot', { path });
  },

  frameStep: async (forward) => {
    await invoke('frame_step', { forward });
  },

  setAudioDelay: async (seconds) => {
    await invoke('set_audio_delay', { seconds });
  },

  setSubtitleDelay: async (seconds) => {
    await invoke('set_subtitle_delay', { seconds });
  },

  setVideoAdjustments: async (partial) => {
    const updated = { ...get().videoAdjustments, ...partial };
    set({ videoAdjustments: updated });
    await invoke('set_video_adjustments', { adjustments: updated });
  },

  setEqualizer: async (partial) => {
    const updated = { ...get().equalizer, ...partial };
    set({ equalizer: updated });
    await invoke('set_equalizer', { equalizer: updated });
  },

  fetchPlaylist: async () => {
    try {
      const pl = await invoke<Playlist>('get_playlist');
      set({ playlist: pl });
    } catch (e) {
      console.warn('Failed to fetch playlist', e);
    }
  },

  addToPlaylist: async (paths) => {
    const pl = await invoke<Playlist>('add_to_playlist', { paths });
    set({ playlist: pl });
  },

  reorderPlaylistItem: async (from, to) => {
    const pl = await invoke<Playlist>('reorder_playlist_item', { from, to });
    set({ playlist: pl });
  },

  playPlaylistItem: async (index) => {
    await invoke('play_playlist_index', { index });
    await get().fetchPlaylist();
  },

  removePlaylistItem: async (index) => {
    const pl = await invoke<Playlist>('remove_playlist_item', { index });
    set({ playlist: pl });
    if (pl.items.length === 0) {
      get().stopMedia();
    }
  },

  clearPlaylist: async () => {
    const pl = await invoke<Playlist>('clear_playlist');
    set({
      playlist: pl,
      status: {
        ...get().status,
        state: 'stopped',
        path: null,
        title: null,
        position: 0,
        duration: 0,
      },
    });
  },

  setShuffle: async (shuffle) => {
    await invoke('set_shuffle', { shuffle });
    set((state) => ({ playlist: { ...state.playlist, shuffle } }));
  },

  setRepeat: async (repeatMode) => {
    await invoke('set_repeat', { mode: repeatMode });
    set((state) => ({ playlist: { ...state.playlist, repeat_mode: repeatMode } }));
  },

  nextTrack: async () => {
    await invoke('next_track');
    await get().fetchPlaylist();
  },

  prevTrack: async () => {
    await invoke('prev_track');
    await get().fetchPlaylist();
  },

  fetchHistory: async () => {
    try {
      const history = await invoke<HistoryItem[]>('get_recent_history', { limit: 50 });
      set({ history });
    } catch (e) {
      console.warn('Failed to fetch history', e);
    }
  },

  fetchLibrary: async () => {
    try {
      const library = await invoke<LibraryItem[]>('get_library_items');
      set({ library });
    } catch (e) {
      console.warn('Failed to fetch library', e);
    }
  },

  scanFolder: async (path) => {
    const library = await invoke<LibraryItem[]>('scan_library_folder', { path });
    set({ library });
  },

  fetchSettings: async () => {
    try {
      const settings = await invoke<AppSettings>('get_settings');
      set({ settings });
    } catch (e) {
      console.warn('Failed to fetch settings', e);
    }
  },

  saveSettings: async (settings) => {
    await invoke('save_settings', { newSettings: settings });
    set({ settings });
  },
}));
