/* ============ Sound Engine (Web Audio API, zero assets) ============ */
const Sound = (() => {
  let actx = null;
  let muted = localStorage.getItem("snake_muted") === "1";

  function ensure() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
  }

  /* basic oscillator blip with optional pitch slide */
  function tone({ freq = 440, endFreq, dur = 0.12, type = "square", vol = 0.12, delay = 0 }) {
    if (muted) return;
    ensure();
    const t0 = actx.currentTime + delay;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(actx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* filtered white-noise burst (crash texture) */
  function noise({ dur = 0.3, vol = 0.18, delay = 0 }) {
    if (muted) return;
    ensure();
    const t0 = actx.currentTime + delay;
    const len = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const filter = actx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, t0);
    const gain = actx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    src.connect(filter).connect(gain).connect(actx.destination);
    src.start(t0);
  }

  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      localStorage.setItem("snake_muted", muted ? "1" : "0");
      if (!muted) this.blip();
      return muted;
    },
    unlock: ensure,

    eat(streak = 0) {
      // rising blip — pitch climbs slightly with every food eaten
      const base = 520 * Math.pow(1.03, Math.min(streak, 24));
      tone({ freq: base, endFreq: base * 1.5, dur: 0.09, type: "square", vol: 0.12 });
    },

    turn() {
      tone({ freq: 170, dur: 0.03, type: "square", vol: 0.035 });
    },

    die() {
      tone({ freq: 300, endFreq: 50, dur: 0.6, type: "sawtooth", vol: 0.16 });
      noise({ dur: 0.35, vol: 0.15, delay: 0.05 });
    },

    start() {
      [392, 523, 659].forEach((f, i) =>
        tone({ freq: f, dur: 0.09, type: "square", vol: 0.09, delay: i * 0.08 })
      );
    },

    pause(on) {
      tone({
        freq: on ? 320 : 480,
        endFreq: on ? 230 : 640,
        dur: 0.12,
        type: "triangle",
        vol: 0.09,
      });
    },

    highscore() {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, dur: 0.14, type: "square", vol: 0.11, delay: i * 0.1 })
      );
    },

    blip() {
      tone({ freq: 660, dur: 0.06, type: "sine", vol: 0.07 });
    },
  };
})();
