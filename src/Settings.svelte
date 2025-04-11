<script>
  import NumericInput from "./NumericInput.svelte";

  let { globals = $bindable() } = $props();

  $effect(() => {
    document
      .querySelector(`meta[name="viewport"]`)
      .setAttribute(
        "content",
        `width=device-width, initial-scale=${globals.settings.mobileZoom}`,
      );
  });
</script>

<ul>
  <li>
    <label
      >Mobile Zoom <NumericInput
        bind:value={globals.settings.mobileZoom}
        min="0"
        max="10"
        step="0.05"
        style="width: 10ch;"
      /></label
    >
  </li>
</ul>
