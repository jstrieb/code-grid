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

  input[type="radio"] {
    display: none;
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
  let { tabs, value = $bindable(0) } = $props();

  let elements = $state(new Array(tabs.length).fill());
  let scrollLeft = $state(0);
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
    <label class:selected={value == i} bind:this={elements[i]}
      ><input type="radio" bind:group={value} value={i} />{tab}</label
    >
  {/each}
  <div class="bottom-border"></div>
  <div class="bottom-border-gap"></div>
</div>
