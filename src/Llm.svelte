<style>
  div,
  label {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  pre,
  textarea {
    font-family: monospace, monospace;
    border: 1px solid var(--fg-color);
    overflow: auto;
    white-space: pre-line;
    padding: 0.25em;
    min-height: 5em;
    height: 5em;
    flex-grow: 1;
    flex-shrink: 1;
    resize: vertical;
  }

  input[type="password"] {
    border: 1px solid var(--fg-color);
    padding: 0.25em;
  }

  .row {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 1ch;
  }

  .buttons {
    flex-shrink: 1;
    flex-grow: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 1em;
    margin-top: -0.75em;
  }
</style>

<script>
  import Button from "./Button.svelte";
  import Details from "./Details.svelte";
  import Select from "./Select.svelte";

  // May appear unused, but actually used during evals
  import { llmToolFunctions, llmModels } from "./llm.svelte.js";
  import { functions as formulaFunctions } from "./formula-functions.svelte";

  let { globals } = $props();
  let response = $state();
  let modelName = $state("Gemini");
  let prompt = $state("");
  let template =
    $state(`You modify a spreadsheet by executing JavaScript code. You only output JavaScript code. You do not output any explanation or comments. You are concise and succinct. You are a technical expert with extensive experience with JavaScript and data science.

You have access to the following functions:
- \${Object.entries(llmToolFunctions).map(([name, f]) => {
  const args = f.toString().replaceAll("\\n", " ").replaceAll(/  */g, " ").match(/\\([^)]*\\)/)?.[0] ?? "";
  return \`llmToolFunctions.\${name}\${args} \${f.description ?? ""}\`;
}).join("\\n- ")}

Spreadsheet formulas use R1C1 notation. Row and column indices start at 0. Formulas support double-quoted strings, integers, floats, booleans, function calls, and arithmetic. Formulas begin with \\\`=\\\` unless they only contain a single number. Anything that is not a nubmer or formula is a string. Formulas can call custom functions defined in JavaScript. Formula functions receive parsed arguments. Cell formatting is handled by formulas (for example the \\\`BOLD\\\` formula will make the cell bold by editing this.style).

Formula functions have access to a \\\`this\\\` object with:
- this.row and this.col - readonly
- this.set(value)
- this.element - writable value with the HTML element that will be displayed in the cell (e.g., buttons, checkboxes, canvas, SVG, etc.)
- this.style - writable value with the CSS style string for the containing \\\`<td>\\\`

To register formula functions, they must be assigned to the functions object like: "functions.formula_name = function() {}". Create any formulas necessary.

The currently available formula functions are all of the JavaScript Math.* functions and: \${Object.keys(formulaFunctions).filter(k => !(k in Math)).join(", ")}.

Available spreadsheets: 
\${
  globals.sheets.map(
    (sheet, i) => \`\${i}. "\${sheet.name}" - \${sheet.heights.length} rows, \${sheet.widths.length} cols\`
  ).join('\\n')
}
`);
  let llmCode = $state("");

  // Need to call eval in a separate function from derived.by to ensure globals,
  // functions, and prompt are in-scope
  function evaluate(t, { formulaFunctions, globals, prompt }) {
    return eval(`\`${t}\``);
  }

  let systemPrompt = $derived.by(() => {
    try {
      return evaluate(template, { formulaFunctions, globals, prompt });
    } catch (e) {
      return `Error: ${e?.message ?? e ?? ""}`;
    }
  });

  async function submit() {
    response = llmModels[modelName].request(prompt, systemPrompt, {
      apiKey: llmModels[modelName].apiKey,
    });
    // TODO: Fix race condition if the button is pushed multiple times
    llmCode = await response;
  }

  function execute() {
    llmToolFunctions.globals = globals;
    eval(
      llmCode +
        // Allows user code to show up in the devtools debugger as "llm-code.js"
        "\n//# sourceURL=llm-code.js",
    );
    delete llmToolFunctions.globals;
  }
</script>

<h1>Edit Spreadsheets with Large Language Models ("AI")</h1>

<Details open>
  {#snippet summary()}Configure Model{/snippet}

  <Select bind:value={modelName}>
    {#each Object.keys(llmModels) as model}
      <option value={model}>{model}</option>
    {/each}
  </Select>
  <label>
    API Key
    <div class="row">
      <input
        type="password"
        bind:value={llmModels[modelName].apiKey}
        style="flex-grow: 1;"
      />
      <!-- TODO -->
      <!-- <Button>Save</Button> -->
    </div>
  </label>
</Details>

<Details>
  {#snippet summary()}Configure Prompt{/snippet}
  <div>
    <p>Template</p>
    <textarea bind:value={template}></textarea>
  </div>

  <div>
    <p>System prompt</p>
    <pre>{systemPrompt}</pre>
  </div>
</Details>

<div>
  <p>Prompt</p>
  <textarea
    class="prompt"
    placeholder="Make a simple budget spreadsheet template"
    bind:value={prompt}
  ></textarea>
</div>

<div class="buttons"><Button onclick={submit}>Submit</Button></div>

{#if response}
  <h1>LLM Response</h1>
  {#await response}
    <p>Loading...</p>
  {:then}
    <textarea bind:value={llmCode} style:min-height="10em" style:flex-grow="2"
    ></textarea>
    <div class="buttons"><Button onclick={execute}>Execute</Button></div>
    <!-- TODO: Add error display if evaluated code throws -->
  {:catch e}
    <p>Error: {e?.message ?? e}</p>
  {/await}
{/if}
