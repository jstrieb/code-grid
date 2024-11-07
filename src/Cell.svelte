<style>
  td {
    border: 1px solid var(--fg-color);
    text-align: center;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
    white-space: pre;
    text-overflow: ellipsis;
    height: 24px;
    max-height: 24px;
    contain: size layout;
  }

  textarea {
    resize: none;
    border: 0;
    background: transparent;
    font-family: monospace, monospace;
    line-height: 1;
    white-space: pre;
    /* 
      This is ncessary to prevent the switch to textarea from reflowing the
      table cell (and by extension the row) a few pixels taller.
    */
    display: block;
    height: 100%;
    max-width: 100%;
    max-height: 24px;
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
  const { cell, row, col, selected } = $props();
  let top = $derived(Math.min($selected.start?.y, $selected.end?.y)),
    bottom = $derived(Math.max($selected.start?.y, $selected.end?.y)),
    left = $derived(Math.min($selected.start?.x, $selected.end?.x)),
    right = $derived(Math.max($selected.start?.x, $selected.end?.x));
  let contained = $derived(
    top <= row && row <= bottom && left <= col && col <= right,
  );
  let editing = $state(false);

  function focus(e) {
    e.focus();
  }
</script>

<td
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
    $selected.end = { x: col, y: row };
  }}
  onmousedown={(e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    $selected.start = { x: col, y: row };
    $selected.end = { x: col, y: row };
  }}
  ondblclick={(e) => {
    editing =
      contained &&
      $selected.start.x == $selected.end.x &&
      $selected.start.y == $selected.end.y;
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
  {:else}
    {$cell}
  {/if}
</td>
