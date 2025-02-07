/***
 * Compress and decompress text and Uint8Arrays using PNG files. Even though the
 * compression streams API can do raw DEFLATE, that is a recent addition to the
 * web standards, and will not work in older browsers, whereas this will.
 *
 * Created by Jacob Strieb
 * February 2025
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function compress(data) {
  if (data.some((x) => x == 255)) {
    // TODO: Don't use 255 as padding
    throw new Error("Data cannot contain byte 255, which is used as padding");
  }
  const canvas = document.createElement("canvas");
  const roundedRoot = Math.ceil(Math.sqrt(data.length / 3));
  canvas.width = roundedRoot;
  canvas.height = roundedRoot;
  const context = canvas.getContext("2d");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  let offset = 0;
  data.forEach((b) => {
    // The alpha channel must be fully opaque or there will be cross-browser
    // inconsistencies in encoding and decoding pixel data
    if (offset % 4 == 3) image.data[offset++] = 255;
    image.data[offset++] = b;
  });
  for (; offset < image.data.length; offset++) {
    image.data[offset] = 255;
  }
  context.putImageData(image, 0, 0);
  const url = canvas.toDataURL("image/png");
  return url.match(/,(.*)/)[1];
}

export function decompress(url) {
  // Decompression must be async because there is a race condition if we don't
  // wait for the image load before using its pixels
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onerror = (e) => reject(e);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        resolve(
          context
            .getImageData(0, 0, img.naturalWidth, img.naturalHeight)
            .data.filter((b, i) => b != 255 /* && i % 4 != 3 */),
        );
      } catch (e) {
        reject(e);
      }
    };
    img.src = `data:image/png;base64,${url}`;
  });
}

export function compressText(s) {
  return compress(encoder.encode(s));
}

export async function decompressText(data) {
  return decoder.decode(await decompress(data));
}
