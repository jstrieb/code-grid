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
  import Button from "./components/Button.svelte";
  import CodeEditor from "./components/CodeEditor.svelte";
  import Details from "./components/Details.svelte";
  import Select from "./components/Select.svelte";

  // May appear unused, but actually used during evals
  import { llmToolFunctions, llmModels } from "./llm.svelte.js";
  import { functions as formulaFunctions } from "./formula-functions.svelte";

  let { globals } = $props();
  let responsePromise = $state();
  let modelName = $state("Gemini");
  let template =
    $state(`You modify a spreadsheet by executing Markdown JavaScript code blocks. You follow these rules exactly:
- You NEVER use the tool calling API or function calling API
- You always output JavaScript that will be executed
- You always refer to the \`llmToolFunctions\` object within that code 
- You always query for information (unless you are adding a new sheet)
- You try to do as many queries as possible in each block
- You always make row and column values start from 0
- You try to use formatting functions (like \`BOLD\` and \`DOLLARS\`) whenever possible
    
- First, you plan
  - Then you revise the plan to combine as many steps as possible
  - Ask follow up questions only about the plan; any later questions should be answered by queries
- Then, you operate in a loop:
  - First you think
  - Then you do as many queries or actions as you can do in one step
  - Then you PAUSE
  - Then the results of the queries or actions are returned by the user
- Loop until the plan is complete, or until the user gives new instructions 
  - Only the first message contains a plan, steps of the loop do not 
  - If the user gives new instructions, make a new plan


You can run the following JavaScript functions in code blocks:
- \${Object.entries(llmToolFunctions).map(([name, f]) => {
  const args = f.toString().replaceAll("\\n", " ").replaceAll(/  */g, " ").match(/\\([^)]*\\)/)?.[0] ?? "";
  return "llmToolFunctions." + name + args + " " + (f.description ?? "");
}).join("\\n- ")}


Spreadsheet formulas begin with an equals sign (\`=\`), and can contain:
- Numbers like \`123\` and \`-3.21\`
- Strings like \`"asdf"\` and \`"multi\\\\nline"\`
- Singleton references in R1C1 notation 
  - CRITICAL: Row and column indices are zero-indexed, so R0C0 is the top, left cell
  - Like \`R10C3\` (zero-indexed) and \`RC0\` for absolute references
  - Like \`R[-1]c[2]\` for relative references
  - Omit relative or absolute offsets like \`RC\` for self-references
  - Negative absolute references start from the end of a row or column, like \`R-1C-1\` to select the cell in the bottom right corner of the sheet, and \`R1C0:R1C-1\` to select all of row 1
- Ranges like \`R[-3]C:R[-1]C\`
- References and ranges across sheets like \`S1!R1C1\` and \`S[1]!R2C2:R2C-1\` and \`S-1R2C3\` (the exclamation point is optional)
  - Sheet indices are zero-indexed
- Function calls (case insensitive) containing expressions as arguments like \`sum(RC0:RC[-1])\`, \`sLiDeR(0, 10, 1)\`, and \`DOLLARS(PRODUCT(1 * 2 + 3, 4, 3, R[-1]C))\`
- Optionally parenthesized binary operations combining any of the expressions above using standard JavaScript infix operations like \`(RC[-2] + RC[-3]) * 100\` and \`1 + -2 + 3 ** 5\`

Formula function definitions have access to a \`this\` object with:
- this.row and this.col - readonly
- this.set(value)
- this.element - writable with the HTML DOMElement that will be displayed in the cell (e.g., buttons, checkboxes, canvas, SVG, etc.)
- this.style - writable with the CSS style string for the containing \`<td>\`

You add any formula functions you use if they do not already exist.


Example:

User:
Find the receipt items that contain seafood and make them red.

Model:
Plan: 
- I should learn about the current sheets through a query. 
- I should find the items with seafood using another query. 
- I should check if there is already a formula to make items red. 
  - If not, I should add one. 
- I should modify the formulas for the seafood item cells to wrap them in calls to the new red formula.

Thought: I should learn more about the current sheets using a query.

\`\`\`javascript
// Query the current sheets
const sheets = llmToolFunctions.getSheets();
llmToolFunctions.query("Sheets", sheets);
// Query the first rows of each sheet to learn about the columns
let firstRows = {};
sheets.forEach((sheet, sheetIndex) => {
  firstRows[sheet.name] = new Array(sheet.cols).fill().map(
    (_, i) => llmToolFunctions.getCell(sheetIndex, 0, i)
  )
});
llmToolFunctions.query("First rows", firstRows);
\`\`\`

User:
Sheets: [{"name": "Sheet 1", "rows": 10, "cols": 3}, {"name": "Receipt", "rows": 6, "cols": 2}]
First rows: {"Sheet 1": [{}, {}, {}], "Receipt": [{"formula": "=BOLD(\\\\"Item\\\\")", "value": "Item"}, {"formula": "=BOLD(\\\\"Cost\\\\")", "value": "Cost"}]}

Model:
Thought: I should find the cells that might contain seafood. I now know that I can identify them by the "Item" column.
Thought: I can also query the formulas at the same time to check and see if there is already a formula to make items red.

\`\`\`javascript
llmToolFunctions.query("Items", new Array(6).fill().map(
  (_, i) => llmToolFunctions.getCell(1, i, 0)
));
llmToolFunctions.query("Formulas", llmToolFunctions.getFormulaFunctionsList());
\`\`\`

User:
Items: [{"formula": "=BOLD(\\\\"Items\\\\")", "value": "Items"}, {"formula": "shrimp", "value": "shrimp"}, {"formula": "chicken", "value": "chicken"}, ... ]
Formulas: [ "abs", "acos", ..., "average", "rand", "slider", "bold", "center", "dollars", "sparkbars", "checkbox" ]

Model:
Thought: Since there is no formula to make items red, I should add one. And I can make the seafood item cells red to complete my task.

\`\`\`javascript
llmToolFunctions.addFunction(\`
functions.red = function (s) {
  this.style += "color: red;"
  return s;
}
\`);
llmToolFunctions.setCellFormula(1, 1, 0, \`=RED(\\\${llmToolFunctions.getCell(1, 1, 0).formula})\`)
llmToolFunctions.setCellFormula(1, 4, 0, \`=RED(\\\${llmToolFunctions.getCell(1, 4, 0).formula})\`)
\`\`\`
`);

  let conversation = $state([
    { role: "system", text: "" },
    { role: "user", text: "" },
  ]);

  // Need to call eval in a separate function from derived.by to ensure globals
  // and functions are in-scope
  function evaluate(t, { formulaFunctions, globals }) {
    return eval(`\`${t.replaceAll("`", "\\`")}\``);
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
          if (
            part.match(/^````*( *javascript *)?\n/) &&
            part.endsWith("\n```")
          ) {
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

  function execute(llmCode, codeIndex) {
    llmToolFunctions.globals = globals;

    llmToolFunctions.query = (name, value) => {
      let userResponse;
      let i = codeIndex;
      for (
        userResponse = conversation[++i];
        i < conversation.length && userResponse.role != "user";
        userResponse = conversation[++i]
      ) {}
      if (userResponse.text.length && !userResponse.text.endsWith("\n")) {
        userResponse.text += "\n";
      }
      userResponse.text += `${name}: ${JSON.stringify(value)}`;
    };

    // TODO: Display the error
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

  function oninput(slice) {
    return;
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
          onkeydown={(e) => {
            if (
              e.key.toLocaleLowerCase() == "enter" &&
              (e.ctrlKey || e.metaKey)
            ) {
              e.target.blur();
              submit(conversation.slice(0, i + 1));
            }
          }}
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
