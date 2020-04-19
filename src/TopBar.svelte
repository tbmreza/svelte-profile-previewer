<script>
  import Cue from "./Cue.svelte";
</script>

<style>
  .navbar {
    position: sticky;
    top: 0;
  }
  ul {
    margin: 0;
    list-style-type: none;
    padding-bottom: 48px;
    background-color: #333;
  }
  li {
    float: right;
  }
</style>

<div class="navbar">
  <ul>
    <li style="float: left;">
      <Cue />
    </li>
  </ul>
</div>
