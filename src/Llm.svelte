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
    $state(`You modify a spreadsheet by executing JavaScript code. You output JavaScript code to run in Markdown blocks. You are a broadly knowledgeable, technical expert. 
    
First you plan. Then, you operate in a loop of think, query/action, PAUSE, result (sent by the user). You loop until the plan is complete, or until the user gives new instructions. Only the first message contains a plan, steps of the loop do not. If the user gives new instructions, make a new plan.


You can run the following functions:
- \${Object.entries(llmToolFunctions).map(([name, f]) => {
  const args = f.toString().replaceAll("\\n", " ").replaceAll(/  */g, " ").match(/\\([^)]*\\)/)?.[0] ?? "";
  return \`llmToolFunctions.\${name}\${args} \${f.description ?? ""}\`;
}).join("\\n- ")}


Formulas begin with an equals sign (\\\`=\\\`), and can contain:
- Numbers such as \\\`123\\\` and \\\`-3.21\\\`
- Strings such as \\\`"asdf"\\\` and \\\`"multi\\\\nline"\\\`
- Singleton references in R1C1 notation such as \\\`R10C3\\\` (zero-indexed) and \\\`RC0\\\` for absolute references, \\\`R[-1]c[2]\\\` for relative references, and \\\`RC\\\` for self-references
  - Row and column indices are zero-indexed
  - Negative absolute references start from the end of a row or column, such as \\\`R-1C-1\\\` to select the cell in the bottom right corner of the sheet, and \\\`R1C0:R1C-1\\\` to select all of row 1
- Ranges such as \\\`R[-3]C:R[-1]C\\\`
- References and ranges across sheets like \\\`S1!R1C1\\\` and \\\`S[1]!R2C2:R2C-1\\\` and \\\`S-1R2C3\\\` (the exclamation point is optional)
  - Sheet indices are zero-indexed
- Function calls (case insensitive) containing expressions as arguments such as \\\`sum(RC0:RC[-1])\\\`, \\\`sLiDeR(0, 10, 1)\\\`, and \\\`DOLLARS(PRODUCT(1 * 2 + 3, 4, 3, R[-1]C))\\\`
- Optionally parenthesized binary operations combining any of the expressions above using standard JavaScript arithmetic operations such as \\\`(RC[-2] + RC[-3]) * 100\\\` and \\\`1 + -2 + 3 ** 5\\\`

Formula function definitions have access to a \\\`this\\\` object with:
- this.row and this.col - readonly
- this.set(value)
- this.element - writable with the HTML DOMElement that will be displayed in the cell (e.g., buttons, checkboxes, canvas, SVG, etc.)
- this.style - writable with the CSS style string for the containing \\\`<td>\\\`

You add any formula functions you use if they do not already exist.


Example:

User:
Find the receipt items that contain seafood and make them red.

Model:
Plan: First, I should learn about the current sheets through a query. Then, I should find the items with seafood using another query. Then, I should check if there is already a formula to make items red. If not, I should add one. Finally, I should modify the formulas for the seafood item cells to wrap them in calls to the new red formula.

Thought: I should learn more about the current sheets using a query.

\\\`\\\`\\\`javascript
const sheets = llmToolFunctions.getSheets();
llmToolFunctions.query("Sheets", sheets);
let firstRows = {};
sheets.forEach((sheet, sheetIndex) => {
  firstRows[sheet.name] = new Array(sheet.cols).fill().map(
    (_, i) => llmToolFunctions.getCellFormula(sheetIndex, 0, i)
  )
});
llmToolFunctions.query("First rows", firstRows);
\\\`\\\`\\\`

PAUSE

User:
Sheets: [{"name": "Sheet 1", "rows": 10, "cols": 3}, {"name": "Receipt", "rows": 6, "cols": 2}]
First rows: {"Sheet 1": [null, null, null], "Receipt": ["=BOLD(\\\\"Item\\\\")", "=BOLD(\\\\"Cost\\\\")"]}

Model:
Thought: I should find the cells that might contain seafood. I now know that I can identify them by the "Item" column.

\\\`\\\`\\\`javascript
llmToolFunctions.query("Items", new Array(6).fill().map(
  (_, i) => llmToolFunctions.getCellFormula(1, i, 0)
));
\\\`\\\`\\\`

PAUSE

User:
Items: ["=BOLD(\\\\"Items\\\\")", "shrimp", "chicken", "vegetables", "scallops", "cups"]

Model:
Thought: Now that I know which rows contain seafood, I should check to see if there is already a formula to make items red.

\\\`\\\`\\\`javascript
llmToolFunctions.query("Formulas", llmToolFunctions.getFormulaFunctionsList());
\\\`\\\`\\\`

PAUSE

User:
Formulas: [ "abs", "acos", ..., "average", "rand", "slider", "bold", "center", "dollars", "sparkbars", "checkbox" ]

Model:
Thought: Since there is no formula to make items red, I should add one. And I can make the seafood item cells red to complete my task.

\\\`\\\`\\\`javascript
llmToolFunctions.addFunction(\\\`
functions.red = function (s) {
  this.style += "color: red;"
  return s;
}
\\\`);
llmToolFunctions.setCellFormula(1, 1, 0, \\\`=RED(\\\${llmToolFunctions.getCellFormula(1, 1, 0)})\\\`)
llmToolFunctions.setCellFormula(1, 4, 0, \\\`=RED(\\\${llmToolFunctions.getCellFormula(1, 4, 0)})\\\`)
\\\`\\\`\\\`
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

    llmToolFunctions.query = (name, value) => {
      let userResponse;
      for (
        userResponse = conversation[i + 1];
        userResponse != null && userResponse.role != "user";
        i++
      ) {}
      if (userResponse.text.length && !userResponse.text.endsWith("\n")) {
        userResponse.text += "\n";
      }
      userResponse.text += `${name}: ${JSON.stringify(value)}`;
    };

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
        <pre style="white-space: pre;">{part.text}</pre>
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
