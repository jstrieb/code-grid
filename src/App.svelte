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

  .keyboardbar {
    margin: 0 -0.5em;
    padding: 0.25em;
    border-top: 1px solid var(--fg-color);
    min-height: max-content;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: center;
    gap: 0.5ch;
    width: 100%;
    position: absolute;
    z-index: 19;
    overflow-x: auto;
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
  import FormulaBar from "./FormulaBar.svelte";
  import SaveLoad from "./SaveLoad.svelte";
  import Settings from "./Settings.svelte";
  import ShyMenu from "./ShyMenu.svelte";
  import Table from "./Table.svelte";
  import Tabs from "./Tabs.svelte";

  import { State, Sheet } from "./classes.svelte.js";
  import { compressText } from "./compress.js";
  import { evalDebounced, functions } from "./formula-functions.svelte.js";
  import { debounce, replaceValues } from "./helpers.js";
  import { keyboardHandler, keybindings } from "./keyboard.js";

  let { urlData } = $props();
  let globals = $state(
    load(urlData) ?? new State([new Sheet("Sheet 1", 10, 10)]),
  );
  let table = $state();
  let startHeight = $state(0);
  let scrollArea = $state();
  let imageData = $state();

  // svelte-ignore state_referenced_locally
  if (!urlData) {
    globals.helpOpen = true;
    globals.editorOpen = true;
  }

  function load(dataString) {
    let data;
    if (!dataString && window.location.hash) {
      // TODO: Remove
      // Temporary compatibility measure to not break old, uncompressed links
      try {
        data = JSON.parse(atob(window.location.hash.slice(1)));
      } catch (e) {
        return undefined;
      }
    } else if (!dataString) {
      return undefined;
    } else {
      try {
        data = JSON.parse(dataString);
      } catch {
        return undefined;
      }
    }
    return State.load(data);
  }

  let dontSave = $state(false);
  const save = debounce((data) => {
    imageData = JSON.stringify(data, replaceValues);
    if (dontSave) {
      dontSave = false;
      return;
    }
    // TODO: Save to local storage
    const compressed = compressText(imageData);
    try {
      window.history.pushState(data, "", "#" + compressed);
    } catch {
      // TODO: Figure out a way to push state where values are unclonable (e.g.,
      // HTMLElements)
      window.history.pushState(undefined, "", "#" + compressed);
    }
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

  Object.entries(window.localStorage)
    .filter(([k, _]) => k.startsWith("settings."))
    .map(([k, v]) => [k.replace(/^settings\./, ""), JSON.parse(v)])
    .forEach(([k, v]) => {
      globals.settings[k] = v;
    });
  $effect(() => {
    Object.entries(globals.settings).forEach(([k, v]) => {
      window.localStorage.setItem(`settings.${k}`, JSON.stringify(v));
    });
  });

  // Focus the editor when the dialog is opened
  // TODO: Is there a better place to put this?
  // TODO: If the editor is open, but the text area is defocused, focus on the
  // text area when the shortcut key is pressed
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

  let innerHeight = $state(window.innerHeight);
  let visualBottom = $state(window.visualViewport.height);
  window.visualViewport.addEventListener("resize", () => {
    visualBottom = window.visualViewport.height;
  });

  function insertText(s) {
    return;
  }
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
    if (e.state == null) {
      return;
    }
    dontSave = true;
    globals = Object.assign(State.load(e.state), {
      currentSheetIndex: globals.currentSheetIndex,
      mode: globals.mode,
      helpOpen: globals.helpOpen,
      editorOpen: globals.editorOpen,
      imageOpen: globals.imageOpen,
      elements: globals.elements,
      pasteBuffer: globals.pasteBuffer,
    });
  }}
  bind:innerHeight
/>

<div>
  <FormulaBar bind:globals bind:editor={globals.elements.formulaBar} />
</div>

<div class="tabs">
  <Tabs bind:globals bind:value={globals.currentSheetIndex} />
</div>

<div
  bind:this={scrollArea}
  class="scroll"
  onpointerdown={(e) => {
    // Only deselect if clicking outside of the table, and inside the scroll
    // area
    if (e.target != scrollArea) {
      return;
    }
    globals.deselect();
  }}
>
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
  <CodeEditor bind:editor bind:code={globals.formulaCode} />
  {#if codeError}
    <p style="white-space: pre; overflow-x: auto; flex-shrink: 0;">
      {codeError}
    </p>
  {/if}
</Dialog>

<Dialog top={150} left={150} bind:open={globals.imageOpen}>
  <div
    style="display: flex; flex-direction: column; gap: 0.5em; padding: 0.5em;"
  >
    <SaveLoad bind:globals {imageData} />
  </div>
</Dialog>

<Dialog top={100} left={100} bind:open={globals.helpOpen}>
  <div
    style="display: flex; flex-direction: column; gap: 1.5em; padding: 0.5em;"
  >
    <p>
      Code Grid is a spreadsheet built for programmers. You can extend it with
      your own formula functions that execute in the browser. Formula functions
      can create HTML elements.
    </p>
    <Details open>
      {#snippet summary()}Tutorial{/snippet}
      <p>Tutorial TODO</p>
      <p>
        Go to <a
          href="https://github.com/jstrieb/code-grid#api-documentation"
          target="_blank">the GitHub README</a
        > for an introduction.
      </p>
      <p>
        In the README, there are also several <a
          href="https://github.com/jstrieb/code-grid#examples"
          target="_blank">example spreadsheets</a
        > showcasing some of Code Grid's unique capabilities.
      </p>
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
    <Details>
      {#snippet summary()}Settings{/snippet}
      <Settings bind:globals />
    </Details>
  </div>
</Dialog>

{#snippet insertTextButton(text)}
  <Button
    onpointerdown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }}
    onpointerup={(e) => {
      const textarea = document.activeElement;
      textarea?.setRangeText?.(
        text,
        textarea.selectionStart,
        textarea.selectionEnd,
        "end",
      );
      // Event (with bubbling) is necessary for Svelte reactive variables to
      // update to match the textarea value
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }}
    square
    style="height: 2em;"
    shadow="2px">{text}</Button
  >
{/snippet}
{#if innerHeight > visualBottom}
  <div
    class="keyboardbar"
    style:top="calc({visualBottom}px - 2em - 2 * 0.25em - 2px)"
  >
    {@render insertTextButton("=")}
    {@render insertTextButton("(")}
    {@render insertTextButton(")")}
    {@render insertTextButton("[")}
    {@render insertTextButton("]")}
    {@render insertTextButton("+")}
    {@render insertTextButton("-")}
    {@render insertTextButton("*")}
    {@render insertTextButton("/")}
    {@render insertTextButton('"')}
    {@render insertTextButton("{")}
    {@render insertTextButton("}")}
    {@render insertTextButton(";")}
    {@render insertTextButton(">")}
    {@render insertTextButton("<")}
    {@render insertTextButton(":")}
    {@render insertTextButton("?")}
  </div>
{/if}

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
            text: "Help & Settings",
            onclick: () => (globals.helpOpen = !globals.helpOpen),
          },
          {
            text: "Save and Load Spreadsheet as Image",
            onclick: () => (globals.imageOpen = !globals.imageOpen),
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
      <Button square onclick={handler} style="height: 1.5em;">=</Button>
    {/snippet}
  </ShyMenu>
  <div style="flex-grow: 1;"><!-- Spacer --></div>
  <div class="status">
    <span>{globals.keyQueue.join("")}</span>
    <span>-- {globals.mode.toLocaleUpperCase()} --</span>
  </div>
</div>
