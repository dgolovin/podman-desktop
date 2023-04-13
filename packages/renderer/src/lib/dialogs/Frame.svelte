<script>
  export let title;
  export let onClose;
  const handleClick = () => {
    onClose();
  };
</script>

<div
      class="inline-block w-full overflow-hidden text-left transition-all transform bg-zinc-800 z-50 rounded-xl shadow-xl shadow-neutral-900">
      <div class="flex items-center justify-between bg-black px-5 py-4 border-b-2 border-violet-700">
        <h1 class="text-xl font-bold">{title}</h1>

        <button class="hover:text-gray-200 px-2 py-1" on:click="{handleClick}">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
      <slot/>
</div>