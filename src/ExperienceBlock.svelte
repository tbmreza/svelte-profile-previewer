<script>
  export let hoverPointer = false;
  export let xp;
  import { blockId } from "./stores";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  const clickBlock = () => {
    $blockId = xp.id;
    dispatch("clickBlock");
  };
</script>

<style>
  .block {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
    background-image: linear-gradient(floralwhite, cornsilk);
    margin-bottom: 0.5em;
    padding: 0.5em 0 0.5em 0.5em;
    border-radius: 4px;
    cursor: default;
  }
  .block--edit:hover {
    cursor: pointer;
  }
  .block__title {
    display: inline;
    font-weight: 600;
  }
  .block__term {
    float: right;
    margin-right: 1em;
    font-size: 0.8em;
    font-style: italic;
  }
  .block__caption {
    margin-top: 0;
  }
  .block__desc {
    font-size: 0.8em;
  }
</style>

<div class="block" class:block--edit={hoverPointer} on:click={clickBlock}>
  <p class="block__title">{xp.title}</p>
  <p class="block__term">
    {xp.start.slice(0, 4)}–{xp.end.present ? 'present' : xp.end.endDate.slice(0, 4)}
  </p>
  <p class="block__caption">{xp.location} &#183; {xp.employment}</p>
  <p class="block__desc">{xp.desc}</p>
</div>
