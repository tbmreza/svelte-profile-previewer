<script>
  import Icon from "svelte-awesome";
  import { plus } from "svelte-awesome/icons";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  const dispatchClickAdd = () => dispatch("clickAdd");

  const rule = `
    color: steelblue;
    cursor: pointer;"
  `;
</script>

<style>
  .i {
    margin: 1em 0.5em 0.5em;
    border-radius: 5px;
  }
</style>

<div class="i" on:click={dispatchClickAdd}>
  <Icon data={plus} scale="2" style={rule} />
</div>
