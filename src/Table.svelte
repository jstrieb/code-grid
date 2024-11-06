<style>
  table {
    border-collapse: collapse;
    border-spacing: 0;
    table-layout: fixed;
    box-shadow: 4px 4px 0 0 var(--fg-color);
  }

  tr {
    max-height: 1.5em;
  }
</style>

<script>
  import Cell from "./Cell.svelte";

  const { cells, selected } = $props();
</script>

<table style:width="calc({cells[0].length} * 7ch)">
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
