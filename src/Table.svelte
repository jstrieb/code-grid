<style>
  table {
    border-collapse: collapse;
    border-spacing: 0;
    box-shadow: 4px 4px 0 0 var(--fg-color);
  }
</style>

<script>
  import Cell from "./Cell.svelte";

  const { cells, widths, heights, selected } = $props();
</script>

<table>
  <tbody>
    {#each cells as row, i (i)}
      <tr>
        {#each row as cell, j (j)}
          <Cell
            {cell}
            {selected}
            width={widths[j]}
            height={heights[i]}
            row={i}
            col={j}
          />
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
