<style>
  .card {
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
    transition: 0.1s;
    border-radius: 5px;
    background-image: linear-gradient(cornsilk, floralwhite);
    margin: 1em;
    padding: 0.1em 1em 1em;
    cursor: default;
  }
  .card:hover {
    box-shadow: 0 6px 12px 0 rgba(0, 0, 0, 0.2);
  }
</style>

<div class="card">
  <slot />
</div>
