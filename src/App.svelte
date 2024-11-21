<style>
  /* Container element for App.svelte */
  :global(body) {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    gap: 0.5em;
  }

  .scroll {
    overflow: auto;
    flex-grow: 1;
    /* Padding so the box shadows do not get cut off */
    padding-bottom: 5px;
    padding-right: 5px;
    /* Prevents scrolling from triggering pull-down refresh on mobile */
    overscroll-behavior: none;
  }

  .tabs {
    margin-bottom: calc(-0.5em);
    max-width: max-content;
    position: relative;
  }

  .bottombar {
    margin: -0.5em;
    padding: 0.25em;
    border-top: 1px solid var(--fg-color);
    min-height: max-content;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: baseline;
    gap: 1ch;
  }

  .status {
    display: flex;
    flex-direction: row;
    gap: 1ch;
  }
</style>

<script>
  import Button from "./Button.svelte";
  import Table from "./Table.svelte";
  import Tabs from "./Tabs.svelte";

  import { State, Sheet } from "./classes.svelte.js";

  let globals = $state(
    new State([
      new Sheet("Sheet 1", 18, 18, (i, j) => i * 18 + j),
      new Sheet("Other Sheet", 35, 10, (i, j) => `${i},${j}`),
      new Sheet(
        "Sheet three with a very long name",
        100,
        300,
        (i, j) => `${i},${j}`,
      ),
    ]),
  );
  let table = $state();
</script>

<svelte:body
  onmousedown={(e) => {
    // Only deselect if clicking outside of the table
    if (table.contains(e.target)) {
      return;
    }
    globals.deselect();
  }}
/>

<div class="tabs">
  <Tabs
    tabs={globals.sheets.map((s) => s.name)}
    bind:value={globals.currentSheetIndex}
  />
</div>

<div class="scroll">
  <Table bind:globals bind:table />
</div>

<div class="bottombar">
  <Button
    style="min-width: 1.5em;"
    onclick={() => {
      /* TODO */
      alert("TODO: Help");
    }}>?</Button
  >
  <div style="flex-grow: 1;"><!-- Spacer --></div>
  <div class="status">
    {#if globals.selected.type}
      {@const sum = globals
        .getSelectedCells()
        .flat()
        .map((cell) => cell.get())
        .reduce((a, x) => a + x, 0)}
      <span>Average: {sum / globals.getSelectedCells().flat().length},</span>
      <span>Sum: {sum}</span>
    {/if}
  </div>
</div>
