<style>
  div {
    flex-grow: 1;
    display: flex;
    position: relative;
    --padding: 0.25em;
  }

  select {
    width: 100%;
    border: 1px solid var(--fg-color);
    padding: var(--padding);
    cursor: pointer;
  }

  div::after {
    content: "▼";
    position: absolute;
    top: var(--padding);
    right: var(--padding);
    transform: scale(0.75);
  }
</style>

<script>
  let { children, value = $bindable(), ...rest } = $props();
</script>

<div>
  <select bind:value {...rest}>
    {@render children?.()}
  </select>
</div>
