<style>
  /* 
    The [open] is required for the .close() method to work, otherwise the
    display: flex applies to the closed dialog, which is supposed to have
    display: none. 
  */
  dialog[open] {
    border: 1px solid var(--fg-color);
    box-shadow: 4px 4px 0 0 var(--fg-color);
    padding: 0.25em;
    z-index: 10;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    gap: 0.5em;
  }

  .top {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    gap: 0.25em;
  }

  .top .drag {
    flex-grow: 1;
    cursor: grab;
    height: 1.5em;
    touch-action: none;
    border: 1px solid var(--fg-color);
  }

  .top .drag:active {
    cursor: grabbing;
  }

  button {
    cursor: pointer;
    font-family: monospace, monospace;
    width: 1.5em;
    height: 1.5em;
    border: 1px solid var(--fg-color);
    box-shadow: 2px 2px 0 0 var(--fg-color);
    margin-right: 2px;
  }

  button:hover {
    outline: 1px solid var(--fg-color);
  }

  button:active {
    box-shadow: 1px 1px 0 0 var(--fg-color);
  }

  .main {
    flex-grow: 1;
    overflow: auto;
  }
</style>

<script>
  let {
    children,
    open = $bindable(false),
    top = $bindable(50),
    left = $bindable(50),
    ...rest
  } = $props();
  let dialog = $state();
  let pointerStart = $state();

  function pointerdown(e) {
    e.target.addEventListener("pointermove", pointermove);
    e.target.setPointerCapture(e.pointerId);
    pointerStart = { x: e.clientX, y: e.clientY };
  }

  function pointerup(e) {
    e.target.removeEventListener("pointermove", pointermove);
    e.target.releasePointerCapture(e.pointerId);
  }

  function pointermove(e) {
    const dx = e.clientX - pointerStart.x;
    left += dx;
    const dy = e.clientY - pointerStart.y;
    top += dy;
    pointerStart.x = e.clientX;
    pointerStart.y = e.clientY;
  }

  // Don't bind directly to dialog open attribute since using it to toggle is
  // not recommended
  $effect(() => {
    if (open) {
      dialog?.show();
    } else {
      dialog?.close();
    }
  });
</script>

<dialog bind:this={dialog} style:top="{top}px" style:left="{left}px" {...rest}>
  <div class="top">
    <svg class="drag" onpointerdown={pointerdown} onpointerup={pointerup}>
      <defs>
        <pattern
          id="dots"
          x="0"
          y="0"
          width="6"
          height="9"
          viewBox="0 0 6 9"
          patternUnits="userSpaceOnUse"
        >
          <rect x="1" y="0" width="1" height="1" style="fill: var(--fg-color);"
          ></rect>
          <rect x="1" y="3" width="1" height="1" style="fill: var(--fg-color);"
          ></rect>
          <rect x="1" y="6" width="1" height="1" style="fill: var(--fg-color);"
          ></rect>
          <rect x="4" y="2" width="1" height="1" style="fill: var(--fg-color);"
          ></rect>
          <rect x="4" y="5" width="1" height="1" style="fill: var(--fg-color);"
          ></rect>
          <rect x="4" y="8" width="1" height="1" style="fill: var(--fg-color);"
          ></rect>
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="url(#dots)"
        style="stroke: var(--bg-color); stroke-width: 2px;"
      ></rect>
    </svg>
    <button onclick={() => (open = false)}>X</button>
  </div>
  <div class="main">
    {@render children()}
  </div>
</dialog>
