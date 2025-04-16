<style>
  .container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    flex-grow: 1;
    overflow: hidden;
  }

  .numbers {
    font-family: monospace, monospace;
    padding: calc(0.25em + 1px);
    text-align: right;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
  }

  textarea {
    resize: none;
    border: 1px solid var(--fg-color);
    padding: 0.25em;
    font-family: monospace, monospace;
    white-space: pre;
    overflow: auto;
    flex-grow: 1;
  }
</style>

<script>
  import { handleButtonInsertBlur } from "./helpers.js";

  let { editor = $bindable(), code = $bindable(""), ...rest } = $props();
  let lineNumbers = $state();

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
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          textarea.setRangeText(
            dedent(value.slice(lineStart, end)),
            lineStart,
            end,
            start == end ? "end" : "preserve",
          );
        } else {
          if (start == end) {
            textarea.setRangeText("  ", start, end, "end");
          } else {
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            textarea.setRangeText(
              indent(value.slice(lineStart, end)),
              lineStart,
              end,
              "preserve",
            );
          }
        }
        break;
      case "enter":
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const numTabs =
          (value
            .slice(lineStart)
            .replace(/\t/g, "  ")
            .match(/^(  )*/g) || [""])[0].length / 2;
        textarea.setRangeText("\n" + "  ".repeat(numTabs), start, end, "end");
        e.preventDefault();
        // setRangeText doesn't cause Svelte to automatically update bind:value
        // for textareas, so the following line is required to force update the
        // code variable (and thereby set the correct line numbering).
        code = textarea.value;
        break;
    }
  }

  function syncScroll(e) {
    if (lineNumbers == null) return;
    lineNumbers.scrollTop = e.target.scrollTop;
  }
</script>

<div class="container">
  <div class="numbers" bind:this={lineNumbers}>
    {#each code.split("\n") as _, i}
      <div>{i + 1}</div>
    {/each}
    <div style="min-height: 5em"></div>
  </div>
  <textarea
    bind:this={editor}
    bind:value={code}
    onkeydown={keydown}
    onscroll={syncScroll}
    onblur={handleButtonInsertBlur}
    wrap="off"
    autocorrect="off"
    autocapitalize="none"
    autocomplete="off"
    spellcheck="false"
    {...rest}
  ></textarea>
</div>
