// Sons curtos de enviar/receber gerados via Web Audio API (sem depender de
// arquivos de áudio externos). Respeita o toggle "soundsEnabled" do painel admin.

let audioCtx = null;
let soundsEnabled = true;

function setSoundsEnabled(value) {
  soundsEnabled = value !== false;
}

function ensureAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freqStart, freqEnd, duration, volume) {
  if (!soundsEnabled) return;
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ambiente sem suporte a Web Audio — ignora silenciosamente
  }
}

function playSendSound() {
  playTone(600, 900, 0.12, 0.15);
}

function playReceiveSound() {
  playTone(500, 350, 0.15, 0.15);
}
