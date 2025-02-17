<script>
  import Menu from "./Menu.svelte";

  import { keyEventToString } from "./keyboard.js";

  const { menu, clickable, children, ...rest } = $props();

  const globalHideEvents = ["pointerdown", "keydown", "resize"];

  let show = $state(false),
    menuElement = $state();

  function hasAncestor(node, check) {
    if (node == null) return false;
    if (node.parentNode == check) return true;
    return hasAncestor(node.parentNode, check);
  }

  function hide(e) {
    switch (e.type) {
      case "keydown":
        switch (keyEventToString(e)) {
          case undefined:
          case "tab":
          case "Shift+tab":
            // TODO: Handle focus within context menu
            return;
        }
        break;
      case "pointerdown":
        if (hasAncestor(e.target, menuElement)) {
          return;
        }
    }
    e.preventDefault();
    show = false;
    globalHideEvents.forEach((type) => window.removeEventListener(type, hide));
  }

  function handler(e) {
    show = true;
    e.preventDefault();
    globalHideEvents.forEach((type) => window.addEventListener(type, hide));
  }
</script>

{#snippet menuBuilder(menuData)}
  <Menu
    bind:menu={menuElement}
    entries={menuData.map((entry) => {
      const onclick = entry.onclick;
      entry.onclick = (e) => {
        onclick(e);
        hide(e);
      };
      return entry;
    })}
  />
{/snippet}

{#if show}
  {@render menu?.(menuBuilder)}
{/if}
{@render clickable?.(handler)}
{@render children?.()}
