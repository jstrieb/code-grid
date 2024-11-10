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
  import { writable } from "svelte/store";

  function newArray(length, f = (x) => x) {
    return new Array(length).fill(undefined).map(f);
  }

  const INIT_ROWS = 20,
    INIT_COLS = 20;

  let sheets = $state([
    {
      name: "Sheet 1",
      cells: newArray(INIT_ROWS, (_, i) =>
        newArray(INIT_COLS, (_, j) => writable(`${i},${j}`)),
      ),
      widths: newArray(INIT_COLS, () => 56),
      heights: newArray(INIT_ROWS, () => 24),
    },
    {
      name: "Other sheet",
      cells: newArray(30, (_, i) =>
        newArray(10, (_, j) => writable(`${i},${j}`)),
      ),
      widths: newArray(10, () => 56),
      heights: newArray(30, () => 24),
    },
    {
      name: "Sheet three with a very long name",
      cells: newArray(300, (_, i) =>
        newArray(100, (_, j) => writable(`${i},${j}`)),
      ),
      widths: newArray(100, () => 32),
      heights: newArray(300, () => 32),
    },
  ]);
  let currentSheet = $state(0);

  const unselected = { start: {}, end: {} };
  const selected = writable({ ...unselected });

  let table = $state();
</script>

<svelte:body
  onmousedown={(e) => {
    // Only deselect if clicking outside of the table
    if (table.contains(e.target)) {
      return;
    }
    $selected = { ...unselected };
  }}
/>

<div class="tabs">
  <Tabs tabs={sheets.map((s) => s.name)} bind:value={currentSheet} />
</div>
<div class="scroll">
  <Table
    {selected}
    cells={sheets[currentSheet].cells}
    bind:widths={sheets[currentSheet].widths}
    bind:heights={sheets[currentSheet].heights}
    bind:table
  />
</div>
