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
  }

  button:hover {
    outline: 1px solid var(--fg-color);
  }

  button:active {
    box-shadow: 2px 2px 0 0 var(--fg-color);
  }
</style>

<script>
  const { children, ...props } = $props();
</script>

<button {...props}>{@render children?.()}</button>
