<style>
  table {
    border-collapse: collapse;
    box-shadow: 4px 4px 0 0 var(--fg-color);
    table-layout: fixed;
  }
</style>

<script>
  import Cell from "./Cell.svelte";

  const { cells, selected } = $props();
</script>

<table>
  <tbody>
    {#each cells as row, i}
      <tr>
        {#each row as cell, j}
          <Cell {cell} {selected} row={i} col={j} />
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
