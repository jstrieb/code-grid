<style>
  .tabs {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: flex-start;
    padding-left: calc(0.5em - 1px);
    padding-top: 3px;
    padding-right: 5px;
    gap: 0.5em;
    overflow: auto;
  }

  label {
    padding: 0.35em;
    text-align: center;
    white-space: pre;
    text-overflow: ellipsis;
    border: 1px solid var(--fg-color);
    border-bottom: 0;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    box-shadow: 3px 3px 0 0 var(--fg-color);
  }

  label.selected {
    box-shadow: 4px 4px 0 0 var(--fg-color);
  }

  label:hover {
    outline: 1px solid var(--fg-color);
  }

  label:active {
    outline: 1px solid var(--fg-color);
    box-shadow: 2px 2px 0 0 var(--fg-color);
  }

  input[type="text"] {
    border: 0;
  }

  input[type="radio"] {
    display: none;
  }

  button.add {
    border: 0;
    cursor: pointer;
    min-width: 1.25em;
  }

  /* 
    This ensures the tabs have a border, even when the table is scrolled down
    from the top. 
  */
  .bottom-border {
    width: 100%;
    height: 1px;
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    background: var(--fg-color);
    z-index: 3;
  }

  /*
    This ensures that there is no border under the selected tab so it's clear
    which tab is selected.
  */
  .bottom-border-gap {
    width: var(--border-cover-width);
    height: 1px;
    position: absolute;
    bottom: -1px;
    left: var(--border-cover-offset);
    right: 0;
    background: var(--bg-color);
    z-index: 3;
  }
</style>

<script>
  import ContextMenu from "./components/ContextMenu.svelte";

  let { globals = $bindable(), value = $bindable() } = $props();
  let tabs = $derived(globals.sheets.map((s) => s.name));

  let elements = $state(new Array(globals.sheets.length).fill());
  let scrollLeft = $state(0);
  let editTab = $state();

  function focus(node) {
    node.focus();
    node.select();
  }
</script>

<div
  onscroll={(e) => {
    scrollLeft = e.target.scrollLeft;
  }}
  class="tabs"
  style:--border-cover-width="{elements[value]?.offsetWidth - 2}px"
  style:--border-cover-offset="{elements[value]?.offsetLeft - scrollLeft + 1}px"
>
  {#each tabs as tab, i}
    <ContextMenu>
      {#snippet menu(builder)}
        {@render builder([
          {
            text: `Delete "${tab}"`,
            onclick: () => {
              if (globals.sheets.length <= 1) return;
              globals
                .deleteSheets(1, i)
                .forEach(({ cells }) =>
                  cells.flat(Infinity).forEach((cell) => cell.cleanup()),
                );
              value = Math.min(value, globals.sheets.length - 1);
            },
          },
          {
            text: "Rename",
            onclick: () => {
              editTab = i;
            },
          },
        ])}
      {/snippet}
      {#snippet clickable(handler)}
        <label
          oncontextmenu={handler}
          ondblclick={() => {
            editTab = i;
          }}
          class:selected={value == i}
          bind:this={elements[i]}
        >
          {#if editTab == i}
            <input
              type="text"
              bind:value={globals.sheets[i].name}
              use:focus
              onblur={() => (editTab = undefined)}
            />
          {:else}
            <input
              type="radio"
              bind:group={value}
              value={i}
              onclick={() => {
                globals.deselect();
              }}
            />{tab}
          {/if}
        </label>
      {/snippet}
    </ContextMenu>
  {/each}
  <label
    ><button
      class="add"
      onclick={() =>
        globals.addSheet(
          `Sheet ${globals.sheets.length + 1}`,
          5,
          5,
          undefined,
          undefined,
        )}>+</button
    ></label
  >
  <div class="bottom-border"></div>
  <div class="bottom-border-gap"></div>
</div>
