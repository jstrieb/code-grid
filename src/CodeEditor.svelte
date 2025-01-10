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

  function indent(s) {
    return "  " + s.split("\n").join("\n  ");
  }

  function dedent(s) {
    return s.replace(/^(  |\t)/gm, "");
  }

  function keydown(e) {
    const textarea = e.target;
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    switch (e.key.toLocaleLowerCase()) {
      case "tab":
        e.preventDefault();
        if (e.shiftKey) {
          const lineStart = value.lastIndexOf("\n", start) + 1;
          textarea.setRangeText(
            dedent(value.slice(lineStart, end)),
            lineStart,
            end,
            "preserve",
          );
        } else {
          if (start == end) {
            textarea.setRangeText("  ", start, end, "end");
          } else {
            const lineStart = value.lastIndexOf("\n", start) + 1;
            textarea.setRangeText(
              indent(value.slice(lineStart, end)),
              lineStart,
              end,
              "preserve",
            );
          }
        }
        break;
    }
  }
</script>

<textarea
  bind:this={editor}
  bind:value={code}
  onkeydown={keydown}
  wrap="off"
  autocorrect="off"
  autocapitalize="none"
  autocomplete="off"
  spellcheck="false"
  {...rest}
></textarea>
