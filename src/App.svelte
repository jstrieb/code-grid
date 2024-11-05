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
  }
</style>

<script>
  import Table from "./Table.svelte";
  import { writable } from "svelte/store";

  function newArray(length, f = (x) => x) {
    return new Array(length).fill(undefined).map(f);
  }

  const cells = newArray(100, (_, i) => newArray(20, (_, j) => `${i},${j}`));
  const selected = writable({});
</script>

<svelte:window
  onmousedown={() => {
    $selected = {};
  }}
/>

<div class="scroll">
  <Table {cells} {selected} />
</div>
