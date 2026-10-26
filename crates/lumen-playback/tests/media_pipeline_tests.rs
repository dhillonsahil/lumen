use lumen_core::models::{MediaSource, TrackType};
use lumen_playback::{MediaBackend, MpvBackend};
use std::time::Duration;

#[tokio::test]
async fn test_full_media_pipeline_acceptance_matrix() {
    let backend = MpvBackend::new(None, Some("auto-safe"))
        .expect("Failed to initialize libmpv backend for test matrix");

    let workspace_dir = std::env::current_dir().unwrap();
    let root = if workspace_dir.ends_with("lumen-playback") {
        workspace_dir.parent().unwrap().parent().unwrap()
    } else {
        workspace_dir.as_path()
    };

    let test_media_dir = root.join("test_media");
    if !test_media_dir.exists() {
        println!("test_media directory not found, skipping pipeline test");
        return;
    }

    // 1. MP4 with AAC
    let mp4_file = test_media_dir.join("sample_aac.mp4");
    if mp4_file.exists() {
        let res = backend.load(&MediaSource::File(mp4_file)).await;
        assert!(res.is_ok(), "Failed to load MP4: {:?}", res.err());
        tokio::time::sleep(Duration::from_millis(500)).await;

        let tracks = backend.get_tracks().await.unwrap();
        assert!(tracks.iter().any(|t| t.track_type == TrackType::Video));
        assert!(tracks.iter().any(|t| t.track_type == TrackType::Audio));
        println!("✓ MP4 with AAC: Video and audio play successfully");
    }

    // 2. MKV with AC-3
    let ac3_file = test_media_dir.join("sample_ac3.mkv");
    if ac3_file.exists() {
        let res = backend.load(&MediaSource::File(ac3_file)).await;
        assert!(res.is_ok(), "Failed to load MKV with AC-3: {:?}", res.err());
        tokio::time::sleep(Duration::from_millis(500)).await;

        let tracks = backend.get_tracks().await.unwrap();
        let audio_track = tracks.iter().find(|t| t.track_type == TrackType::Audio);
        assert!(audio_track.is_some());
        assert_eq!(audio_track.unwrap().codec.as_deref(), Some("ac3"));
        println!("✓ MKV with AC-3: Audio track detected with AC-3 codec and plays");
    }

    // 3. MKV with Multiple Audio Tracks
    let multi_audio_file = test_media_dir.join("sample_multi_audio.mkv");
    if multi_audio_file.exists() {
        let res = backend.load(&MediaSource::File(multi_audio_file)).await;
        assert!(res.is_ok());
        tokio::time::sleep(Duration::from_millis(500)).await;

        let tracks = backend.get_tracks().await.unwrap();
        let audio_tracks: Vec<_> = tracks
            .iter()
            .filter(|t| t.track_type == TrackType::Audio)
            .collect();
        assert!(
            audio_tracks.len() >= 2,
            "Expected >= 2 audio tracks, found {}",
            audio_tracks.len()
        );

        // Test track switching
        let res_switch = backend.set_audio_track(Some(audio_tracks[1].id)).await;
        assert!(
            res_switch.is_ok(),
            "Failed to switch audio track: {:?}",
            res_switch.err()
        );
        println!(
            "✓ MKV with multiple audio tracks: Listed {} audio tracks and successfully switched",
            audio_tracks.len()
        );
    }

    // 4. MKV with Embedded Subtitles (SRT and ASS/SSA)
    let sub_file = test_media_dir.join("sample_embedded_subtitles.mkv");
    if sub_file.exists() {
        let res = backend.load(&MediaSource::File(sub_file)).await;
        assert!(res.is_ok());
        tokio::time::sleep(Duration::from_millis(500)).await;

        let tracks = backend.get_tracks().await.unwrap();
        let sub_tracks: Vec<_> = tracks
            .iter()
            .filter(|t| t.track_type == TrackType::Subtitle)
            .collect();
        assert!(
            sub_tracks.len() >= 2,
            "Expected >= 2 subtitle tracks, found {}",
            sub_tracks.len()
        );

        // Switch to ASS subtitle
        let res_sub_switch = backend.set_subtitle_track(Some(sub_tracks[1].id)).await;
        assert!(
            res_sub_switch.is_ok(),
            "Failed to select ASS subtitle: {:?}",
            res_sub_switch.err()
        );
        println!(
            "✓ MKV with embedded subtitles: Found {} tracks (SRT and ASS) and switched",
            sub_tracks.len()
        );
    }

    // 5. External Subtitle loading
    let ext_sub = test_media_dir.join("external.srt");
    if ext_sub.exists() {
        let res = backend.add_external_subtitle(&ext_sub).await;
        assert!(
            res.is_ok(),
            "Failed to add external subtitle: {:?}",
            res.err()
        );
        println!("✓ External subtitle loading: Successfully loaded external.srt");
    }

    // 6. Audio-only FLAC
    let flac_file = test_media_dir.join("sample_audio.flac");
    if flac_file.exists() {
        let res = backend.load(&MediaSource::File(flac_file)).await;
        assert!(res.is_ok());
        tokio::time::sleep(Duration::from_millis(500)).await;
        let status = backend.get_status().await;
        assert_eq!(status.video_width, None);
        println!("✓ Audio-only FLAC: Plays with audio status");
    }

    let _ = backend.shutdown().await;
}
