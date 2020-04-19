<script>
  export let addNew = false;
  export let blockId = -1;
  import { xpList } from "./stores";
  import { objectCopy, findObjectInArrayById, schemaString } from "./utils";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  const dispatchCloseForm = () => {
    dispatch("closeForm");
  };

  // form data
  const placeholders = {
    title: "Android developer",
    employment: "Full-time",
    location: "SF",
    desc: "Build stuff."
  };

  const draftAddNew = {
    id: 0,
    title: "",
    employment: "",
    location: "",
    start: "2000-01-01",
    end: {
      present: false,
      endDate: "2000-01-01"
    },
    desc: ""
  };

  let draft;
  if (addNew) {
    draft = draftAddNew;
  } else {
    draft = objectCopy(findObjectInArrayById($xpList, blockId));
  }

  let currentRole = draft.end.present;

  // actions
  const clickSave = () => {
    draft.end.present = currentRole;
    const index = $xpList.findIndex(x => x.id === blockId);
    $xpList[index] = objectCopy(draft);
    dispatchCloseForm();
  };
  const clickDelete = () => {
    $xpList = $xpList.filter(x => x.id !== blockId);
    dispatchCloseForm();
  };
  const clickAdd = () => {
    draft.id = $xpList.length;
    draft.end.present = currentRole;
    $xpList = [...$xpList, draft];
    dispatchCloseForm();
  };
</script>

<style>
  .btn {
    border-radius: 4px;
  }
  .btn:hover {
    cursor: pointer;
  }
  .btn--danger {
    background-color: firebrick;
    color: lightyellow;
  }
  .btn--danger:hover {
    background-color: darkred;
  }
  .actions {
    float: right;
  }
  .textarea--full-width {
    width: 100%;
  }
  .fields__term {
    display: grid;
    grid-template-columns: 0.5fr 0.5fr 35%;
  }
  .current-role--inline input,
  .current-role--inline label {
    display: inline;
  }
</style>

<button class="btn" on:click={dispatchCloseForm}>Cancel</button>

<div class="fields">
  <label>Title:</label>
  <input
    placeholder={placeholders.title}
    type="text"
    bind:value={draft.title} />
  <label>Location:</label>
  <input
    placeholder={placeholders.location}
    type="text"
    bind:value={draft.location} />
  <label>Employment type:</label>
  <input
    placeholder={placeholders.employment}
    type="text"
    bind:value={draft.employment} />
  <div class="current-role--inline">
    <input id="present" type="checkbox" bind:checked={currentRole} />
    <label for="present">I am currently working in this role</label>
  </div>
  <div class="fields__term">
    <div>
      <label>Start:</label>
      <input type="date" bind:value={draft.start} />
    </div>
    <div>
      <label>End:</label>
      <input
        type="date"
        bind:value={draft.end.endDate}
        disabled={currentRole} />
    </div>
    <div />
  </div>
  <label>Description:</label>
  <textarea
    placeholder={placeholders.desc}
    class="textarea--full-width"
    rows="4"
    bind:value={draft.desc} />
</div>

<div class="actions">
  {#if addNew}
    <button class="btn" on:click={clickAdd}>Add experience</button>
  {:else}
    <button class="btn btn--danger" on:click={clickDelete}>
      Delete experience
    </button>
    <button class="btn" on:click={clickSave}>Save changes</button>
  {/if}
</div>
