<style>
  td {
    border: 1px solid var(--fg-color);
    padding: 0.1em 0.25em;
    text-align: center;
    user-select: none;
    -webkit-user-select: none;
  }

  .left {
    border-left: 2px solid var(--fg-color);
  }

  .right {
    border-right: 2px solid var(--fg-color);
  }

  .top {
    border-top: 2px solid var(--fg-color);
  }

  .bottom {
    border-bottom: 2px solid var(--fg-color);
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
</script>

<td
  class:left={contained && left == col}
  class:right={contained && right == col}
  class:top={contained && top == row}
  class:bottom={contained && bottom == row}
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
    e.preventDefault();
    $selected.start = { x: col, y: row };
    $selected.end = { x: col, y: row };
  }}>{cell}</td
>
