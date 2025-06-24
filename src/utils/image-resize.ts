// Image resizing utility with resampling algorithms

export type ResampleAlgorithm = 'nearest' | 'bilinear' | 'bicubic';

export function resizeImageData(
  src: ImageData,
  targetWidth: number,
  targetHeight: number,
  algorithm: ResampleAlgorithm = 'bicubic',
): ImageData {
  // Placeholder: implement actual resampling algorithms
  // For now, use canvas for resizing (bicubic by default)
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not supported');
  // Draw source image to temp canvas
  const tmp = document.createElement('canvas');
  tmp.width = src.width;
  tmp.height = src.height;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) throw new Error('2D context not supported');
  tmpCtx.putImageData(src, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality =
    algorithm === 'nearest' ? 'low' : algorithm === 'bilinear' ? 'medium' : 'high';
  ctx.drawImage(tmp, 0, 0, src.width, src.height, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}
