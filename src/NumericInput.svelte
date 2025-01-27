<style>
  input {
    padding: 0.1em 0.2em;
    border: 1px solid var(--fg-color);
    box-shadow: 3px 3px 0 0 var(--fg-color);
    /* Space for the shadow so it doesn't get cut off */
    margin-right: 3px;
    margin-bottom: 3px;
  }

  input:focus {
    outline: 1px solid var(--fg-color);
    box-shadow: 2px 2px 0 0 var(--fg-color);
  }

  /* Hide arrows */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
    display: none;
  }

  input[type="number"] {
    -moz-appearance: textfield;
  }

  input:disabled {
    cursor: not-allowed;
    --fg-color: var(--disabled-color);
    color: var(--fg-color);
  }
</style>

<script>
  let { value = $bindable(), ...props } = $props();
</script>

<input type="number" bind:value {...props} />
