<style>
  /* Container element for App.svelte */
  :global(body),
  .main {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    gap: 0.5em;
    overflow: hidden;
    max-height: 100%;
    max-width: 100%;
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
    position: relative;
  }

  .startmenu {
    background: none;
    position: absolute;
    top: calc(-1 * var(--height));
    width: 300px;
    max-width: 100vw - 2em;
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
  import CodeEditor from "./CodeEditor.svelte";
  import Details from "./Details.svelte";
  import Dialog from "./Dialog.svelte";
  import ShyMenu from "./ShyMenu.svelte";
  import Table from "./Table.svelte";
  import Tabs from "./Tabs.svelte";

  import { State, Sheet } from "./classes.svelte.js";
  import { keyboardHandler, keybindings } from "./keyboard.js";

  let globals = $state(
    new State([
      new Sheet("Sheet 1", 18, 18, (i, j) => undefined),
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
  let startHeight = $state(0);

  // Focus the editor when the dialog is opened
  // TODO: Is there a better place to put this?
  // TODO: If the editor is open, but the text area is defocused, focus on the
  // text area when the equals key is pressed
  let editor = $state();
  $effect(() => {
    if (globals.editorOpen) {
      editor?.focus();
    }
  });
</script>

{#snippet printKey(key)}
  {#if key == "arrowleft"}
    &larr;
  {:else if key == "arrowright"}
    &rarr;
  {:else if key == "arrowup"}
    &uarr;
  {:else if key == "arrowdown"}
    &darr;
  {:else if key.length > 1}
    {key[0].toLocaleUpperCase() + key.slice(1)}
  {:else}
    {key}
  {/if}
{/snippet}

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
  <Tabs bind:globals bind:value={globals.currentSheetIndex} />
</div>

<div class="scroll">
  <!-- 
    Set --width and --height default values because if Table is in a Dialog, it
    will inherit the width and height of the dialog for table cells.
  -->
  <Table bind:globals bind:table --width="auto" --height="auto" />
</div>

<Dialog bind:open={globals.editorOpen} style="overflow: hidden;">
  <CodeEditor bind:editor bind:code={globals.formulaCode} />
</Dialog>

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
                <kbd>{@render printKey(key)}</kbd
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
  <ShyMenu>
    {#snippet menu(builder)}
      <div
        class="startmenu"
        bind:offsetHeight={startHeight}
        style:--height="{startHeight}px"
      >
        {@render builder([
          {
            text: "Help",
            onclick: () => (globals.helpOpen = !globals.helpOpen),
          },
          {
            text: "Code Editor",
            onclick: () => (globals.editorOpen = !globals.editorOpen),
          },
          {
            text: "Code Grid Source Code",
            onclick: () => {
              Object.assign(document.createElement("a"), {
                href: "https://github.com/jstrieb/code-grid",
                target: "_blank",
              }).click();
            },
          },
        ])}
      </div>
    {/snippet}
    {#snippet clickable(handler)}
      <Button square onclick={handler}>=</Button>
    {/snippet}
  </ShyMenu>
  <div style="flex-grow: 1;"><!-- Spacer --></div>
  <div class="status">
    <span>{globals.keyQueue.join("")}</span>
    <span>-- {globals.mode.toLocaleUpperCase()} --</span>
  </div>
</div>
