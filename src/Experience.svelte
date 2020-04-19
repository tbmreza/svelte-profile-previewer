<script>
  import Modal from "./Modal.svelte";
  import SectionCard from "./SectionCard.svelte";
  import ExperienceBlock from "./ExperienceBlock.svelte";
  import AddIcon from "./AddIcon.svelte";
  import ExperienceForm from "./ExperienceForm.svelte";
  import { xpList, blockId } from "./stores";

  let showMdl = false;
  let showMdlMdl = false;
  let addNew = false;

  const clickEdit = () => {
    showMdl = true;
  };
  const closeMdlMdl = () => {
    showMdlMdl = false;
  };
  const clickAdd = () => {
    addNew = true;
    showMdlMdl = true;
  };
  const clickBlock = () => {
    addNew = false;
    showMdlMdl = true;
  };
</script>

<!-- Experience section card -->
<SectionCard section="Experience" on:clickEdit={clickEdit}>
  {#each $xpList as xp}
    <ExperienceBlock {xp} />
  {/each}
</SectionCard>

<!-- Experience blocks -->
<Modal bind:display={showMdl}>
  {#each $xpList as xp}
    <ExperienceBlock {xp} hoverPointer on:clickBlock={clickBlock} />
  {/each}
  <AddIcon on:clickAdd={clickAdd} />
</Modal>

<!-- Experience form -->
<Modal bind:display={showMdlMdl}>
  <ExperienceForm {addNew} blockId={$blockId} on:closeForm={closeMdlMdl} />
</Modal>
