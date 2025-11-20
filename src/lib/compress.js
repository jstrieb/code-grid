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

function getFontHeight(text, width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = width;
  const context = canvas.getContext("2d");
  let fontSize = 1;
  for (
    context.font = `${fontSize}px sans-serif`;
    context.measureText(text).width < width - fontSize;
    context.font = `${fontSize++}px sans-serif`
  ) {}
  return fontSize - 1;
}

export function compress(data, bottomText) {
  if (data.some((x) => x == 255)) {
    // TODO: Don't use 255 as padding
    throw new Error("Data cannot contain byte 255, which is used as padding");
  }
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const numPixels = data.length / 3;
  const roundedRoot = Math.ceil(Math.sqrt(numPixels));

  if (bottomText) {
    const minCharWidth = 5;
    const padding = 5;
    canvas.width = Math.max(roundedRoot, minCharWidth * bottomText.length);
    const textHeight = getFontHeight(bottomText, canvas.width);
    canvas.height =
      Math.ceil(numPixels / canvas.width) + textHeight + padding * 1.5;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "black";
    context.font = `${textHeight}px sans-serif`;
    context.fillText(
      bottomText,
      (canvas.width - context.measureText(bottomText).width) / 2,
      canvas.height - padding,
    );
  } else {
    canvas.width = roundedRoot;
    canvas.height = roundedRoot;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  let offset = 0;
  data.forEach((b) => {
    // The alpha channel must be fully opaque or there will be cross-browser
    // inconsistencies in encoding and decoding pixel data
    if (offset % 4 == 3) image.data[offset++] = 255;
    image.data[offset++] = b;
  });
  context.putImageData(image, 0, 0);
  const url = canvas.toDataURL("image/png");
  return url.match(/,(.*)/)[1];
}

export function decompress(url) {
  // Decompression must be async because there is a race condition if we don't
  // wait for the image load before using its pixels
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onerror = (e) => reject(new Error("Could not extract image data"));
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        const raw = context.getImageData(
          0,
          0,
          img.naturalWidth,
          img.naturalHeight,
        ).data;
        // The addition and modulus operations change a possible -1 value to
        // raw.length - 1. Other values will be unchanged.
        const dataEnd =
          (raw.findIndex((v, i) => v == 255 && raw[i + 1] == 255) +
            raw.length) %
          raw.length;
        resolve(
          raw.slice(0, dataEnd).filter((b, i) => b != 255 /* && i % 4 != 3 */),
        );
      } catch (e) {
        reject(e);
      }
    };
    img.src = `data:image/png;base64,${url}`;
  });
}

export function compressText(s, bottomText) {
  return compress(encoder.encode(s), bottomText);
}

export async function decompressText(data) {
  if (!data) return undefined;
  return decoder.decode(await decompress(data));
}
