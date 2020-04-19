<script>
  export let display;
  import ModalInternals from "./ModalInternals.svelte";

  let closeModal = false;
  const handleClose = () => {
    display = false;
  };
</script>

{#if display}
  <ModalInternals on:close={handleClose} {closeModal}>
    <slot />
  </ModalInternals>
{/if}
