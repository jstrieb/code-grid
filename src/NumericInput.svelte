<style>
  input {
    padding: 0.1em 0.2em;
    border: 1px solid var(--fg-color);
    box-shadow: 3px 3px 0 0 var(--fg-color);
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
</style>

<script>
  let { value = $bindable(), ...props } = $props();
</script>

<input type="number" bind:value {...props} />
