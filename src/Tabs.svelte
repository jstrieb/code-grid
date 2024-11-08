<style>
  .tabs {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 0.4em;
  }

  button {
    padding: 0.35em;
    text-align: center;
    white-space: pre;
    text-overflow: ellipsis;
    border: 1px solid var(--fg-color);
    border-top: 0;
    cursor: pointer;
    box-shadow:
      3px 3px 0 0 var(--fg-color),
      3px 0 0 0 var(--fg-color);
    position: relative;
  }

  button:not(.selected)::before {
    content: "";
    width: calc(100% + 1em);
    border-top: 1px solid var(--fg-color);
    position: absolute;
    top: 0;
    left: -0.5em;
    right: 0.5em;
  }

  button:not(.selected):first-of-type::before,
  button:not(.selected):last-of-type::before {
    width: calc(100% + 0.5em);
  }

  button:not(.selected):first-of-type::before {
    left: 0;
  }

  button:not(.selected):last-of-type::before {
    right: 0;
  }

  /* Use box shadows instead of outlines to get three sides instead of four */
  button:hover {
    box-shadow:
      3px 3px 0 0 var(--fg-color),
      3px 0 0 0 var(--fg-color),
      inset -1px -1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color);
  }

  button:active {
    box-shadow:
      1px 1px 0 0 var(--fg-color),
      1px 0 0 0 var(--fg-color),
      inset -1px -1px 0 0 var(--fg-color),
      inset 1px 0 0 0 var(--fg-color);
  }
</style>

<script>
  let { tabs, value = $bindable(0) } = $props();
</script>

<div class="tabs">
  {#each tabs as tab, i}
    <button
      class:selected={i == value}
      onclick={() => {
        value = i;
      }}>{tab}</button
    >
  {/each}
</div>
