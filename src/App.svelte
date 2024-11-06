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
    min-height: 100%;
  }
</style>

<script>
  import Table from "./Table.svelte";
  import { writable } from "svelte/store";

  function newArray(length, f = (x) => x) {
    return new Array(length).fill(undefined).map(f);
  }

  const cells = newArray(20, (_, i) =>
    newArray(20, (_, j) => writable(`${i},${j}`)),
  );
  const unselected = { start: {}, end: {} };
  const selected = writable({ ...unselected });
</script>

<svelte:window
  onmousedown={() => {
    $selected = { ...unselected };
  }}
/>

<div class="scroll">
  <Table {cells} {selected} />
</div>
