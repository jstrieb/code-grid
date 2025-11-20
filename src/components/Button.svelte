<style>
  button {
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    border: 1px solid var(--fg-color);
    box-shadow: var(--shadow, 3px) var(--shadow, 3px) 0 0 var(--fg-color);
    padding: 0.1em 0.2em;
    display: flex;
    justify-content: center;
    align-items: center;
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: max-content;
    /* Space for the shadow so it doesn't get cut off */
    margin-right: var(--shadow, 3px);
    margin-bottom: var(--shadow, 3px);
  }

  button:hover {
    outline: 1px solid var(--fg-color);
  }

  button:active {
    box-shadow: calc(var(--shadow, 3px) * 2 / 3)
      calc(var(--shadow, 3px) * 2 / 3) 0 0 var(--fg-color);
  }

  button:disabled {
    cursor: not-allowed;
    --fg-color: var(--disabled-color);
    color: var(--fg-color);
    outline: none;
  }

  button:active:disabled {
    box-shadow: var(--shadow, 3px) var(--shadow, 3px) 0 0 var(--fg-color);
  }

  .square {
    aspect-ratio: 1 / 1;
  }
</style>

<script>
  const { children, shadow = "3px", square = false, ...props } = $props();
</script>

<button class:square style:--shadow={shadow} {...props}
  >{@render children?.()}</button
>
