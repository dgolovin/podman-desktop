<script lang="ts">
import { faFrown, faGrinStars, faMeh, faSmile } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import Modal from '../dialogs/Modal.svelte';
import Frame from '../dialogs/Frame.svelte';
import type { FeedbackProperties } from '../../../../preload/src/index';
import ErrorMessage from '../ui/ErrorMessage.svelte';
let displayModal = false;

// feedback of the user
let smileyRating = 0;
let tellUsWhyFeedback = '';
let contactInformation = '';

window.events?.receive('display-feedback', () => {
  displayModal = true;
});

function hideModal(): void {
  displayModal = false;

  // reset fields
  smileyRating = 0;
  tellUsWhyFeedback = '';
  contactInformation = '';
}

function selectSmiley(item: number): void {
  smileyRating = item;
}

async function sendFeedback(): Promise<void> {
  const properties: FeedbackProperties = {
    rating: smileyRating,
  };

  if (tellUsWhyFeedback) {
    properties.comment = tellUsWhyFeedback;
  }

  if (contactInformation) {
    properties.contact = contactInformation;
  }

  // send
  await window.sendFeedback(properties);
  // close the modal
  hideModal();
}
</script>

{#if displayModal}
  <Modal on:close="{() => hideModal()}">
    <Frame title={'Share your feedback'} onClose={hideModal}>
      <div class="overflow-y-auto p-4">
        <label for="smiley" class="block mb-2 text-sm font-medium text-gray-300 dark:text-gray-300"
          >How was your experience with Podman Desktop ?</label>
        <div class="flex space-x-4">
          <button aria-label="very-sad-smiley" on:click="{() => selectSmiley(1)}">
            <Fa
              size="24"
              class="cursor-pointer {smileyRating === 1 ? 'text-violet-400' : 'text-gray-500'}"
              icon="{faFrown}" />
          </button>
          <button aria-label="sad-smiley" on:click="{() => selectSmiley(2)}">
            <Fa
              size="24"
              class="cursor-pointer {smileyRating === 2 ? 'text-violet-400' : 'text-gray-500'}"
              icon="{faMeh}" />
          </button>
          <button aria-label="happy-smiley" on:click="{() => selectSmiley(3)}">
            <Fa
              size="24"
              class="cursor-pointer {smileyRating === 3 ? 'text-violet-400' : 'text-gray-500'}"
              icon="{faSmile}" />
          </button>
          <button aria-label="very-happy-smiley" on:click="{() => selectSmiley(4)}">
            <Fa
              size="24"
              class="cursor-pointer {smileyRating === 4 ? 'text-violet-400' : 'text-gray-500'}"
              icon="{faGrinStars}" />
          </button>
        </div>

        <label for="tellUsWhyFeedback" class="block mt-4 mb-2 text-sm font-medium text-gray-300 dark:text-gray-300"
          >Tell us why, or share any suggestion or issue to improve your experience: ({1000 - tellUsWhyFeedback.length} characters
          left)</label>
        <textarea
          rows="4"
          maxlength="1000"
          name="tellUsWhyFeedback"
          id="tellUsWhyFeedback"
          bind:value="{tellUsWhyFeedback}"
          placeholder="Leave blank to generate a name"
          class="w-full p-2 outline-none text-sm bg-zinc-900 rounded-sm text-gray-400 placeholder-gray-400"></textarea>

        <label for="contactInformation" class="block mt-4 mb-2 text-sm font-medium text-gray-300 dark:text-gray-300"
          >Share your contact information if you'd like us to answer you:</label>
        <input
          type="text"
          name="contactInformation"
          id="contactInformation"
          bind:value="{contactInformation}"
          placeholder="Enter email address, phone number or leave blank for anonymous feedback"
          class="w-full p-2 outline-none text-sm bg-zinc-900 rounded-sm text-gray-400 placeholder-gray-400" />

        <div class="pt-5 flex flex-row w-full">
          {#if smileyRating === 0}
            <ErrorMessage class="flex flex-row w-[350px] text-xs" error="Please select an experience smiley" />
          {/if}

          <div class="flex flex-row justify-end w-full">
            <button
              disabled="{smileyRating === 0}"
              class="pf-c-button pf-m-primary"
              type="button"
              on:click="{() => sendFeedback()}">Send feedback</button>
          </div>
        </div>
      </div>
    </Frame>
  </Modal>
{/if}
