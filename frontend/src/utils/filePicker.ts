import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';

export async function pickMediaFiles(): Promise<string[]> {
  // Strategy 1: Native Rust backend command
  try {
    const paths = await invoke<string[]>('open_file_dialog');
    if (paths && paths.length > 0) {
      return paths;
    }
  } catch (err) {
    console.warn('Backend open_file_dialog error, falling back to plugin-dialog:', err);
  }

  // Strategy 2: Plugin dialog
  try {
    const selected = await openDialog({
      multiple: true,
      filters: [
        {
          name: 'Media Files',
          extensions: [
            'mp4',
            'mkv',
            'webm',
            'avi',
            'mov',
            'ts',
            'flv',
            'mp3',
            'flac',
            'aac',
            'wav',
            'ogg',
            'opus',
            'm4a',
          ],
        },
      ],
    });

    if (selected) {
      return Array.isArray(selected) ? selected : [selected];
    }
  } catch (err) {
    console.error('plugin-dialog open error:', err);
  }

  return [];
}

export async function pickFolder(): Promise<string | null> {
  // Strategy 1: Native Rust backend command
  try {
    const folder = await invoke<string | null>('open_folder_dialog');
    if (folder) {
      return folder;
    }
  } catch (err) {
    console.warn('Backend open_folder_dialog error, falling back to plugin-dialog:', err);
  }

  // Strategy 2: Plugin dialog
  try {
    const selected = await openDialog({
      directory: true,
    });

    if (selected && typeof selected === 'string') {
      return selected;
    }
  } catch (err) {
    console.error('plugin-dialog directory open error:', err);
  }

  return null;
}

export async function pickSubtitleFile(): Promise<string | null> {
  // Strategy 1: Native Rust backend command
  try {
    const sub = await invoke<string | null>('open_subtitle_dialog');
    if (sub) {
      return sub;
    }
  } catch (err) {
    console.warn('Backend open_subtitle_dialog error, falling back to plugin-dialog:', err);
  }

  // Strategy 2: Plugin dialog
  try {
    const selected = await openDialog({
      multiple: false,
      filters: [
        {
          name: 'Subtitle Files',
          extensions: ['srt', 'ass', 'ssa', 'vtt', 'sub'],
        },
      ],
    });

    if (selected && typeof selected === 'string') {
      return selected;
    }
  } catch (err) {
    console.error('plugin-dialog subtitle open error:', err);
  }

  return null;
}

export async function pickPlaylistFile(): Promise<string | null> {
  try {
    const selected = await openDialog({
      multiple: false,
      filters: [
        {
          name: 'Playlist Files',
          extensions: ['m3u', 'm3u8', 'pls'],
        },
      ],
    });

    if (selected && typeof selected === 'string') {
      return selected;
    }
  } catch (err) {
    console.error('plugin-dialog playlist open error:', err);
  }

  return null;
}

export async function savePlaylistFileDialog(): Promise<string | null> {
  try {
    const selected = await saveDialog({
      filters: [
        {
          name: 'M3U Playlist',
          extensions: ['m3u8', 'm3u'],
        },
      ],
      defaultPath: 'playlist.m3u8',
    });

    return selected || null;
  } catch (err) {
    console.error('plugin-dialog playlist save error:', err);
    return null;
  }
}
