<script>
  import Modal from "./Modal.svelte";
  import SectionCard from "./SectionCard.svelte";
  import AboutForm from "./AboutForm.svelte";
  import { about } from "./stores.js";

  let showMdl = false;

  const clickEdit = () => {
    showMdl = true;
  };
  const closeMdl = () => {
    showMdl = false;
  };
</script>

<style>
  .about {
    margin-top: 0;
    font-size: 0.9em;
  }
</style>

<!-- About section card -->
<SectionCard section="About" on:clickEdit={clickEdit}>
  <p class="about">{$about}</p>
</SectionCard>

<!-- About form -->
<Modal bind:display={showMdl}>
  <AboutForm on:closeForm={closeMdl} />
</Modal>
