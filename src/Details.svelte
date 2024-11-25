<style>
  details {
    position: relative;
  }

  details[open] {
    margin-left: 0.25em;
    padding-left: 0.5em;
  }

  details > div {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    gap: 0.5em;
  }

  summary {
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
  }

  details[open] summary {
    margin-bottom: 0.25em;
  }

  button {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -5px;
    width: 10px;
    border: 0;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: stretch;
    background: none;
  }

  button div {
    width: 0;
    border-left: 1px solid var(--fg-color);
  }

  button:hover div {
    border-left: 2px solid var(--fg-color);
  }

  button:active div {
    border-left: 3px solid var(--fg-color);
  }
</style>

<script>
  let { summary, children, ...rest } = $props();
  let details;
</script>

<details bind:this={details} {...rest}>
  <summary>
    {#if summary}
      {@render summary()}
    {:else}
      Details
    {/if}
  </summary>

  <div>
    {@render children()}
  </div>

  <button
    aria-label="Collapse details"
    onclick={() => details.removeAttribute("open")}><div></div></button
  >
</details>
