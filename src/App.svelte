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
    padding-bottom: 5px;
    padding-right: 5px;
    width: 100%;
    height: 100%;
    /* Prevents scrolling from triggering pull-down refresh on mobile */
    overscroll-behavior: none;
  }

  .tabs {
    margin-bottom: calc(-0.5em);
    max-width: max-content;
    position: relative;
  }
</style>

<script>
  import Table from "./Table.svelte";
  import Tabs from "./Tabs.svelte";

  import { Sheet } from "./classes.svelte.js";

  let sheets = $state([
    new Sheet("Sheet 1", 18, 18, (i, j) => `${i},${j}`),
    new Sheet("Other Sheet", 35, 10, (i, j) => `${i},${j}`),
    new Sheet(
      "Sheet three with a very long name",
      100,
      300,
      (i, j) => `${i},${j}`,
    ),
  ]);
  let currentSheet = $state(0);
  let table = $state();
</script>

<svelte:body
  onmousedown={(e) => {
    // Only deselect if clicking outside of the table
    if (table.contains(e.target)) {
      return;
    }
    sheets[currentSheet].deselect();
  }}
/>

<div class="tabs">
  <Tabs tabs={sheets.map((s) => s.name)} bind:value={currentSheet} />
</div>
<div class="scroll">
  <Table bind:sheet={sheets[currentSheet]} bind:table />
</div>
