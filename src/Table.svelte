<style>
  table {
    /* 
      TODO: Fix. Border collapse with box shadows (for showing selected cells)
      creates a small gap between the border and box shadow in Safari.
    */
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
  th .header {
    width: var(--width);
    min-width: var(--width);
    max-width: var(--width);
    height: var(--height);
    min-height: var(--height);
    max-height: var(--height);
  }

  th .header {
    overflow: hidden;
    white-space: pre;
    text-overflow: ellipsis;
    background: none;
    display: flex;
    justify-content: center;
    align-items: stretch;
  }

  th .header button {
    padding: 0.1em 0.2em;
    flex-grow: 1;
    background: none;
    border: 0;
  }

  th.selected .header button {
    cursor: grab;
  }

  th.selected {
    background: #aaaaaa;
  }

  thead th.selected {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color),
      inset -1px 0 0 0 var(--fg-color);
  }

  tbody th.selected {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color),
      inset 0 -1px 0 0 var(--fg-color);
  }

  thead th:first-of-type {
    border: 0;
    background: none;
  }

  .handle {
    display: inline-block;
    background: none;
    border: 0;
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

  import { get } from "svelte/store";

  let {
    cells,
    widths = $bindable(),
    heights = $bindable(),
    table = $bindable(),
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

  function getMaxCellSize(filteredCells, measureResult) {
    // TODO: Make this function faster.
    //       - svelte/store/get is slow
    //       - Writing DOM elements to the body and measuring is slow
    //
    // Note that measuring actual internal parts of cells doesn't work reliably
    // because cell inner elements all have their width explicitly set. Changing
    // the width and re-measuring can result in inconsistent results.
    return (
      filteredCells
        .map((cellStore) => {
          const cell = get(cellStore);
          if (cell instanceof Element) {
            return measureResult(cell) ?? 0;
          } else {
            const div = Object.assign(document.createElement("div"), {
              // Match padding of cell in Cell.svelte
              style: `padding: 0.1em 0.2em; 
                      z-index: -1; 
                      min-width: max-content;
                      width: max-content;
                      max-width: max-content;
                      min-height: max-content;
                      height: max-content;
                      max-height: max-content;`,
              innerText: cell.toString(),
            });
            document.body.append(div);
            const result = measureResult(div) ?? 0;
            div.remove();
            return result;
          }
        })
        .reduce((a, x) => Math.max(a, x), 0) +
      // Sometimes the calculated value is just shy of enough so we add more
      5
    );
  }

  function isRowSelected(i) {
    return (
      $selected.start.x == -1 &&
      $selected.start.y == $selected.end.y &&
      $selected.start.y == i
    );
  }

  function isColSelected(i) {
    return (
      $selected.start.y == -1 &&
      $selected.start.x == $selected.end.x &&
      $selected.start.x == i
    );
  }
</script>

<table bind:this={table}>
  <thead>
    <tr>
      <th></th>
      {#each widths as width, i (i)}
        {@const pointermoveHandler = pointermoveX(i)}
        <th style:--width="{width}px" class:selected={isColSelected(i)}>
          <div class="header">
            <button
              draggable={isColSelected(i)}
              onclick={() => {
                $selected.start = { x: i, y: -1 };
                $selected.end = { x: i, y: heights.length - 1 };
              }}>C{i}</button
            >
          </div>
          <button
            onpointerdown={pointerdown(pointermoveHandler)}
            onpointerup={pointerup(pointermoveHandler)}
            ondblclick={() => {
              const newWidth = getMaxCellSize(
                cells.map((row) => row[i]),
                (div) => div.scrollWidth,
              );
              if (!Number.isNaN(newWidth)) {
                widths[i] = newWidth;
              }
            }}
            class="right handle"
            aria-label="Drag handle for column C{i}"
          ></button>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each cells as row, i (i)}
      {@const pointermoveHandler = pointermoveY(i)}
      <tr>
        <th style:--height="{heights[i]}px" class:selected={isRowSelected(i)}>
          <div class="header">
            <button
              onclick={() => {
                $selected.start = { x: -1, y: i };
                $selected.end = { x: widths.length - 1, y: i };
              }}>R{i}</button
            >
          </div>
          <button
            onpointerdown={pointerdown(pointermoveHandler)}
            onpointerup={pointerup(pointermoveHandler)}
            ondblclick={() => {
              const newHeight = getMaxCellSize(
                cells[i],
                (div) => div.scrollHeight,
              );
              if (!Number.isNaN(newHeight)) {
                heights[i] = newHeight;
              }
            }}
            class="bottom handle"
            aria-label="Drag handle for row R{i}"
          ></button>
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
