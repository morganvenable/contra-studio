# Rehearsal music and recording alignment

The default is **Studio Practice Reel**, an original synthesized melody with bass and chord accompaniment. It has AABB form, four 16-dance-beat phrases, at 112 dance beats/minute. No external recording or traditional tune is bundled. It is a practice-band sound, not a recording of a live contra band.

## One clock

`BeatTransport` is the authoritative beat timeline. On the first audio-enabled user gesture, it migrates from the monotonic browser clock to `AudioContext.currentTime` without changing beat phase. Animation frames sample that timeline; they do not increment a separate accumulated timer. Music and optional metronome buffer sources derive their offsets and rates from the same beat snapshot.

Pause, seek, tempo, speed, figure loops, changing dance, and changing set size rebase or stop that clock and reschedule the sources. Old sources fade briefly and disconnect on completion. Cancelling a pending browser audio resume cannot start playback later. Changing source or manual alignment preserves the current dance beat, except selecting a new local file starts paused at beat 0.

The reel repeats every 64 beats while the dance's persistent identities continue progressing. A selected figure loop uses the same musical beat range. A local recording plays continuously across dance repeats and stops at its real end. A loop extending beyond that recording is rejected.

## Local recordings

Use Music → Choose audio file. The file is decoded in browser memory, not uploaded or included in dance exports/storage. Limits: 32 MB compressed file, 6 minutes duration, and 64 MB decoded PCM per recording. The default audio context requests 22,050 Hz. Container channel headers and browser duration metadata are checked before decoding; unknown layouts reject. Actual decoded channels, duration, and PCM bytes are checked again before replacing the previous recording. Decodes are serialized, and superseded pending requests are skipped, so rapid file replacement cannot start multiple simultaneous PCM decodes. A failed replacement preserves the previous recording. The preflight bounds normal resource use, but is not a security boundary for hostile or misleading files. A browser choosing a higher sample rate can require a shorter excerpt. Browser codec support determines which formats can be opened. A refresh requires choosing the file again.

Set native tempo in **dance beats** per minute and the first A1 downbeat offset in seconds. The independent alignment preview can audition the file; starting it pauses the dance. Pause on the desired downbeat and choose “Use preview position as first downbeat.” This applies the offset and seeks the dance to beat 0. Applying a manual grid sets the dance tempo to the native tempo.

Recording time = first downbeat offset + global dance beat × 60 / native tempo.

There is no automatic beat/downbeat detection, variable-tempo map, pitch-preserving time stretch, or automatic drift correction. Current tempo and speed changes use `playbackRate` and therefore also change pitch. A steady-tempo recording can stay aligned to this constant grid; a drifting recording requires further manual adjustment. The preview player is explicitly separate from synchronized dance playback.

## Validation evidence

- Unit tests use a controlled beat clock and fake WebAudio nodes to inspect source offsets, rates, loops, end times, pending resume cancellation, local decode and node cleanup.
- DSP tests verify exact AABB note structure, melody subdivisions and accompaniment, finite samples, peak ceiling and loop edge fades.
- Synthetic DOM/controller tests exercise the actual UI and main clock with deterministic WebAudio doubles.
- The generated WAV preview is about 34.286 seconds. The user has heard and welcomed its prototype practice-band sound.
- No automated real-browser audio/WebGL render has been claimed. Browser authentication and process restrictions blocked that route. Device output latency and actual browser autoplay/codec behavior still need testing on an accessible browser/device.

## Musical count convention and output presentation

Timeline beat 0 is audible count 1. Integer beats are alternating footfall/weight-transfer instants; the gait never adds distance-based half-beat steps. A four-count balance occupies 4 × 60 / effective BPM seconds (2.143 seconds at 112 BPM). Its inward landings are at local beats 0 and 1, outward landings at 2 and 3. After the fourth landing, the pair closes and establishes the swing frame during the remaining count, ready at local beat 4. Reviewed circle-to-swing transitions likewise prepare the pair before the swing begins. Swing gathering no longer consumes a duration-dependent fraction of the swing.

Audio scheduling still uses `AudioContext.currentTime`, but visual presentation prefers `getOutputTimestamp()` mapped to the current performance time. The timestamp describes sound reaching the output device, avoiding the render clock's lead over audible sound. Where unavailable, reported base/output latency provide an estimate; without either, the render clock remains the fallback. A bounded history of tempo, seek, loop and stop changes lets the visual query the correct earlier musical segment. This is measured-clock compensation, not proof of end-to-end device synchronization: display refresh, Bluetooth/device reporting and actual audible alignment still require device testing.

Waiting end couples make an explicit eight-beat exchange, then stand ready: local beats 4–12 for improper sets, 6–14 for the default two-beat Becket shift. A brief preparation for their next balance may occur before re-entry. The exchange is no longer spread across most of a 64-beat round.
