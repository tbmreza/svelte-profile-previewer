<script>
  export let closeModal;
  import { createEventDispatcher, onDestroy } from "svelte";

  const dispatch = createEventDispatcher();
  const dispatchClose = () => dispatch("close");

  $: if (closeModal) {
    dispatchClose();
  }

  let modal;

  const handleKeydown = e => {
    if (e.key === "Escape") {
      console.log("handle keydown");
      dispatchClose();
      return;
    }

    if (e.key === "Tab") {
      const nodes = modal.querySelectorAll("*");
      const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);

      let index = tabbable.indexOf(document.activeElement);
      if (index === -1 && e.shiftKey) index = 0;

      index += tabbable.length + (e.shiftKey ? -1 : 1);
      index %= tabbable.length;

      tabbable[index].focus();
      e.preventDefault();
    }
  };

  const previouslyFocused =
    typeof document !== "undefined" && document.activeElement;

  if (previouslyFocused) {
    onDestroy(() => {
      previouslyFocused.focus();
    });
  }
</script>

<style>
  .modal-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
  }

  .modal {
    position: fixed;
    left: 50%;
    top: 50%;
    width: calc(100vw - 4em);
    max-width: 32em;
    max-height: calc(100vh - 4em);
    overflow: auto;
    transform: translate(-50%, -50%);
    padding: 1em;
    border-radius: 0.2em;
    background: whitesmoke;
  }
</style>

<svelte:window on:keydown={handleKeydown} />
<div class="modal-background" on:click={dispatchClose} />

<div class="modal" role="dialog" aria-modal="true" bind:this={modal}>
  <slot />
</div>
