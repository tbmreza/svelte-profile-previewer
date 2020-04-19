<script>
  export let section;

  import EditButton from "./EditButton.svelte";
  import Card from "./Card.svelte";
</script>

<style>
  h3 {
    user-select: none;
    display: inline-block;
  }
</style>

<Card>
  <h3>{section}</h3>
  <EditButton on:clickEdit />
  <slot />
</Card>
