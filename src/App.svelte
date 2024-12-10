<style>
  /* Container element for App.svelte */
  :global(body) {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    gap: 0.5em;
    overflow: hidden;
  }

  .scroll {
    overflow: auto;
    flex-grow: 1;
    /* Padding so the box shadows do not get cut off */
    padding-bottom: 5px;
    padding-right: 5px;
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
    align-items: center;
    gap: 1ch;
  }

  .status {
    display: flex;
    flex-direction: row;
    gap: 1ch;
  }

  kbd {
    padding: 0 0.5ch;
    box-shadow: 1px 1px 0 0 var(--fg-color);
    border: 1px solid var(--fg-color);
    margin: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: monospace, monospace;
  }
</style>

<script>
  import Button from "./Button.svelte";
  import Details from "./Details.svelte";
  import Dialog from "./Dialog.svelte";
  import Table from "./Table.svelte";
  import Tabs from "./Tabs.svelte";

  import { State, Sheet } from "./classes.svelte.js";
  import { keyboardHandler, keybindings } from "./keyboard.svelte.js";

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
  let table = $state();

  function prettyPrintKey(key) {
    switch (key) {
      case "arrowleft":
        return "&larr;";
      case "arrowright":
        return "&rarr;";
      case "arrowup":
        return "&uarr;";
      case "arrowdown":
        return "&darr;";
    }
    if (key.length > 1) {
      return key[0].toLocaleUpperCase() + key.slice(1);
    }
    return key;
  }
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

<Dialog bind:open={globals.helpOpen}>
  <div
    style="display: flex; flex-direction: column; gap: 0.5em; padding: 0.5em;"
  >
    <p>
      Code Grid is a spreadsheet built for programmers. You can extend it with
      your own formula functions that execute in the browser. Formula functions
      can create HTML elements.
    </p>
    <Details>
      {#snippet summary()}Tutorial{/snippet}
      TODO
    </Details>
    <Details>
      {#snippet summary()}Keybindings{/snippet}
      <ul style="margin-left: 1.5em; white-space: pre;">
        {#each Object.entries(keybindings) as [combo, name]}
          <li>
            <div
              style="display: flex; flex-direction: row; justify-content: flex-start; align-items: center; gap: 0.25ch;"
            >
              {#each combo.split("+") as key, i}
                <kbd>{@html prettyPrintKey(key)}</kbd
                >{#if i < combo.split("+").length - 1}+{/if}
              {/each} &ndash; {name}
            </div>
          </li>
        {/each}
      </ul>
    </Details>
    <Details>
      {#snippet summary()}Formula functions{/snippet}
      <p>TODO</p>
    </Details>
  </div>
</Dialog>

<div class="bottombar">
  <Button
    style="min-width: 1.5em;"
    onclick={() => (globals.helpOpen = !globals.helpOpen)}>?</Button
  >
  <div style="flex-grow: 1;"><!-- Spacer --></div>
  <div class="status">
    <span>{globals.keyQueue.join("")}</span>
    <span>-- {globals.mode.toLocaleUpperCase()} --</span>
  </div>
</div>
