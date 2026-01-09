<script lang="ts">
interface Props {
  object: string;
}

let { object }: Props = $props();
</script>

<div class="text-(--pd-table-body-text-highlight) overflow-hidden text-ellipsis">
  <span title={object} class="mx-1">{object}</span>
</div>
