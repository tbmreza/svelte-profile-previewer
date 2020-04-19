<script>
  export let content;

  let truncate = true;
  let moreBtnText = true;

  const toggleTruncate = () => {
    truncate = !truncate;
    moreBtnText = !moreBtnText;
  };
</script>

<style>
  .card-block {
    margin: 0.2em;
  }
  p .trunc {
    display: none;
  }
  p .tail {
    display: inline;
  }
</style>

<div class="card-block">
  {#if content.length < 300}
    <p>{content}</p>
  {:else}
    <p>
      {content.slice(0, 255) + '...'}
      <span class:trunc={truncate} class:tail={!truncate}>
        {content.slice(0, content.length)}
      </span>
    </p>
    <button on:click={toggleTruncate}>{moreBtnText ? 'more' : 'less'}</button>
  {/if}
</div>
<!-- TODO: pindahin jadi utility function -->
