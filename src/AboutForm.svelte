<script>
  import { about } from "./stores.js";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  const dispatchCloseForm = () => {
    dispatch("closeForm");
  };

  let draft = $about;

  const clickSave = () => {
    $about = draft;
    dispatchCloseForm();
  };
</script>

<style>
  .textarea--full-width {
    width: 100%;
  }
  .actions {
    float: right;
  }
</style>

<button class="btn" on:click={dispatchCloseForm}>Cancel</button>

<textarea class="textarea--full-width" bind:value={draft} />

<div class="actions">
  <button class="btn" on:click={clickSave}>Save changes</button>
</div>
