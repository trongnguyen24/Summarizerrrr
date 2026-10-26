<script module>
  const WORDS = [
    'Thinking',
    'Cooking',
    'Brewing',
    'Pondering',
    'Musing',
    'Crunching',
    'Percolating',
    'Noodling',
    'Simmering',
    'Scheming',
    'Marinating',
    'Connecting dots',
  ]
</script>

<script>
  // Picked once at mount: the indicator only lives from send until the first
  // token, so each turn gets exactly one word.
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
</script>

<div class="flex w-full items-center" aria-live="polite">
  <span class="shine-text text-sm">{word}…</span>
</div>

<style>
  .shine-text {
    background: linear-gradient(
      100deg,
      var(--color-muted) 0%,
      var(--color-muted) 40%,
      var(--color-text-primary) 50%,
      var(--color-muted) 60%,
      var(--color-muted) 100%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: chat-shine 2.4s linear infinite;
    will-change: background-position;
  }

  @keyframes chat-shine {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shine-text {
      animation: none;
      background: none;
      color: var(--color-text-secondary);
    }
  }
</style>
