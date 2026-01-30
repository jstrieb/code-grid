<style>
  h1 {
    font-size: x-large;
  }

  img {
    border: 1px solid black;
    object-fit: contain;
    image-rendering: pixelated;
    width: 100%;
  }

  label,
  label span {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
  }

  label span {
    flex-direction: row;
    flex-grow: 1;
  }

  input[type="text"] {
    width: 100%;
    border: 1px solid var(--fg-color);
    box-shadow: 3px 3px 0 0 var(--fg-color);
    padding: 0.2em 0.5em;
    /* Space for the shadow so it doesn't get cut off */
    margin-bottom: 3px;
    margin-right: -1px;
  }

  input[type="text"]:focus {
    box-shadow: 2px 2px 0 0 var(--fg-color);
    outline: 1px solid var(--fg-color);
  }

  input[type="text"]:disabled {
    cursor: not-allowed;
    --fg-color: var(--disabled-color);
    color: var(--fg-color);
  }
</style>

<script>
  import Button from "./components/Button.svelte";
  import FileBrowser from "./components/FileBrowser.svelte";

  import { State } from "./classes.svelte";

  import { compressText, decompressText } from "./lib/compress.js";

  let { imageData, globals } = $props();

  let bottomText = $state("https://jstrieb.github.io/code-grid");
  let dataUrl = $derived(
    `data:image/png;base64,${compressText(imageData, bottomText)}`,
  );
  let files = $state();

  $effect(() => {
    if (!files?.length) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const data = reader.result.match(/,(.*)/)[1];
      decompressText(data)
        .then((result) => globals.load(JSON.parse(result)))
        .catch((e) => {
          console.error(e);
          /* TODO */
        });
    });
    if (file) {
      reader.readAsDataURL(file);
    }
  });
</script>

<h1>Save</h1>
<img src={dataUrl} alt="Data of this spreadsheet stored in a PNG file" />
<label>
  Bottom text (optional)
  <span>
    <input
      type="text"
      bind:value={bottomText}
      autocorrect="off"
      autocapitalize="none"
      autocapitalization="none"
      autocomplete="off"
      spellcheck="false"
    />
    <Button
      square
      onclick={() => {
        bottomText = undefined;
      }}>X</Button
    >
  </span>
</label>
<!-- TODO: Buttons to download and share -->

<div style="height: 1em;"><!-- Spacer --></div>

<h1>Load</h1>
<FileBrowser accept="image/png" bind:files>Image file</FileBrowser>
<!-- TODO: Add preview and load button -->
