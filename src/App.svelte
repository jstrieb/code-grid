<script>
  import Table from "./Table.svelte";
  import { writable } from "svelte/store";

  function newArray(length, f = (x) => x) {
    return new Array(length).fill(undefined).map(f);
  }

  const cells = newArray(10, (_, i) => newArray(20, (_, j) => `${i},${j}`));
  let selected = $state({});
</script>

<svelte:window
  onmousedown={() => {
    selected = {};
  }}
/>

<Table {cells} bind:selected />
