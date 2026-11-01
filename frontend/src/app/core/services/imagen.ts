const LADO = 400; // px del cuadrado final
const CALIDAD = 0.86;
const MAXIMO_ORIGINAL = 15 * 1024 * 1024;

/**
 * Prepara una foto para el sistema: la recorta al cuadrado (centrada), la achica a 400×400
 * y la comprime. Una foto de celular de varios MB queda en ~30 KB.
 */
export async function prepararFoto(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo elegido no es una imagen. Elija una foto JPG o PNG.');
  }
  if (archivo.size > MAXIMO_ORIGINAL) {
    throw new Error('La foto es demasiado pesada (más de 15 MB). Elija otra.');
  }

  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No se pudo leer la foto. Pruebe con otra imagen.');
  }

  const lado = Math.min(imagen.width, imagen.height);
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO;
  lienzo.height = LADO;
  const ctx = lienzo.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  imagen.close();

  const blob = await convertir(lienzo, 'image/webp');
  // Algunos navegadores no generan WEBP y devuelven PNG: en ese caso se usa JPG.
  return blob.type === 'image/webp' ? blob : convertir(lienzo, 'image/jpeg');
}

function convertir(lienzo: HTMLCanvasElement, tipo: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    lienzo.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto.'))), tipo, CALIDAD),
  );
}
