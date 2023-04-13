<script lang="ts">
import { faFrown, faGrinStars, faMeh, faSmile } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import Modal from '../dialogs/Modal.svelte';
import type { FeedbackProperties } from '../../../../preload/src/index';
import ErrorMessage from '../ui/ErrorMessage.svelte';
import Frame from '../dialogs/Frame.svelte';
let displayModal = false;

// feedback of the user
let tellUsWhyFeedback = '';
let contactInformation = '';
let ssoUrl:string;
let providerId:string;

window.events?.receive('display-authentication-dialog', (dialogRequest: {url: string, providerId: string}) => {
  displayModal = true;
  ssoUrl = dialogRequest.url;
  providerId = dialogRequest.providerId;
});

window.events?.receive('close-authentication-dialog', () => {
  displayModal = false;
});

function hideModal(): void {
  displayModal = false;
  window.authenticationProviderLoginDialogClosedByUser(providerId);
}

</script>

{#if displayModal}
  <Modal on:close="{() => hideModal()}">
    <Frame title={providerId} onClose={hideModal}>
      <webview src="{ssoUrl}" style="display:inline-flex; width:100%; height:600px">
      </webview>
    </Frame>
  </Modal>
{/if}
