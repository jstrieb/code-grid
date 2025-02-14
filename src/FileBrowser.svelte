<style>
  label,
  label > span {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    cursor: pointer;
  }

  label > span {
    flex-direction: row;
    flex-grow: 1;
  }

  input {
    display: none;
  }

  .boxed {
    flex-grow: 1;
    border: 1px solid var(--fg-color);
    box-shadow: 3px 3px 0 0 var(--fg-color);
    padding: 0.2em 0.5em;
    /* Space for the shadow so it doesn't get cut off */
    margin-bottom: 3px;
  }

  .filename {
    margin-left: -4px;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
    white-space: pre;
    user-select: none;
    -webkit-user-select: none;
  }

  .filename:hover {
    outline: 1px solid var(--fg-color);
  }

  .filename:active {
    box-shadow: 2px 2px 0 0 var(--fg-color);
  }
</style>

<script>
  import Button from "./Button.svelte";

  let { files = $bindable(), children, ...restProps } = $props();

  let dragging = $state(false);
  let input = $state();
</script>

<label
  ondrop={(e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = false;
    if (e.dataTransfer.files) {
      files = e.dataTransfer.files;
    }
  }}
  ondragover={(e) => {
    // Prevent default here is necessary to allow drop
    e.preventDefault();
    dragging = true;
  }}
  ondragend={(e) => {
    dragging = false;
  }}
  ondragleave={(e) => {
    dragging = false;
  }}
>
  {@render children?.()}
  {#if dragging}
    <div class="boxed">Drop file</div>
  {:else}
    <span>
      <Button
        style="padding: 0.2em 0.5em;"
        onclick={() => {
          input?.click();
        }}
      >
        Browse...
      </Button>
      <span class="boxed filename">{files?.[0]?.name}</span>
    </span>
  {/if}
  <input type="file" bind:files bind:this={input} {...restProps} />
</label>
