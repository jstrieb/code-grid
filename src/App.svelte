<style>
  /* Container element for App.svelte */
  :global(body) {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
  }

  .scroll {
    overflow: auto;
    flex-grow: 1;
  }
</style>

<script>
  import Table from "./Table.svelte";
  import { writable } from "svelte/store";

  function newArray(length, f = (x) => x) {
    return new Array(length).fill(undefined).map(f);
  }

  const INIT_ROWS = 20,
    INIT_COLS = 20;
  const cells = newArray(INIT_ROWS, (_, i) =>
    newArray(INIT_COLS, (_, j) => writable(`${i},${j}`)),
  );
  const unselected = { start: {}, end: {} };
  const selected = writable({ ...unselected });

  const widths = newArray(INIT_COLS, () => "56px"),
    heights = newArray(INIT_ROWS, () => "24px");
</script>

<svelte:window
  onmousedown={() => {
    $selected = { ...unselected };
  }}
/>

<div class="scroll">
  <Table {cells} {selected} {widths} {heights} />
</div>
