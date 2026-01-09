<script lang="ts">
import type { CertificateInfo } from '/@api/certificate-info';

interface Props {
  object: CertificateInfo;
}

let { object }: Props = $props();
</script>

<div class="text-(--pd-table-body-text-highlight) overflow-hidden text-ellipsis">
  <span title={object.issuer} class="mx-1">{object.issuerCommonName ?? object.issuer}</span>
</div>

