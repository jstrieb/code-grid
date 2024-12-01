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
    flex-grow: 1;
    /* Padding so the box shadows do not get cut off */
    padding-bottom: 5px;
    padding-right: 5px;
    /* Prevents scrolling from triggering pull-down refresh on mobile */
    overscroll-behavior: none;
  }

  .tabs {
    margin-bottom: calc(-0.5em);
    max-width: max-content;
    position: relative;
  }

  .bottombar {
    margin: -0.5em;
    padding: 0.25em;
    border-top: 1px solid var(--fg-color);
    min-height: max-content;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: baseline;
    gap: 1ch;
  }

  .status {
    display: flex;
    flex-direction: row;
    gap: 1ch;
  }
</style>

<script>
  import Button from "./Button.svelte";
  import Details from "./Details.svelte";
  import Dialog from "./Dialog.svelte";
  import Table from "./Table.svelte";
  import Tabs from "./Tabs.svelte";

  import { State, Sheet } from "./classes.svelte.js";
  import { keyboardHandler } from "./keyboard.svelte.js";

  let globals = $state(
    new State([
      new Sheet("Sheet 1", 18, 18, (i, j) => i * 18 + j),
      new Sheet("Other Sheet", 35, 10, (i, j) => `${i},${j}`),
      new Sheet(
        "Sheet three with a very long name",
        100,
        300,
        (i, j) => `${i},${j}`,
      ),
    ]),
  );
  let helpOpen = $state(false);
  let table = $state();
</script>

<svelte:window onkeydown={(e) => keyboardHandler(e, globals)} />

<svelte:body
  onmousedown={(e) => {
    // Only deselect if clicking outside of the table
    if (table.contains(e.target)) {
      return;
    }
    globals.deselect();
  }}
/>

<div class="tabs">
  <Tabs
    tabs={globals.sheets.map((s) => s.name)}
    bind:value={globals.currentSheetIndex}
  />
</div>

<div class="scroll">
  <Table bind:globals bind:table />
</div>

<Dialog bind:open={helpOpen} style="max-width: min(80ch, 100%);">
  <div
    style="display: flex; flex-direction: column; gap: 0.5em; padding: 0.5em;"
  >
    <p>
      Code Grid is a spreadsheet built for programmers. You can extend it with
      your own formula functions that execute in the browser. Formula functions
      can create HTML elements.
    </p>
    <Details>
      {#snippet summary()}Keybindings{/snippet}
      <p>TODO</p>
    </Details>
    <Details>
      {#snippet summary()}Formulas{/snippet}
      <p>TODO</p>
    </Details>
    <Details>
      {#snippet summary()}All formula functions{/snippet}
      <p>TODO</p>
    </Details>
  </div>
</Dialog>

<div class="bottombar">
  <Button style="min-width: 1.5em;" onclick={() => (helpOpen = !helpOpen)}
    >?</Button
  >
  <div style="flex-grow: 1;"><!-- Spacer --></div>
  <div class="status">
    {globals.mode}
    <!-- 
    {#if globals.selected.type}
      {@const sum = globals
        .getSelectedCells()
        .flat()
        .map((cell) => cell.get())
        .reduce((a, x) => a + x, 0)}
      <span>Average: {sum / globals.getSelectedCells().flat().length},</span>
      <span>Sum: {sum}</span>
    {/if} 
    -->
  </div>
</div>
