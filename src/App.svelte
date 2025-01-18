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

  pre {
    font-family: monospace, monospace;
    white-space: pre;
    margin-bottom: 1em;
    tab-size: 4ch;
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
  import { evalDebounced, functions } from "./formula-functions.svelte.js";
  import { debounce } from "./helpers.js";
  import { keyboardHandler, keybindings } from "./keyboard.js";

  let globals = $state(
    load(atob(window.location.hash.slice(1) ?? "")) ??
      new State([new Sheet("Sheet 1", 10, 10, (i, j) => undefined)]),
  );
  let table = $state();
  let startHeight = $state(0);

  function load(dataString) {
    if (!dataString) {
      return undefined;
    }
    let data;
    try {
      data = JSON.parse(dataString);
    } catch {
      return undefined;
    }
    return State.load(data);
  }

  let dontSave = $state(false);
  const save = debounce((data) => {
    if (dontSave) {
      dontSave = false;
      return;
    }
    // TODO: Save to local storage
    window.history.pushState(data, "", "#" + btoa(JSON.stringify(data)));
  }, 1000);
  $effect(() => {
    save({
      sheets: [
        // Spreads necessary for reactivity
        ...globals.sheets.map((sheet) => ({
          name: sheet.name,
          widths: [...sheet.widths],
          heights: [...sheet.heights],
          // TODO: Transpose for better compression
          cells: [
            ...sheet.cells.map((row) =>
              row.map((cell) => ({
                formula: cell.formula,
                value: cell.get(),
              })),
            ),
          ],
        })),
      ],
      formulaCode: globals.formulaCode,
    });
  });

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

  let codeError = $state("");
  $effect(() => {
    evalDebounced(globals.formulaCode, (result) => {
      codeError = result ?? "";
    });
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

<svelte:window
  onkeydown={(e) => keyboardHandler(e, globals)}
  onpopstate={(e) => {
    dontSave = true;
    globals = Object.assign(State.load(e.state), {
      currentSheetIndex: globals.currentSheetIndex,
      mode: globals.mode,
      helpOpen: globals.helpOpen,
      editorOpen: globals.editorOpen,
    });
  }}
/>

<svelte:body
  onpointerdown={(e) => {
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

<Dialog
  bind:open={globals.editorOpen}
  style="display: flex; flex-direction: column; align-items: stretch; overflow: hidden; gap: 0.25em;"
>
  <CodeEditor
    bind:editor
    bind:code={globals.formulaCode}
    style="flex-grow: 1;"
  />
  {#if codeError}
    <p style="white-space: pre; overflow-x: auto;">{codeError}</p>
  {/if}
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
      <ul style:list-style="none">
        {#each Object.keys(functions).sort() as formula}
          <li>
            <Details>
              {#snippet summary()}<span style:font-family="monospace, monospace"
                  >{formula}</span
                >{/snippet}
              <pre>{functions[formula]?.toString()}</pre>
            </Details>
          </li>
        {/each}
      </ul>
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
            text: "New Spreadsheet",
            onclick: () =>
              Object.assign(document.createElement("a"), {
                href: Object.assign(new URL(window.location), { hash: "" }),
                target: "_blank",
              }).click(),
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
