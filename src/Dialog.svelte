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
    gap: 0.25em;
    width: var(--width);
    min-width: var(--width);
    max-width: var(--width);
    height: var(--height);
    min-height: var(--height);
    max-height: var(--height);
  }

  .small-shadow {
    box-shadow: 2px 2px 0 0 var(--fg-color) !important;
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

  button.x {
    cursor: pointer;
    font-family: monospace, monospace;
    width: 1.5em;
    height: 1.5em;
    border: 1px solid var(--fg-color);
    box-shadow: 2px 2px 0 0 var(--fg-color);
    margin-right: 2px;
  }

  button.x:hover {
    outline: 1px solid var(--fg-color);
  }

  button.x:active {
    box-shadow: 1px 1px 0 0 var(--fg-color);
  }

  .main {
    flex-grow: 1;
    overflow: auto;
  }

  .resize {
    position: absolute;
    width: 16px;
    height: 16px;
    bottom: -8px;
    right: -8px;
    border: 0;
    background: none;
    cursor: nwse-resize;
    touch-action: none;
    z-index: 10;
  }

  /* TODO: Add better indicator for the drag handle. */
  .resize::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 7px;
    height: 7px;
    border: 1px solid var(--fg-color);
    background: var(--fg-color);
  }

  .resize:hover::after {
    outline: 1px solid var(--fg-color);
  }
</style>

<script>
  let {
    children,
    open = $bindable(false),
    top = $bindable(50),
    left = $bindable(50),
    width = $bindable(300),
    height = $bindable(300),
    ...rest
  } = $props();
  let dialog = $state();
  let pointerStart = $state();
  let dragging = $state(false);

  function topPointerDown(e) {
    e.target.addEventListener("pointermove", topPointerMove);
    e.target.setPointerCapture(e.pointerId);
    pointerStart = { x: e.clientX, y: e.clientY };
    dragging = true;
  }

  function topPointerUp(e) {
    e.target.removeEventListener("pointermove", topPointerMove);
    e.target.releasePointerCapture(e.pointerId);
    dragging = false;
  }

  function topPointerMove(e) {
    const dx = e.clientX - pointerStart.x;
    left += dx;
    const dy = e.clientY - pointerStart.y;
    top += dy;
    pointerStart.x = e.clientX;
    pointerStart.y = e.clientY;
  }

  function resizePointerDown(e) {
    e.target.addEventListener("pointermove", resizePointerMove);
    e.target.setPointerCapture(e.pointerId);
    pointerStart = { x: e.clientX, y: e.clientY };
  }

  function resizePointerUp(e) {
    e.target.removeEventListener("pointermove", resizePointerMove);
    e.target.releasePointerCapture(e.pointerId);
  }

  function resizePointerMove(e) {
    const dx = e.clientX - pointerStart.x;
    width += dx;
    pointerStart.x = e.clientX;
    const dy = e.clientY - pointerStart.y;
    height += dy;
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

<dialog
  bind:this={dialog}
  class:small-shadow={dragging}
  style:top="{top}px"
  style:left="{left}px"
  style:--width="{width}px"
  style:--height="{height}px"
>
  <div class="top">
    <svg class="drag" onpointerdown={topPointerDown} onpointerup={topPointerUp}>
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
    <button class="x" onclick={() => (open = false)}>X</button>
  </div>
  <div class="main" {...rest}>
    {@render children()}
  </div>
  <button
    class="resize"
    aria-label="Drag to reize dialog"
    onpointerdown={resizePointerDown}
    onpointerup={resizePointerUp}
  ></button>
</dialog>
