// Carregamento dos modelos do face-api.js via CDN (sem precisar hospedar arquivos)
import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let loaded = false;
let loading = null;

export async function ensureModelsLoaded() {
  if (loaded) return;
  if (loading) return loading;
  loading = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    loaded = true;
  })();
  return loading;
}

export function isLoaded() {
  return loaded;
}

export { faceapi };