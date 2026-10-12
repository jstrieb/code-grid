<style>
  .row {
    display: flex;
    align-items: center;
    gap: 1ch;
  }
</style>

<script>
  import Button from "./components/Button.svelte";
  import NumericInput from "./components/NumericInput.svelte";

  let { globals } = $props();

  $effect(() => {
    document
      .querySelector(`meta[name="viewport"]`)
      .setAttribute(
        "content",
        `width=device-width, initial-scale=${globals.settings.mobileZoom / 100}`,
      );
  });
</script>

<div>
  Mobile Zoom
  <div class="row">
    <Button
      square
      style="width: 1.5em; flex-shrink: 0;"
      onclick={() => {
        globals.settings.mobileZoom -= 5;
      }}>-</Button
    >
    <NumericInput
      bind:value={globals.settings.mobileZoom}
      min="0"
      max="100"
      step="5"
      style="width: 10ch; text-align: center;"
    />
    <Button
      square
      style="width: 1.5em; flex-shrink: 0;"
      onclick={() => {
        globals.settings.mobileZoom += 5;
      }}>+</Button
    >
  </div>
</div>
