<style>
  td {
    /* 
      0.5px borders are rounded in many browsers, so instead we do 1px borders
      on two sides. 
    */
    border-bottom: 1px solid var(--fg-color);
    border-right: 1px solid var(--fg-color);
    user-select: none;
    -webkit-user-select: none;
    background: transparent;
  }

  td,
  td > * {
    width: var(--width);
    min-width: var(--width);
    max-width: var(--width);
    height: var(--height);
    min-height: var(--height);
    max-height: var(--height);
  }

  td .text,
  td .element,
  td textarea {
    padding: 0.1em 0.2em;
  }

  td .text {
    overflow: hidden;
    white-space: pre;
    text-overflow: ellipsis;
  }

  td .error {
    /* Need to subtract 1 to prevent border overflow */
    width: calc(var(--width) - 1px);
    min-width: calc(var(--width) - 1px);
    max-width: calc(var(--width) - 1px);
    border: 1px solid var(--error-color);
  }

  td .element {
    display: flex;
    overflow: hidden;
  }

  textarea {
    resize: none;
    border: 0;
    font-family: monospace, monospace;
    line-height: 1;
    white-space: pre;
    /* 
      This is ncessary to prevent the switch to textarea from reflowing the
      table cell (and by extension the row) a few pixels taller.
    */
    display: block;
  }

  /* No scrollbar for text area */
  textarea {
    overflow: scroll;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  textarea::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  /* 
    All these combinations are required to prevent the classes from overwriting
    each other when multiple are set.

    Including the four basic cases, and the case where none are selected at all,
    there should be 2^4 == 16 total cases covered (the size of the power set of
    the four possible classes).
  */
  .left {
    box-shadow: inset 1px 0 0 0 var(--fg-color);
  }
  .right {
    box-shadow: inset -1px 0 0 0 var(--fg-color);
  }
  .top {
    box-shadow: inset 0 1px 0 0 var(--fg-color);
  }
  .bottom {
    box-shadow: inset 0 -1px 0 0 var(--fg-color);
  }
  .top.left {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color);
  }
  .top.right {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset -1px 0 0 0 var(--fg-color);
  }
  .bottom.left {
    box-shadow:
      inset 0 -1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color);
  }
  .bottom.right {
    box-shadow:
      inset 0 -1px 0 0 var(--fg-color),
      inset -1px 0 0 0 var(--fg-color);
  }
  .left.right {
    box-shadow:
      inset 1px 0 0 0 var(--fg-color),
      inset -1px 0 0 0 var(--fg-color);
  }
  .bottom.top {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset 0 -1px 0 0 var(--fg-color);
  }
  .top.left.bottom {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color),
      inset 0 -1px 0 0 var(--fg-color);
  }
  .top.right.bottom {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset -1px 0 0 0 var(--fg-color),
      inset 0 -1px 0 0 var(--fg-color);
  }
  .left.bottom.right {
    box-shadow:
      inset 0 -1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color),
      inset -1px 0 0 0 var(--fg-color);
  }
  .left.top.right {
    box-shadow:
      inset 0 1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color),
      inset -1px 0 0 0 var(--fg-color);
  }
  .top.left.bottom.right {
    box-shadow:
      inset -1px -1px 0 0 var(--fg-color),
      inset 1px 1px 0 0 var(--fg-color);
  }
</style>

<script>
  let { cell, row, col, width, height, globals = $bindable() } = $props();
  let selected = $derived(globals.selected);
  let value = $derived(cell.value);
  let errorText = $derived(cell.errorText);
  let style = $derived(cell.style);
  let element = $derived(cell.element);

  let innerNode = $state(undefined);
  $effect(() => {
    if (element == null) {
      return;
    }
    innerNode?.replaceChildren?.();
    innerNode?.appendChild?.(element);
  });

  $effect(() => {
    if (cell.editing) {
      globals.mode = "insert";
    }
  });

  function focus(e) {
    e.focus();
  }
</script>

<td
  bind:this={cell.td}
  style:--width="{width}px"
  style:--height="{height}px"
  class:left={cell.leftBorder}
  class:right={cell.rightBorder}
  class:top={cell.topBorder}
  class:bottom={cell.bottomBorder}
  class:editing={cell.editing}
  style={cell.editing ? undefined : style}
  onfocus={() => {
    /* TODO */
  }}
  onpointerover={(e) => {
    if (e.buttons != 1) {
      return;
    }
    if (selected.type == "cell") {
      globals.setSelectionEnd({ x: col, y: row });
    } else if (selected.type == "row") {
      globals.setSelectionEnd(row);
    } else if (selected.type == "col") {
      globals.setSelectionEnd(col);
    }
  }}
  onpointerdown={(e) => {
    if (e.buttons != 1) {
      return;
    }
    if (e.shiftKey) {
      globals.mode = "visual";
      globals.setSelectionEnd({ x: col, y: row });
    } else {
      globals.mode = "normal";
      globals.setSelectionStart("cell", { x: col, y: row });
    }
  }}
  ondblclick={() => {
    // Assumes that this cell is the only thing selected when it is
    // double-clicked
    cell.editing = selected.contains(row, col);
  }}
>
  {#if cell.editing}
    <textarea
      use:focus
      bind:value={cell.formula}
      onblur={() => {
        cell.editing = false;
      }}
      rows="1"
      wrap="off"
      autocorrect="off"
      autocapitalize="none"
      autocapitalization="none"
      autocomplete="off"
      spellcheck="false"
    ></textarea>
  {:else if errorText != null}
    <div class="text error">{errorText}</div>
  {:else if element != null}
    <div bind:this={innerNode} class="element"></div>
  {:else}
    <div class="text">{$value}</div>
  {/if}
</td>
