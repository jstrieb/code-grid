<style>
  .container {
    max-width: max-content;
    display: grid;
    grid-template-columns: repeat(2, auto);
    grid-template-rows: repeat(2, auto);
    gap: 0.5em;
  }

  .add.rows {
    grid-column: 1;
    grid-row: 2;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-end;
    align-items: flex-start;
  }

  .add.columns {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-end;
    align-items: flex-start;
  }

  .numberinput {
    grid-column: 2;
    grid-row: 2;
    display: flex;
  }

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
    background: var(--header-color);
    /* Drag header to highlight instead of scrolling */
    touch-action: none;
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
    background: var(--selected-color);
  }

  thead th:first-of-type {
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
  import Button from "./Button.svelte";
  import Cell from "./Cell.svelte";
  import NumericInput from "./NumericInput.svelte";

  let {
    sheet = $bindable(),
    table = $bindable(),
    selected = $bindable(),
  } = $props();

  let pointerStart = $state(undefined);
  let toAdd = $state(1);

  function pointermoveX(i) {
    return (e) => {
      const dx = e.clientX - pointerStart.x;
      if (selected.type == "col" && selected.contains(i)) {
        for (let j = selected.min; j <= selected.max; j++) {
          sheet.widths[j] += dx;
        }
      } else {
        sheet.widths[i] += dx;
      }
      pointerStart.x = e.clientX;
    };
  }

  function pointermoveY(i) {
    return (e) => {
      const dy = e.clientY - pointerStart.y;
      if (selected.type == "row" && selected.contains(i)) {
        for (let j = selected.min; j <= selected.max; j++) {
          sheet.heights[j] += dy;
        }
      } else {
        sheet.heights[i] += dy;
      }
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

  function colBoxShadow(i) {
    if (!selected.col(i)) {
      return;
    }
    const result = ["inset 0 1px 0 0 var(--fg-color)"];
    if (!selected.col(i - 1)) {
      result.push("inset 1px 0 0 0 var(--fg-color)");
    }
    if (!selected.col(i + 1)) {
      result.push("inset -1px 0 0 0 var(--fg-color)");
    }
    return result.join(", ");
  }

  function rowBoxShadow(i) {
    if (!selected.row(i)) {
      return;
    }
    const result = ["inset 1px 0 0 0 var(--fg-color)"];
    if (!selected.row(i - 1)) {
      result.push("inset 0 1px 0 0 var(--fg-color)");
    }
    if (!selected.row(i + 1)) {
      result.push("inset 0 -1px 0 0 var(--fg-color)");
    }
    return result.join(", ");
  }
</script>

<div class="container">
  <table bind:this={table}>
    <thead>
      <tr>
        <th></th>
        {#each sheet.widths as width, i (i)}
          {@const pointermoveHandler = pointermoveX(i)}
          <th
            style:--width="{width}px"
            class:selected={selected.col(i)}
            style:box-shadow={colBoxShadow(i)}
          >
            <div class="header">
              <button
                onfocus={() => {
                  /* TODO */
                }}
                onmouseover={(e) => {
                  if (e.buttons != 1 || selected.type != "col") {
                    return;
                  }
                  selected.end = i;
                }}
                onmousedown={(e) => {
                  if (e.buttons != 1) {
                    return;
                  }
                  selected.type = "col";
                  selected.end = i;
                  if (!e.shiftKey) {
                    selected.start = i;
                  }
                }}>C{i}</button
              >
            </div>
            <button
              onpointerdown={pointerdown(pointermoveHandler)}
              onpointerup={pointerup(pointermoveHandler)}
              ondblclick={() => {
                if (selected.col(i)) {
                  for (let j = selected.min; j <= selected.max; j++) {
                    sheet.autoResizeCol(j);
                  }
                } else {
                  sheet.autoResizeCol(i);
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
      {#each sheet.cells as row, i (i)}
        {@const pointermoveHandler = pointermoveY(i)}
        <tr>
          <th
            style:--height="{sheet.heights[i]}px"
            class:selected={selected.row(i)}
            style:box-shadow={rowBoxShadow(i)}
          >
            <div class="header">
              <button
                onfocus={() => {
                  /* TODO */
                }}
                onmouseover={(e) => {
                  if (e.buttons != 1 || selected.type != "row") {
                    return;
                  }
                  selected.end = i;
                }}
                onmousedown={(e) => {
                  if (e.buttons != 1) {
                    return;
                  }
                  selected.type = "row";
                  selected.end = i;
                  if (!e.shiftKey) {
                    selected.start = i;
                  }
                }}>R{i}</button
              >
            </div>
            <button
              onpointerdown={pointerdown(pointermoveHandler)}
              onpointerup={pointerup(pointermoveHandler)}
              ondblclick={() => {
                if (selected.row(i)) {
                  for (let j = selected.min; j <= selected.max; j++) {
                    sheet.autoResizeRow(j);
                  }
                } else {
                  sheet.autoResizeRow(i);
                }
              }}
              class="bottom handle"
              aria-label="Drag handle for row R{i}"
            ></button>
          </th>

          {#each row as cell, j (j)}
            <Cell
              cell={cell.value}
              bind:selected
              width={sheet.widths[j]}
              height={sheet.heights[i]}
              row={i}
              col={j}
            />
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="add columns">
    <Button
      style="width: 100%;"
      disabled={!Number.isInteger(toAdd) || toAdd == 0}
      onclick={() => sheet.addCols(toAdd)}
      >{#if toAdd >= 0}Add {toAdd}{:else}Delete {-toAdd}{/if} column{#if Math.abs(toAdd) != 1}s{/if}</Button
    >
  </div>

  <div class="add rows">
    <Button
      disabled={!Number.isInteger(toAdd) || toAdd == 0}
      onclick={() => sheet.addRows(toAdd)}
      >{#if toAdd >= 0}Add {toAdd}{:else}Delete {-toAdd}{/if} row{#if Math.abs(toAdd) != 1}s{/if}</Button
    >
  </div>

  <div class="numberinput">
    <NumericInput
      style="width: 100%; text-align: center; max-width: 7ch;"
      bind:value={toAdd}
      onfocus={(e) => e.target.select()}
    />
  </div>
</div>
