<!--
  @component

  To use this component, put any right-clickable children in a
  `clickable(handler)` snippet and then call `handler(event)` from a
  right-click event handler on one or more of the child elements. Children
  outside of a `clickable` snippet will still be rendered, but the `handler` to
  make the context menu appear will not be in scope.

  Within the component, define a `menu(builder)` snippet to create the menu
  that is displayed upon right click. This snippet can optionally choose to
  render the `builder` snippet with a list of objects as the argument -- one
  object in the list for each action in the context menu. For example:

  ``` svelte
  <ContextMenu>
  {#snippet menu(builder)}
    {@render builder([
      {
        // TODO: Object data here
      }
    ])}
  {/snippet}
  {#snippet clickable(rightClickHandler)}
    <p oncontextmenu={rightClickHandler}>Right clickable!</p>
  {/snippet}
  <p>Not right clickable.</p>
  </ContextMenu>
  ```
-->

<style>
  .menu {
    position: absolute;
    top: var(--menuY);
    left: var(--menuX);
    z-index: 20;
    /* TODO: Keep? Adjust? */
    width: min(300px, 100% - 1em);
  }
</style>

<script>
  import { keyEventToString } from "./keyboard.js";

  import { tick } from "svelte";

  const { menu, clickable, children, ...rest } = $props();

  const globalHideEvents = ["pointerdown", "keydown", "resize"];

  let show = $state(false);
  let menuX = $state(),
    menuY = $state(),
    menuWidth = $state(0),
    menuHeight = $state(0),
    menuElement = $state();

  function hasAncestor(node, check) {
    if (node == null) return false;
    if (node.parentNode == check) return true;
    return hasAncestor(node.parentNode, check);
  }

  function hide(e) {
    switch (event.type) {
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

  async function handler(e) {
    show = true;
    e.preventDefault();
    globalHideEvents.forEach((type) => window.addEventListener(type, hide));

    // Wait for the menu to be created and populated so we can get its height
    await tick();

    for (
      menuX = e.clientX;
      menuX + menuWidth > document.body.offsetWidth;
      menuX -= menuWidth
    ) {}
    for (
      menuY = e.clientY;
      menuY + menuHeight > document.body.offsetHeight;
      menuY -= menuHeight
    ) {}
  }
</script>

{#snippet menuBuilder(menuData)}
  {#each menuData as item}
    <!-- TODO -->
    <p>{JSON.stringify(item)}</p>
  {/each}
{/snippet}

{#if show}
  <div
    bind:this={menuElement}
    class="menu"
    style:--menuX="{menuX}px"
    style:--menuY="{menuY}px"
    bind:offsetWidth={menuWidth}
    bind:offsetHeight={menuHeight}
    {...rest}
  >
    {@render menu?.(menuBuilder)}
  </div>
{/if}
{@render clickable?.(handler)}
{@render children?.()}
