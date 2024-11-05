<style>
  td {
    border: 1px solid var(--fg-color);
    padding: calc(0.1em + 1px) calc(0.25em + 1px);
    text-align: center;
    user-select: none;
    -webkit-user-select: none;
  }

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

  /* 
    All these combinations are required to prevent the above classes from
    overwriting each other when multiple are true.

    Including the above four cases and the case where none are selected at all,
    there should be 2^4 == 16 total cases covered.
  */

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
