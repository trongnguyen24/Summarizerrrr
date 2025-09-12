<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let { selectedSummary, formatDate } = $props()
</script>

<div class="flex flex-col gap-2">
  <div
    class="font-mono text-text-muted text-xs flex gap-8 justify-center items-center"
  >
    <div class="flex justify-center items-center gap-1">
      <Icon height="16" width="16" icon="lucide:clock" />
      {formatDate(selectedSummary.date)}
    </div>
    <div class="flex justify-center items-center gap-1">
      <Icon height="16" width="16" icon="lucide:link" />
      <a href={selectedSummary.url} target="_blank" rel="noopener noreferrer">
        {selectedSummary.url
          ? selectedSummary.url.replace(/(^\w+:|^)\/\//, '').split('/')[0]
          : 'Unknown URL'}
      </a>
    </div>
  </div>
  <h1
    class="mx-auto font-noto-serif my-0 p-0 text-blackwhite text-balance text-center font-serif leading-[1.2]"
  >
    {selectedSummary.title}
  </h1>
</div>
