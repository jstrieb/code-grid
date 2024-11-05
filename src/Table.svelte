<style>
  table {
    border-collapse: collapse;
  }
</style>

<script>
  import Cell from "./Cell.svelte";

  let { cells, selected = $bindable() } = $props();
</script>

<table>
  <tbody>
    {#each cells as row, i}
      <tr>
        {#each row as cell, j}
          <Cell {cell} bind:selected row={i} col={j} />
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
