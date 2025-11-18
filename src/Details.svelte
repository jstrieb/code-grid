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

  /* Cover left details border near summary */
  /*
  details[open] summary::before {
    content: "";
    display: inline-block;
    width: 3px;
    height: 1.5em;
    position: absolute;
    left: -1px;
    background: var(--bg-color);
    z-index: 1;
  }
  */

  button {
    position: absolute;
    top: -0.25em;
    bottom: -0.25em;
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
    border-left: 1px dashed var(--fg-color);
  }

  button div::before {
    content: "";
    width: 1em;
    height: 5px;
    border-top: 1px dashed var(--fg-color);
    position: absolute;
    top: 0;
    cursor: pointer;
  }

  button div::after {
    content: "";
    width: 1em;
    height: 5px;
    border-bottom: 1px dashed var(--fg-color);
    position: absolute;
    bottom: 0;
    cursor: pointer;
  }

  button:hover div {
    border-left: 2px solid var(--fg-color);
  }

  button:hover div::before {
    border-top: 2px solid var(--fg-color);
  }

  button:hover div::after {
    border-bottom: 2px solid var(--fg-color);
  }

  button:active div {
    border-left: 3px solid var(--fg-color);
  }

  button:active div::before {
    border-top: 3px solid var(--fg-color);
  }

  button:active div::after {
    border-bottom: 3px solid var(--fg-color);
  }
</style>

<script>
  let { summary, children, style, open = $bindable(), ...rest } = $props();
  let details;
</script>

<details bind:this={details} bind:open {...rest}>
  <summary>
    {#if summary}
      {@render summary()}
    {:else}
      Details
    {/if}
  </summary>

  <div {style}>
    {@render children?.()}
  </div>

  <button
    aria-label="Collapse details"
    onclick={() => details.removeAttribute("open")}><div></div></button
  >
</details>
