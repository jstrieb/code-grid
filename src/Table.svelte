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

  import { get, writable } from "svelte/store";

  let {
    cells = $bindable(),
    widths = $bindable(),
    heights = $bindable(),
    table = $bindable(),
    selected = $bindable(),
  } = $props();

  let pointerStart = $state(undefined);
  let toAdd = $state(1);

  function pointermoveX(i) {
    return (e) => {
      const dx = e.clientX - pointerStart.x;
      if (selected.type == "col" && selected.start <= i && i <= selected.end) {
        for (let j = selected.start; j <= selected.end; j++) {
          widths[j] += dx;
        }
      } else {
        widths[i] += dx;
      }
      pointerStart.x = e.clientX;
    };
  }

  function pointermoveY(i) {
    return (e) => {
      const dy = e.clientY - pointerStart.y;
      if (selected.type == "row" && selected.start <= i && i <= selected.end) {
        for (let j = selected.start; j <= selected.end; j++) {
          heights[j] += dy;
        }
      } else {
        heights[i] += dy;
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

  function getMaxCellSize(filteredCells, measureResult) {
    // TODO: Make this function faster.
    //       - svelte/store/get is slow
    //       - Writing DOM elements to the body and measuring is slow
    //
    // Note that measuring actual internal parts of cells doesn't work reliably
    // because cell inner elements all have their width explicitly set. Changing
    // the width and re-measuring can result in inconsistent results. That is
    // why we create new <div>s instead of measuring existing ones.
    return (
      filteredCells
        .map((cellStore) => {
          const cell = get(cellStore);
          if (cell instanceof Element) {
            return measureResult(cell) ?? 0;
          } else if (cell != null) {
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
          } else {
            return 5;
          }
        })
        .reduce((a, x) => Math.max(a, x), 0) +
      // Sometimes the calculated value is just shy of enough so we add more
      5
    );
  }

  function isRowSelected(i) {
    return (
      selected.type == "row" &&
      ((selected.start <= i && i <= selected.end) ||
        (selected.start >= i && i >= selected.end))
    );
  }

  function isColSelected(i) {
    return (
      selected.type == "col" &&
      ((selected.start <= i && i <= selected.end) ||
        (selected.start >= i && i >= selected.end))
    );
  }

  function autoResizeCol(i) {
    const newWidth = getMaxCellSize(
      cells.map((row) => row[i]),
      (div) => div.scrollWidth,
    );
    if (!Number.isNaN(newWidth)) {
      widths[i] = newWidth;
    }
  }

  function autoResizeRow(i) {
    const newHeight = getMaxCellSize(cells[i], (div) => div.scrollHeight);
    if (!Number.isNaN(newHeight)) {
      heights[i] = newHeight;
    }
  }
</script>

<div class="container">
  <table bind:this={table}>
    <thead>
      <tr>
        <th></th>
        {#each widths as width, i (i)}
          {@const pointermoveHandler = pointermoveX(i)}
          <th
            style:--width="{width}px"
            class:selected={isColSelected(i)}
            style:box-shadow={[
              ...(isColSelected(i) ? ["inset 0 1px 0 0 var(--fg-color)"] : []),
              ...(isColSelected(i) && !isColSelected(i - 1)
                ? ["inset 1px 0 0 0 var(--fg-color)"]
                : []),
              ...(isColSelected(i) && !isColSelected(i + 1)
                ? ["inset -1px 0 0 0 var(--fg-color)"]
                : []),
            ].join(", ")}
          >
            <div class="header">
              <button
                onfocus={() => {
                  /* TODO */
                }}
                onmouseover={(e) => {
                  if (e.buttons == 0 || selected.type != "col") {
                    return;
                  }
                  selected.end = i;
                }}
                onmousedown={() => {
                  selected = {
                    type: "col",
                    start: i,
                    end: i,
                  };
                }}>C{i}</button
              >
            </div>
            <button
              onpointerdown={pointerdown(pointermoveHandler)}
              onpointerup={pointerup(pointermoveHandler)}
              ondblclick={() => {
                if (
                  selected.type == "col" &&
                  selected.start <= i &&
                  i <= selected.end
                ) {
                  for (let j = selected.start; j <= selected.end; j++) {
                    autoResizeCol(j);
                  }
                } else {
                  autoResizeCol(i);
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
          <th
            style:--height="{heights[i]}px"
            class:selected={isRowSelected(i)}
            style:box-shadow={[
              ...(isRowSelected(i) ? ["inset 1px 0 0 0 var(--fg-color)"] : []),
              ...(isRowSelected(i) && !isRowSelected(i - 1)
                ? ["inset 0 1px 0 0 var(--fg-color)"]
                : []),
              ...(isRowSelected(i) && !isRowSelected(i + 1)
                ? ["inset 0 -1px 0 0 var(--fg-color)"]
                : []),
            ].join(", ")}
          >
            <div class="header">
              <button
                onfocus={() => {
                  /* TODO */
                }}
                onmouseover={(e) => {
                  if (e.buttons == 0 || selected.type != "row") {
                    return;
                  }
                  selected.end = i;
                }}
                onmousedown={() => {
                  selected = {
                    type: "row",
                    start: i,
                    end: i,
                  };
                }}>R{i}</button
              >
            </div>
            <button
              onpointerdown={pointerdown(pointermoveHandler)}
              onpointerup={pointerup(pointermoveHandler)}
              ondblclick={() => {
                if (
                  selected.type == "row" &&
                  selected.start <= i &&
                  i <= selected.end
                ) {
                  for (let j = selected.start; j <= selected.end; j++) {
                    autoResizeRow(j);
                  }
                } else {
                  autoResizeRow(i);
                }
              }}
              class="bottom handle"
              aria-label="Drag handle for row R{i}"
            ></button>
          </th>

          {#each row as cell, j (j)}
            <Cell
              {cell}
              bind:selected
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

  <div class="add columns">
    <Button
      style="width: 100%;"
      disabled={!Number.isInteger(toAdd) || toAdd == 0}
      onclick={() => {
        if (toAdd > 0) {
          for (let i = 0; i < toAdd; i++) {
            cells.forEach((row) => {
              row.push(writable(undefined));
            });
            widths.push(56);
          }
        } else if (toAdd < 0) {
          // Note that toAdd is negative in the calculations below
          cells.forEach((row) => {
            row.splice(row.length + toAdd, -toAdd);
          });
          widths.splice(widths.length + toAdd, -toAdd);
        }
      }}
      >{#if toAdd >= 0}Add {toAdd}{:else}Delete {-toAdd}{/if} column{#if Math.abs(toAdd) != 1}s{/if}</Button
    >
  </div>

  <div class="add rows">
    <Button
      disabled={!Number.isInteger(toAdd) || toAdd == 0}
      onclick={() => {
        if (toAdd > 0) {
          for (let i = 0; i < toAdd; i++) {
            cells.push(
              new Array(widths.length).fill().map((_) => writable(undefined)),
            );
            heights.push(24);
          }
        } else if (toAdd < 0) {
          // Note that toAdd is negative in the calculations below
          cells.splice(cells.length + toAdd, -toAdd);
          heights.splice(heights.length + toAdd, -toAdd);
        }
      }}
      >{#if toAdd >= 0}Add {toAdd}{:else}Delete {-toAdd}{/if} row{#if Math.abs(toAdd) != 1}s{/if}</Button
    >
  </div>

  <div class="numberinput">
    <NumericInput
      style="width: 100%; text-align: center; max-width: 5ch;"
      bind:value={toAdd}
      onfocus={(e) => {
        e.target.select();
      }}
    />
  </div>
</div>
