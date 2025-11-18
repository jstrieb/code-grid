export function debounce(f, delay, max = undefined) {
  let t;
  let iterations = 0;
  return (...args) => {
    clearTimeout(t);
    if (max != null && iterations > max) {
      iterations = 0;
      f(...args);
    } else {
      iterations++;
      t = setTimeout(() => {
        iterations = 0;
        f(...args);
      }, delay);
    }
  };
}

export function sum(l) {
  return l.reduce((x, accum) => x + accum, 0);
}

// Wrap a function such that its args are automatically converted to additive
// identity if undefined or null. This is zero by default, unless any of the
// args are strings, in which case the additive identity is the empty string.
// Args are converted recursively, so this works even if the function is passed
// a 2D range.
//
// f.apply is used because f might be a formula function that needs the "this"
// object. This function also takes care to make sure the resulting wrapped
// function has the same toString representation as the original, because the
// toString representation is used to display formula function code in the help
// viewer.
export function undefinedArgsToIdentity(f) {
  function result(...args) {
    let id = 0;
    if (args.flat(Infinity).some((x) => typeof x === "string")) {
      id = "";
    }
    return f.apply(this, replaceWithId(args, id));
  }
  result.toString = () => f.toString();
  return result;
}
function replaceWithId(a, id) {
  return a.map((x) => (Array.isArray(x) ? replaceWithId(x, id) : (x ?? id)));
}

export function reshape(l, rows, cols) {
  return new Array(rows)
    .fill()
    .map((_, i) => new Array(cols).fill().map((_, j) => l[i * cols + j]));
}

export function randomId(length = 16) {
  const result = new Uint8Array(length);
  crypto.getRandomValues(result);
  return Array.from(result)
    .map((b) => b.toString(36))
    .join("");
}

export function replaceValues(k, v) {
  if (k == "formula" && v === "") {
    // Keep the URL shorter by not storing empty formulas
    return undefined;
  }
  if (k != "value") {
    return v;
  }
  if (v === "") {
    return undefined;
  }
  // TODO: Do other things to make the data URL smaller
  return v;
}

let nextIndex = 10;
export function nextZIndex(increment = 1) {
  const result = nextIndex;
  nextIndex += increment;
  return result;
}

const elementProperties = Object.getOwnPropertyNames(HTMLElement.prototype);
const objectProperties = Object.getOwnPropertyNames(Object.prototype);
function cloneNode(node) {
  const result = node.cloneNode(false);
  let style;
  try {
    style = window.getComputedStyle(node);
  } catch {
    return result;
  }
  for (const s of style) {
    result.style[s] = style.getPropertyValue(s);
  }
  for (const prop of Object.getOwnPropertyNames(node.__proto__)) {
    if (typeof node[prop] == "function") continue;
    if (objectProperties.includes(prop)) continue;
    if (elementProperties.includes(prop)) continue;
    const attribute = node[prop];
    if (attribute == null || attribute == "") continue;
    result.setAttribute(prop, attribute);
  }
  for (const child of node.childNodes) {
    result.appendChild(cloneNode(child));
  }
  return result;
}

export async function domToImage(node) {
  if (node == null) return undefined;

  const { width, height } = node.getBoundingClientRect();
  const padding = 10;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width + padding * 2);
  svg.setAttribute("height", width + padding * 2);
  Array.from(
    document.querySelectorAll("link[rel='stylesheet'], style"),
  ).forEach((tag) => {
    svg.append(cloneNode(tag));
  });
  const foreignObject = Object.assign(
    document.createElementNS("http://www.w3.org/2000/svg", "foreignObject"),
    { style: "width: 100%; height: 100%;" },
  );
  const root = Object.assign(
    document.createElementNS("http://www.w3.org/1999/xhtml", "div"),
    { style: `width: 100%; height: 100%; padding: ${(padding * 3) / 4}px;` },
  );
  root.appendChild(cloneNode(node));
  foreignObject.append(root);
  svg.appendChild(foreignObject);

  const serializer = new XMLSerializer();
  const blob = new Blob([serializer.serializeToString(svg)], {
    type: "image/svg+xml",
  });
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", (e) => {
      resolve(e.target.result);
    });
    reader.addEventListener("error", (e) => {
      reject(e);
    });
    reader.readAsDataURL(blob);
  });

  const canvas = document.createElement("canvas");
  canvas.width = width + padding * 2;
  canvas.height = height + padding * 2;
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      context.drawImage(image, 0, 0);
      resolve();
    });
    image.addEventListener("error", (e) => {
      reject(e);
    });
    image.src = dataUrl;
  });
  return canvas.toDataURL("image/png");
}
