<style>
  textarea {
    resize: none;
    border: 1px solid var(--fg-color);
    padding: 0.25em;
    font-family: monospace, monospace;
    white-space: pre;
    overflow: auto;
  }
</style>

<script>
  let { editor = $bindable(), code = $bindable(""), ...rest } = $props();
</script>

<textarea bind:this={editor} bind:value={code} {...rest}></textarea>
