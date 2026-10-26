import { useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { pickMediaFiles, pickFolder } from '../utils/filePicker';

export const useShortcuts = () => {
  const {
    status,
    togglePlay,
    seekRelative,
    setVolume,
    setMuted,
    nextTrack,
    prevTrack,
    takeScreenshot,
    activeDrawer,
    setActiveDrawer,
    activeModal,
    setActiveModal,
    isFullscreen,
    toggleFullscreen,
    toggleMiniPlayer,
    cycleAbLoop,
    cycleAspectRatio,
    openSettings,
    openMedia,
    openFolder,
  } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl) {
        if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          if (e.shiftKey) {
            // Open Folder (Ctrl+Shift+O)
            const folder = await pickFolder();
            if (folder) openFolder(folder);
          } else {
            // Open File (Ctrl+O)
            const paths = await pickMediaFiles();
            if (paths.length > 0) openMedia(paths);
          }
        } else if (e.key === 'u' || e.key === 'U') {
          e.preventDefault();
          setActiveModal('open_url');
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setActiveDrawer(activeDrawer === 'library' ? null : 'library');
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          toggleMiniPlayer();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          seekRelative(60);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          seekRelative(-60);
        }
        return;
      }

      // Single Key shortcuts
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;

        case 'arrowright':
          e.preventDefault();
          seekRelative(5);
          break;

        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekRelative(-5);
          break;

        case 'l':
          e.preventDefault();
          cycleAbLoop();
          break;

        case 'arrowup':
          e.preventDefault();
          setVolume(Math.min(200, status.volume + 5));
          break;

        case 'arrowdown':
          e.preventDefault();
          setVolume(Math.max(0, status.volume - 5));
          break;

        case 'm':
          e.preventDefault();
          setMuted(!status.muted);
          break;

        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'escape':
          if (isFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          } else if (activeModal) {
            setActiveModal(null);
          } else if (activeDrawer) {
            setActiveDrawer(null);
          }
          break;

        case 'a':
          e.preventDefault();
          cycleAspectRatio();
          break;

        case 't':
          e.preventDefault();
          setActiveModal(activeModal === 'tracks' ? null : 'tracks');
          break;

        case 's':
          e.preventDefault();
          takeScreenshot(`screenshot_${Date.now()}.png`);
          break;

        case 'i':
          e.preventDefault();
          openSettings('diagnostics');
          break;

        case 'n':
          e.preventDefault();
          nextTrack();
          break;

        case 'p':
          e.preventDefault();
          prevTrack();
          break;

        case 'q':
          e.preventDefault();
          setActiveDrawer(activeDrawer === 'playlist' ? null : 'playlist');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    status,
    togglePlay,
    seekRelative,
    setVolume,
    setMuted,
    nextTrack,
    prevTrack,
    takeScreenshot,
    activeDrawer,
    setActiveDrawer,
    activeModal,
    setActiveModal,
    isFullscreen,
    toggleFullscreen,
    toggleMiniPlayer,
    cycleAbLoop,
    cycleAspectRatio,
    openSettings,
    openMedia,
    openFolder,
  ]);
};
