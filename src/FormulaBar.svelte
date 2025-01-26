<style>
  label {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 1ch;
  }

  textarea {
    flex-grow: 1;
    font-family: monospace, monospace;
    resize: none;
    border: 1px solid var(--fg-color);
    box-shadow: 3px 3px 0 0 var(--fg-color);
    padding: 0.2em 0.5em;
    /* Space for the shadow so it doesn't get cut off */
    margin-right: 3px;
    margin-bottom: 3px;
  }

  textarea:focus {
    box-shadow: 2px 2px 0 0 var(--fg-color);
    outline: 1px solid var(--fg-color);
  }

  textarea:disabled {
    color: var(--selected-color);
    box-shadow: 3px 3px 0 0 var(--selected-color);
    border-color: var(--selected-color);
  }
</style>

<script>
  let { globals, editor = $bindable() } = $props();
  let selection = $derived(globals.selected);
  let sheet = $derived(globals.currentSheet);

  let textValue = $state(),
    placeholder = $state(),
    focused = $state();

  $effect(() => {
    if (focused) {
      globals.mode = "insert";
    }
  });

  $effect(() => {
    switch (selection.type) {
      case "cell":
        if (selection.isSingleton()) {
          textValue = sheet.cells[selection.start.y][selection.start.x].formula;
          placeholder = undefined;
        } else {
          textValue = undefined;
          placeholder = "Multiple cells selected";
        }
        break;
      case "row":
      case "col":
        textValue = undefined;
        placeholder = "Multiple cells selected";
        break;
      default:
        textValue = undefined;
        placeholder = "No cells selected";
        break;
    }
  });

  $effect(() => {
    switch (selection.type) {
      case "cell":
        if (selection.isSingleton()) {
          sheet.cells[selection.start.y][selection.start.x].formula = textValue;
          placeholder = undefined;
        } else {
          textValue = undefined;
          placeholder = "Multiple cells selected";
        }
        break;
      case "row":
      case "col":
        textValue = undefined;
        placeholder = "Multiple cells selected";
        break;
      default:
        textValue = undefined;
        placeholder = "No cells selected";
        break;
    }
  });

  function selectionToString(s) {
    const { min, max } = s;
    switch (s.type) {
      case "cell":
        if (s.isSingleton()) {
          return `R${max.y}C${max.x}`;
        } else {
          return `R${min.y}C${min.x}:R${max.y}C${max.x}`;
        }
        break;
      case "row":
        return `R${min}C0:R${max}C-1`;
        break;
      case "col":
        return `R0C${min}:R-1C${max}`;
        break;
    }
  }
</script>

<label>
  {selectionToString(selection)}
  <textarea
    bind:this={editor}
    bind:focused
    bind:value={textValue}
    {placeholder}
    disabled={placeholder}
    rows="1"
    wrap="off"
    autocorrect="off"
    autocapitalize="none"
    autocapitalization="none"
    autocomplete="off"
    spellcheck="false"
  ></textarea>
</label>
