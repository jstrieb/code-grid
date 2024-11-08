<style>
  table {
    border-collapse: collapse;
    border-spacing: 0;
    box-shadow: 4px 4px 0 0 var(--fg-color);
  }

  th {
    user-select: none;
    -webkit-user-select: none;
    border: 1px solid var(--fg-color);
    background: #dddddd;
    /* Required for draggable handles to be positioned absolutely */
    position: relative;
  }

  th,
  th .text {
    width: var(--width);
    min-width: var(--width);
    max-width: var(--width);
    height: var(--height);
    min-height: var(--height);
    max-height: var(--height);
  }

  th .text {
    padding: 0.1em 0.2em;
    overflow: hidden;
    white-space: pre;
    text-overflow: ellipsis;
    background: none;
  }

  thead th:first-of-type {
    border: 0;
    background: none;
  }

  .handle {
    display: inline-block;
    background: none;
    position: absolute;
    z-index: 1;
    /* Prevent mobile browsers from scrolling when trying to resize */
    touch-action: none;
  }

  .right.handle {
    cursor: ew-resize;
    height: 100%;
    width: 8px;
    right: -4px;
    top: 0;
    bottom: 0;
  }

  .bottom.handle {
    cursor: ns-resize;
    width: 100%;
    height: 8px;
    bottom: -4px;
    left: 0;
    right: 0;
  }
</style>

<script>
  import Cell from "./Cell.svelte";

  const {
    cells,
    widths = $bindable(),
    heights = $bindable(),
    selected,
  } = $props();

  let pointerStart = $state(undefined);

  function pointermoveX(i) {
    return (e) => {
      const dx = e.clientX - pointerStart.x;
      widths[i] += dx;
      pointerStart.x = e.clientX;
    };
  }

  function pointermoveY(i) {
    return (e) => {
      const dy = e.clientY - pointerStart.y;
      heights[i] += dy;
      pointerStart.y = e.clientY;
    };
  }

  function pointerdown(pointermoveHandler) {
    return (e) => {
      e.target.addEventListener("pointermove", pointermoveHandler);
      e.target.setPointerCapture(e.pointerId);
      pointerStart = { x: e.clientX, y: e.clientY };
    };
  }

  function pointerup(pointermoveHandler) {
    return (e) => {
      e.target.removeEventListener("pointermove", pointermoveHandler);
      e.target.releasePointerCapture(e.pointerId);
    };
  }
</script>

<table>
  <thead>
    <tr>
      <th></th>
      {#each widths as width, i (i)}
        {@const pointermoveHandler = pointermoveX(i)}
        <th style:--width="{width}px">
          <div class="text">C{i}</div>
          <div
            onpointerdown={pointerdown(pointermoveHandler)}
            onpointerup={pointerup(pointermoveHandler)}
            class="right handle"
          ></div>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each cells as row, i (i)}
      {@const pointermoveHandler = pointermoveY(i)}
      <tr>
        <th style:--height="{heights[i]}px">
          <div class="text">R{i}</div>
          <div
            onpointerdown={pointerdown(pointermoveHandler)}
            onpointerup={pointerup(pointermoveHandler)}
            class="bottom handle"
          ></div>
        </th>
        {#each row as cell, j (j)}
          <Cell
            {cell}
            {selected}
            width={widths[j]}
            height={heights[i]}
            row={i}
            col={j}
          />
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
