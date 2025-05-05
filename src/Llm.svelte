<style>
  div,
  label {
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
    flex-grow: 1;
    flex-shrink: 1;
  }

  textarea {
    resize: vertical;
    height: 8em;
  }

  input {
    border: 1px solid var(--fg-color);
    padding: 0.25em;
  }

  hr {
    border: 0;
    border-top: 1px dashed var(--fg-color);
    margin: 1em 0;
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
  }
</style>

<script>
  import Button from "./Button.svelte";
  import CodeEditor from "./CodeEditor.svelte";
  import Details from "./Details.svelte";
  import Select from "./Select.svelte";

  // May appear unused, but actually used during evals
  import { llmToolFunctions, llmModels } from "./llm.svelte.js";
  import { functions as formulaFunctions } from "./formula-functions.svelte";

  let { globals } = $props();
  let responsePromise = $state();
  let modelName = $state("Gemini");
  let template =
    $state(`You modify a spreadsheet by executing JavaScript code. You output JavaScript code in Markdown blocks. You do not output any explanation or comments. You are concise and succinct. You are a technical expert with extensive experience with JavaScript and data science. You query for more information if it would improve your response.

Formulas begin with an equals sign (\\\`=\\\`), and can contain:
- Numbers such as \\\`123\\\` and \\\`-3.21\\\`
- Strings such as \\\`"asdf"\\\` and \\\`"multi\\\\nline"\\\`
- Singleton references in R1C1 notation such as \\\`R10C3\\\` (zero-indexed) for absolute references, \\\`R[-1]c[2]\\\` for relative references, and \\\`RC\\\` for self-references
  - Negative absolute references start from the end of a row or column, such as \\\`R-1C-1\\\` to select the cell in the bottom right corner of the sheet, and \\\`R1C0:R1C-1\\\` to select all of row 1
- Ranges such as \\\`R[-3]C:R[-1]C\\\`
- References and ranges across sheets like \\\`S1!R1C1\\\` and \\\`S[1]!R2C2:R2C-1\\\` and \\\`S-1R2C3\\\` (the exclamation point is optional)
- Function calls (case insensitive) containing expressions as arguments such as \\\`sum(RC0:RC[-1])\\\`, \\\`sLiDeR(0, 10, 1)\\\`, and \\\`DOLLARS(PRODUCT(1 * 2 + 3, 4, 3, R[-1]C))\\\`
- Optionally parenthesized binary operations combining any of the expressions above such as \\\`(RC[-2] + RC[-3]) * 100\\\` and \\\`1 + -2 + 3 ** 5\\\`

Formula function definitions have access to a \\\`this\\\` object with:
- this.row and this.col - readonly
- this.set(value)
- this.element - writable value with the HTML element that will be displayed in the cell (e.g., buttons, checkboxes, canvas, SVG, etc.)
- this.style - writable value with the CSS style string for the containing \\\`<td>\\\`

You define any formula functions you use that do not already exist. To define formula functions, they must be assigned like: "functions.formula_name = function() {}" in a call to \\\`addFunction\\\`.

The currently available formula functions are all of the JavaScript Math.* functions and: \${Object.keys(formulaFunctions).filter(k => !(k in Math)).join(", ")}.

You can run the following functions:
- \${Object.entries(llmToolFunctions).map(([name, f]) => {
  const args = f.toString().replaceAll("\\n", " ").replaceAll(/  */g, " ").match(/\\([^)]*\\)/)?.[0] ?? "";
  return \`llmToolFunctions.\${name}\${args} \${f.description ?? ""}\`;
}).join("\\n- ")}

Available spreadsheets: 
\${
  globals.sheets.map(
    (sheet, i) => \`\${i}. "\${sheet.name}" - \${sheet.heights.length} rows, \${sheet.widths.length} cols\`
  ).join('\\n')
}
`);
  let conversation = $state([
    { role: "system", text: "" },
    { role: "user", text: "" },
  ]);

  // Need to call eval in a separate function from derived.by to ensure globals
  // and functions are in-scope
  function evaluate(t, { formulaFunctions, globals }) {
    return eval(`\`${t}\``);
  }

  $effect(() => {
    try {
      conversation[0].text = evaluate(template, { formulaFunctions, globals });
    } catch (e) {
      conversation[0].text = `Error: ${e?.message ?? e ?? ""}`;
    }
  });

  $effect(() => {
    if (conversation[conversation.length - 1].role != "user") {
      conversation.push({ role: "user", text: "" });
    }
  });

  async function submit(conversationSlice) {
    conversation = conversationSlice;
    responsePromise = llmModels[modelName]
      .request(conversationSlice)
      .then((parts) =>
        parts.map((part) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            return {
              role: "model",
              code: part
                .replaceAll(/(^````*( *javascript *)?\n)|(\n````*$)/g, "")
                .trim(),
            };
          } else {
            return {
              role: "model",
              text: part,
            };
          }
        }),
      )
      .then((parts) => {
        conversation = conversation.concat(parts);
      });
  }

  function execute(llmCode, i) {
    llmToolFunctions.globals = globals;
    eval(
      llmCode +
        // Allows user code to show up in the devtools debugger as "llm-code.js"
        "\n//# sourceURL=llm-code.js",
    );
    delete llmToolFunctions.globals;
  }

  function scrollIntoView(e) {
    e.scrollIntoView();
  }
</script>

<h1>Edit Spreadsheets with Large Language Models ("AI")</h1>

<Details open>
  {#snippet summary()}Configure Provider{/snippet}

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
  <label>
    Model
    <input type="text" bind:value={llmModels[modelName].model} />
  </label>
</Details>

<Details>
  {#snippet summary()}Configure Prompt{/snippet}
  <div>
    <p>Template</p>
    <textarea bind:value={template}></textarea>
  </div>
</Details>

<hr />

{#each conversation as part, i}
  {#if part.role == "system"}
    <div style="margin-left: 10%;">
      <Details open={part.text.startsWith("Error")}>
        {#snippet summary()}System prompt{/snippet}
        <pre>{part.text}</pre>
      </Details>
    </div>
  {:else if part.role == "user"}
    <div style="margin-left: 10%;">
      <Details open>
        {#snippet summary()}User{/snippet}
        <textarea
          placeholder={i == 1
            ? "Make a comprehensive budget spreadsheet for a 25 year old living in Manhattan and making $75k per year"
            : ""}
          bind:value={part.text}
        ></textarea>
        <div class="buttons">
          <Button onclick={() => submit(conversation.slice(0, i + 1))}
            >Submit</Button
          >
        </div>
      </Details>
    </div>
  {:else if part.role == "model"}
    <div use:scrollIntoView style="margin-right: 10%;">
      {#if part.code}
        <Details open>
          {#snippet summary()}Code{/snippet}
          <CodeEditor
            bind:code={part.code}
            style="min-height: 10em; resize: vertical;"
          ></CodeEditor>
          <div class="buttons">
            <Button onclick={() => execute(part.code, i)}>Execute</Button>
          </div>
        </Details>
      {:else}
        <Details open>
          {#snippet summary()}Text{/snippet}
          <pre class="message">{part.text}</pre>
        </Details>
      {/if}
    </div>
  {/if}
{/each}

{#await responsePromise}
  <p use:scrollIntoView>Loading...</p>
{:catch e}
  <p>Error: {e?.message ?? e}</p>
{/await}
