<style>
  button {
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    border: 1px solid var(--fg-color);
    box-shadow: 3px 3px 0 0 var(--fg-color);
    padding: 0.1em 0.2em;
    display: flex;
    justify-content: center;
    align-items: center;
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
    width: var(--width);
    height: var(--height);
    /* Space for the shadow so it doesn't get cut off */
    margin-right: 3px;
    margin-bottom: 3px;
  }

  button:hover {
    outline: 1px solid var(--fg-color);
  }

  button:active {
    box-shadow: 2px 2px 0 0 var(--fg-color);
  }

  button:disabled {
    cursor: not-allowed;
    --fg-color: var(--disabled-color);
    color: var(--fg-color);
    outline: none;
  }

  button:active:disabled {
    box-shadow: 3px 3px 0 0 var(--fg-color);
  }
</style>

<script>
  const { children, square = false, ...props } = $props();
  let width = $state("auto"),
    height = $state("auto");

  function resize(node) {
    if (!square) {
      return;
    }
    const { width: originalWidth, height: originalHeight } =
      node.getBoundingClientRect();
    /*
    if (originalWidth <= 0 && originalHeight <= 0) {
      // Happens if components are mounted in display: none containers.
      return;
    }
    */
    const max = `${Math.max(originalWidth, originalHeight)}px`;
    width = max;
    height = max;
  }
</script>

<button style:--width={width} style:--height={height} use:resize {...props}
  >{@render children?.()}</button
>
