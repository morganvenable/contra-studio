# Music sources and tempo matching

Status: planned 23 October 2026; not started. Branch: feature/music-sources. Builds on the rebuild's `MusicStructure`
(meter and phrase layout) in docs/rebuild-plan.md.

## The model

Three separate layers, so every music source works the same way:

```
Clock source  ->  seconds into the recording
Tempo map     ->  dance beat
Dance         ->  poses, hands, figure labels
```

- **Clock source** says where the music is right now: the built-in synth,
  a local file, a YouTube player, or a microphone listening to the room.
- **Tempo map** turns recording time into dance beats. It is a list of anchors
  `(seconds, beat)` with a smooth curve between them. Today's `RecordingGrid
  { bpm, offsetSeconds }` is the one-anchor, constant-tempo case.
- **The dance** only ever sees beats. The animation follows the music; we
  don't bend the music to the animation.

The phrase layout (AABB, AAB, ABC, odd bar counts) and meter (2/4, 4/4, 6/8,
3/4, 9/8) come from the dance's `MusicStructure`. The tempo map anchors the
first A1 and, ideally, every phrase start, so a slow intro or a tune change
in a medley doesn't throw the dance off.

## Sources

### Local files (full support)

We can decode the audio, so everything works:

- Automatic tempo map (below).
- Speed change with pitch kept. Today `audio.ts` uses
  `AudioBufferSourceNode.playbackRate`, which changes pitch. Switch to an
  `<audio>` element with `preservesPitch` (on by default in Chrome) routed
  through `MediaElementAudioSourceNode`. A teacher can slow a 120 bpm tune
  to 100 without it sounding like a different key.
- Click track mixed in on the beat, following the meter (accent on bar 1,
  in threes for a waltz).

### YouTube and YouTube Music (supported, with limits)

- Use the official IFrame Player API. A YouTube Music link
  (`music.youtube.com/watch?v=ID`) has the same video ID, so the same player
  plays it.
- **Terms:** the player must stay visible (at least 200 × 200 px) and
  unobstructed. No hidden or background player. We may not separate, isolate
  or modify its audio. So no audio analysis of the stream, and no
  pitch-preserved stretching of our own: we use YouTube's own speed setting.
- **Speed:** `setPlaybackRate` accepts only the rates from
  `getAvailablePlaybackRates()`. These are often 0.25 steps, and the player
  may refuse. So slowing a tune is coarse (1.0, 0.75 ...). The fine tempo
  match happens on our side: the tempo map makes the dance follow the
  recording's real tempo exactly.
- **Some videos won't embed:** owners can block embedding (errors 101/150).
  Show "This video can't be played here" with an "Open on YouTube" link.
- **Tempo map:** from tapping (below), or from the microphone. It's saved
  per video ID so the next person who picks that video gets it ready-made.
- **Clock:** poll `getCurrentTime()` every animation frame and smooth it with
  a small phase-locked loop: predict from the last reading, the elapsed time
  and the rate, and correct gently. Snap on seek, pause and buffering
  (`onStateChange`). A per-device "nudge" (±200 ms, saved) covers Bluetooth
  speaker delay.
- **Click track:** it's our own sound next to the player, not a change to
  YouTube's audio. Offer it off by default. This is a judgment call; see the
  open questions.

### Spotify (not as an in-app player)

- The Developer Policy forbids exactly this use: "Do not synchronize any
  sound recordings with any visual media … video, or similar content", and no
  mixing or overlapping Spotify content "with any other audio content" (so no
  click track either).
- It's also technically weak:
  - The Web Playback SDK needs Premium.
  - It has no speed control, and its state gives a position with no timestamp.
  - Audio Features and Audio Analysis (which had beats and bars) were closed
    to new apps on 27 November 2024.
- **What we can do:** "Play it anywhere" mode. The user plays Spotify (or a
  CD, or a live band) on their own speaker, and the app listens through the
  microphone and follows. The app never touches Spotify, so the policy
  doesn't apply. We can also link out to a Spotify track or playlist that
  matches the dance's tempo and tune type.

### Microphone: "Play it anywhere"

- `getUserMedia` audio. Run the same beat tracker as for local files, live,
  in an AudioWorklet plus a worker.
- Works with Spotify, YouTube on another device, a phone and **a live band at
  a dance**, which is the most valuable case: callers and dancers can watch
  the figure in time with the band.
- Live tracking needs a few seconds to lock on. Until then, show a "listening"
  state and let a tap set the phase instantly.

### System and tab audio capture (preferred over the microphone)

Analyze the sound the computer is already playing, instead of using a
service's API. Audio stays in memory and is never stored or sent; only beat
and phrase times are kept.

- **Browser, no install:** `getDisplayMedia` with audio.
  - **Tab audio:** the user picks a tab and ticks "Also share tab audio":
    the Spotify web player, or our own tab with the YouTube player
    (`preferCurrentTab`).
  - **Entire screen on Windows and ChromeOS:** offers "Share system audio",
    which also catches the Spotify desktop app. On macOS, only tab audio is
    reliable.
  - Chrome requires a video track; stop it immediately. The share prompt
    appears each session, with Chrome's sharing bar.
- **Desktop helper (optional, later):** WASAPI loopback on Windows,
  ScreenCaptureKit on macOS. No prompts. It sends only beat times to the
  page, like Keybard Overlay does for keys.
- **YouTube in our page:** capture our own tab while the video plays and pair
  each detected beat with the player's `getCurrentTime()`. That builds the
  tempo map automatically, saved per video. Tapping becomes the fallback.
- **Spotify and other apps:** live following with a clean signal. Phrase
  detection or one "Tap A1" sets round 1, since the track position is
  unknown.
- **Our own sounds:** silence the click and synth while capturing, or remove
  them from the onset curve, since we know when we played them.
- **Terms:**
  - Spotify's synchronization ban is in its Developer Policy, which doesn't
    apply when we don't use its APIs.
  - YouTube's "separate, isolate, or modify the audio" clause is about its
    stream. Measuring timing from the speaker output, with no audio kept, is
    a reasonable reading, not an explicit permission.
  - Get a quick legal check before a public launch.

## Tempo matching

### Automatic (local files and microphone)

Our own code, no new dependencies. Essentia.js and aubio are AGPL/GPL, so
they're out.

1. **Onset strength:** short-time FFT, spectral flux on a log-magnitude
   spectrum, at about 100 frames a second.
2. **Tempo:** autocorrelation of the onset curve, weighted toward the
   dance's tempo range from its type: contra reels about 108–126 bpm, jigs in
   6/8 felt in two, ECD from about 80 to 130, waltzes in three.
3. **Beats:** dynamic-programming beat tracking (Ellis 2007). It finds the
   beat sequence that best matches onsets while staying close to the tempo,
   and it tolerates gradual tempo drift. That gives beat times, which become
   tempo-map anchors.
4. **Bars and phrases:** fold beats into bars by meter, choosing the bar
   phase where accents are strongest. Find 8-bar phrase starts with a
   self-similarity novelty curve (the A and B tunes sound different). That
   gives A1/A2/B1/B2 anchors and the "times through" count.
5. **Intro and ending:** the first phrase start after the intro is beat 1 of
   round 1. Rounds stop when the music ends; the last round finishes its
   figure.
6. **Confidence:** show the detected beats as ticks on the timeline and
   phrase labels on the waveform. Any anchor can be dragged, and "Tap to fix"
   re-taps a section.

### Tapping (any source, including YouTube)

- "Tap the beat": the space bar, for 8–16 beats, gives tempo and phase. This
  is a robust median of the tap intervals with a least-squares phase fit.
- "Tap A1": one tap on the first beat of the first phrase.
- Keep tapping for a full tempo map; each tap becomes an anchor (smoothed).
  This handles live recordings that speed up.
- Prefill everything we can: tempo from the dance type, phrase layout from
  the dance. Usually it's two actions: tap along, then tap A1.

### When the dance and the music disagree

- **Phrase length mismatch:** for example, an AABB 64-beat dance to a tune
  with a 3-part ABC structure. Show it plainly ("This tune is 48 bars; the
  dance is 32") and let the user pick where rounds start. Never stretch
  figures to fit.
- **Teaching speed:** slow the recording (pitch kept on local files, YouTube
  rates on YouTube). The tempo map scales with it, and the dance follows.

## Data

```ts
interface TempoMap {
  sourceKey: string; // "yt:VIDEO_ID", "file:SHA-256", "mic"
  anchors: { seconds: number; beat: number }[];
  meter: Meter; // from MusicStructure
  phrases?: { beat: number; label: string }[]; // "A1", "B2", ...
  method: "auto" | "tap" | "edited";
}
```

Maps for YouTube videos and file hashes can be shared, so a tune is matched
once for everyone. They're small JSON files and contain no audio.

## Decisions (23 October 2026)

- **Click track: off by default** for every source.
- **Shared tempo maps from the start.** GitHub Pages is static, so this needs
  a small backend: a Cloudflare Worker with D1, keyed by `sourceKey`. The
  stored data is anchors and phrase labels only, never audio. Edits are
  versioned so a bad map can be rolled back.
- **Separate branch:** all of this lives on `feature/music-sources`, branched
  from the figure-library work. It merges only after thorough testing on real
  recordings across reels, jigs and waltzes, with flow tests passing.
- **Prove it's worth it first.** The alternative is a curated set of specific
  audio files with ready-made tempo maps (recordings we have rights to). The
  branch is judged against that.

## Order of work

**Phase A: useful either way.**

1. `TempoMap` in the new core, replacing `RecordingGrid`. Constant tempo
   stays a one-anchor map. Switch local playback to `preservesPitch`.
2. Shared tempo-map store (Worker + D1), and the tap-to-match UI on local
   files: tap beat, tap A1, show beat ticks.
3. A small curated library of audio files with prepared maps, so each Ready
   dance can play to real music with no setup.

**Gate:** try Phase A on real dances. Continue only if streaming sources
still look worth their cost.

**Phase B: streaming sources.**

4. YouTube player: paste a YouTube or YouTube Music link, visible player
   beside the stage, PLL clock, tapping, shared map per video.
5. Automatic beat and phrase tracking (worker), tested on a corpus of contra,
   jig and waltz recordings we have rights to use.
6. Tab and system audio capture: automatic maps for YouTube, live following
   for Spotify and other apps. Microphone mode for live bands.
7. Spotify link-outs.

Each step ships with a Playwright flow test: load the source, match, play, and
check that the dance beat follows the clock.
