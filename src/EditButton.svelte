<script>
  import Icon from "svelte-awesome";
  import { edit } from "svelte-awesome/icons";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  const dispatchClickEdit = () => dispatch("clickEdit");
</script>

<style>
  .i {
    display: inline-block;
    background-color: floralwhite;
    margin-left: 2px;
    cursor: pointer;
    border-radius: 5px;
  }
  .i:hover {
    background-color: cornsilk;
  }
</style>

<div class="i" on:click={dispatchClickEdit}>
  <Icon data={edit} scale="1.2" />
</div>
