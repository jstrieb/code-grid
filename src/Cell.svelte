<style>
  td {
    border: 1px solid var(--fg-color);
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
  td textarea {
    padding: 0.1em 0.2em;
  }

  td .text {
    overflow: hidden;
    white-space: pre;
    text-overflow: ellipsis;
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
    All these combinations are required to prevent the above classes from
    overwriting each other when multiple are true.

    Including the above four cases and the case where none are selected at all,
    there should be 2^4 == 16 total cases covered.
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
  let { cell, row, col, selected = $bindable(), width, height } = $props();
  let top = $derived.by(() => {
      if (selected.type == "cell") {
        return Math.min(selected.start.y, selected.end.y);
      } else if (selected.type == "row") {
        return Math.min(selected.start, selected.end);
      } else if (selected.type == "col") {
        return -Infinity;
      }
    }),
    bottom = $derived.by(() => {
      if (selected.type == "cell") {
        return Math.max(selected.start.y, selected.end.y);
      } else if (selected.type == "row") {
        return Math.max(selected.start, selected.end);
      } else if (selected.type == "col") {
        return Infinity;
      }
    }),
    left = $derived.by(() => {
      if (selected.type == "cell") {
        return Math.min(selected.start?.x, selected.end?.x);
      } else if (selected.type == "col") {
        return Math.min(selected.start, selected.end);
      } else if (selected.type == "row") {
        return -Infinity;
      }
    }),
    right = $derived.by(() => {
      if (selected.type == "cell") {
        return Math.max(selected.start?.x, selected.end?.x);
      } else if (selected.type == "col") {
        return Math.max(selected.start, selected.end);
      } else if (selected.type == "row") {
        return Infinity;
      }
    });
  let contained = $derived(
    top <= row && row <= bottom && left <= col && col <= right,
  );
  let editing = $state(false);

  let innerNode = $state(undefined);
  $effect(() => {
    innerNode?.replaceAllChildren?.();
    innerNode?.appendChild?.($cell);
  });

  function focus(e) {
    e.focus();
  }
</script>

<td
  style:--width="{width}px"
  style:--height="{height}px"
  class:left={contained && left == col}
  class:right={contained && right == col}
  class:top={contained && top == row}
  class:bottom={contained && bottom == row}
  class:editing
  onfocus={() => {
    /* TODO */
  }}
  onmouseover={(e) => {
    if (e.buttons == 0) {
      return;
    }
    if (selected.type == "cell") {
      selected.end = { x: col, y: row };
    } else if (selected.type == "row") {
      selected.end = row;
    } else if (selected.type == "col") {
      selected.end = col;
    }
  }}
  onmousedown={(e) => {
    selected.type = "cell";
    selected.end = { x: col, y: row };
    if (!e.shiftKey) {
      selected.start = { x: col, y: row };
    }
  }}
  ondblclick={(e) => {
    editing =
      contained &&
      selected.type == "cell" &&
      selected.start.x == selected.end.x &&
      selected.start.y == selected.end.y;
  }}
>
  {#if editing}
    <textarea
      use:focus
      bind:value={$cell}
      onblur={() => {
        editing = false;
      }}
      rows="1"
      wrap="off"
      autocorrect="off"
      autocapitalize="none"
      autocapitalization="none"
      autocomplete="off"
      spellcheck="false"
    ></textarea>
  {:else if $cell instanceof Element}
    <div bind:this={innerNode} class="element"></div>
  {:else}
    <div class="text">{$cell}</div>
  {/if}
</td>
