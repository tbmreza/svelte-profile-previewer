<script>
  const cueList = [
    "Where do you see yourself in 5 years?",
    "You are starting a company. CTO alongside you:",
    "You are CEO. Your dream COO:",
    "Appreciate your growth! Four years ago:",
    "You are founding a startup. Your co-founder:",
    "My failures in the past shape this:"
  ];

  let cue = cueList[0];
  let index = 0;
  let prevIndex = 0;

  const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  const getCue = () => {
    do {
      index = getRandomInt(0, cueList.length - 1);
      cue = cueList[index];
    } while (index === prevIndex);
    prevIndex = index;
  };
</script>

<style>
  p {
    color: #ddd;
    font-style: italic;
    user-select: none;
    white-space: nowrap;
  }
  p:hover {
    cursor: pointer;
    text-decoration: underline;
  }
</style>

<p on:click={getCue}>{cue}</p>
