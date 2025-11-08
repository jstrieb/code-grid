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
        text: "First item",
        onclick: (e) => alert("Foo"),
      },
      {
        text: "Second item",
        onclick: (e) => alert("Bar"),
      },
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
    background: none;
    /* TODO: Keep? Adjust? */
    width: 300px;
    max-width: calc(100vw - 2em);
  }
</style>

<script>
  import ShyMenu from "./ShyMenu.svelte";
  import { nextZIndex } from "./helpers.js";
  import { tick } from "svelte";

  const {
    menu: contextMenu,
    clickable: rightClickable,
    children,
    ...rest
  } = $props();

  let menuX = $state(),
    menuY = $state(),
    menuWidth = $state(0),
    menuHeight = $state(0),
    menuElement = $state();

  function wrap(handler) {
    return async (e) => {
      handler(e);

      // Wait for the menu to be created and populated so we can get its height
      await tick();

      const { top: parentTop, left: parentLeft } =
        e.target.offsetParent.getBoundingClientRect();
      for (
        menuX = e.clientX - parentLeft;
        menuX + menuWidth > document.body.offsetWidth && menuX > menuWidth;
        menuX -= menuWidth
      ) {}
      for (
        menuY = e.clientY - parentTop;
        menuY + menuHeight > document.body.offsetHeight && menuY > menuHeight;
        menuY -= menuHeight
      ) {}
    };
  }
</script>

<ShyMenu ...rest>
  {#snippet menu(builder)}
    <div
      bind:this={menuElement}
      class="menu"
      style:left="{menuX}px"
      style:top="{menuY}px"
      style:z-index={nextZIndex()}
      bind:offsetWidth={menuWidth}
      bind:offsetHeight={menuHeight}
    >
      {@render contextMenu?.(builder)}
    </div>
  {/snippet}
  {#snippet clickable(handler)}
    {@render rightClickable?.(wrap(handler))}
  {/snippet}
  {@render children?.()}
</ShyMenu>
