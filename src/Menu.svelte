<style>
  .menu {
    background: var(--bg-color);
    border: 1px solid var(--fg-color);
    box-shadow: 4px 4px 0 0 var(--fg-color);
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    /* Space to display shadow. */
    margin-right: 4px;
    margin-bottom: 4px;
  }

  button {
    border: 0;
    cursor: pointer;
    padding: 0.1em 0.2em;
    text-align: left;
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button:not(:last-child) {
    border-bottom: 1px solid var(--fg-color);
  }

  /* 
    TODO: Is inset box shadow the best way to represent? Note that outline
      doesn't work because it overflows the menu container, and gets clipped. 
  */
  button:hover {
    box-shadow:
      inset 1px 1px 0 0 var(--fg-color),
      inset -1px -1px 0 0 var(--fg-color);
  }
  button:active {
    box-shadow:
      inset 2px 2px 0 0 var(--fg-color),
      inset -2px -2px 0 0 var(--fg-color);
  }
</style>

<script>
  let { entries, menu = $bindable() } = $props();
</script>

<div class="menu" bind:this={menu}>
  {#each entries as entry}
    <button onclick={entry.onclick}>{entry.text}</button>
  {/each}
</div>
