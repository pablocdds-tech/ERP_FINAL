// Núcleo biométrico: extração de descritores 128-d e matching por distância euclidiana.
// Os descritores são vetores Float32Array de 128 posições — o "template biométrico" real.
import { ensureModelsLoaded, faceapi } from "./face-api-loader";

export const MODEL_VERSION = "face-api-v1-128d";

// Threshold padrão de similaridade (distância euclidiana). <0.55 = mesma pessoa.
export const DEFAULT_THRESHOLD = 0.55;

/**
 * Extrai um descritor 128-d a partir de um HTMLImageElement, HTMLVideoElement ou HTMLCanvasElement.
 * Retorna { descriptor: number[], score, qualidade } ou null se não detectar rosto.
 */
export async function extrairDescritor(input) {
  await ensureModelsLoaded();
  const det = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!det) return null;

  // Heurística de qualidade: tamanho do rosto vs frame + score do detector
  const box = det.detection.box;
  const frameW = input.videoWidth || input.naturalWidth || input.width || 1;
  const frameH = input.videoHeight || input.naturalHeight || input.height || 1;
  const cobertura = (box.width * box.height) / (frameW * frameH);
  const qualidade = Math.min(1, det.detection.score * 0.6 + Math.min(cobertura * 4, 0.4));

  return {
    descriptor: Array.from(det.descriptor), // Float32Array → array para serializar
    score: det.detection.score,
    qualidade,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
  };
}

/**
 * Carrega uma URL e extrai descritor (usado no enrollment a partir das fotos salvas).
 */
export async function descritorDeUrl(url) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  return extrairDescritor(img);
}

/**
 * Distância euclidiana entre dois descritores 128-d.
 */
export function distancia(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Score de similaridade [0..1] a partir da distância. (1 - dist/2) clipado.
 */
export function similaridade(dist) {
  return Math.max(0, Math.min(1, 1 - dist / 1.2));
}

/**
 * 1:N — encontra o melhor match em uma lista de candidatos {id, descriptor, ...meta}.
 * Retorna { match, dist, score } ou null se ninguém abaixo do threshold.
 */
export function melhorMatch(probe, candidatos, threshold = DEFAULT_THRESHOLD) {
  if (!probe || !candidatos?.length) return null;
  let best = null;
  for (const c of candidatos) {
    if (!c?.descriptor) continue;
    const d = distancia(probe, c.descriptor);
    if (!best || d < best.dist) best = { match: c, dist: d };
  }
  if (!best) return null;
  return { ...best, score: similaridade(best.dist), aprovado: best.dist <= threshold };
}

/**
 * Hash do template (SHA-256 do JSON do array de números) — para auditoria sem expor o vetor.
 */
export async function hashTemplate(descriptor) {
  const data = new TextEncoder().encode(JSON.stringify(descriptor));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Média de descritores (para enrollment com várias poses).
 */
export function mediaDescritores(arr) {
  const valid = arr.filter(Boolean);
  if (!valid.length) return null;
  const dim = valid[0].length;
  const out = new Array(dim).fill(0);
  for (const d of valid) for (let i = 0; i < dim; i++) out[i] += d[i];
  for (let i = 0; i < dim; i++) out[i] /= valid.length;
  return out;
}