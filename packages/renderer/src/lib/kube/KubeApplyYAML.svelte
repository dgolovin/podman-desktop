<script lang="ts">
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import type { Context, KubernetesObject } from '@kubernetes/client-node';
import type { OpenDialogOptions } from '@podman-desktop/api';
import { Button, Dropdown, ErrorMessage } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';
import Fa from 'svelte-fa';

import { handleNavigation } from '/@/navigation';
import { NavigationPage } from '/@api/navigation-page';

import MonacoEditor from '../editor/MonacoEditor.svelte';
import KubePlayIcon from '../kube/KubePlayIcon.svelte';
import EngineFormPage from '../ui/EngineFormPage.svelte';
import FileInput from '../ui/FileInput.svelte';
import WarningMessage from '../ui/WarningMessage.svelte';

let contexts: Context[] = $state([]);
let selectedContextName: string | undefined = $state();
let runStarted = $state(false);
let runFinished = $state(false);
let runError = $state('');
let runWarning = $state('');
let kubernetesYamlFilePath: string | undefined = $state();
let customYamlContent: string = $state('');
let fileContent: string | undefined = $state();
let userChoice: 'file' | 'custom' = $state('file');
let loadingSelectedFile: Promise<string> = $state(Promise.resolve(''));

let hasInvalidFields = $derived.by(() => {
  if (!selectedContextName) {
    return false;
  }
  switch (userChoice) {
    case 'file':
      return kubernetesYamlFilePath === undefined;
    case 'custom':
      return customYamlContent.length === 0;
  }
});

let playKubeResultRaw: string | undefined = $state(undefined);

const kubeFileDialogOptions: OpenDialogOptions = {
  title: 'Select a .yaml file to play',
  filters: [
    {
      name: 'YAML files',
      extensions: ['yaml', 'yml'],
    },
  ],
};

$effect(() => {
  if (kubernetesYamlFilePath) {
    loadingSelectedFile = window.readFile(kubernetesYamlFilePath, 'utf8').then(content => {
      return new Promise(resolve => setTimeout(() => resolve(content), 2000));
    });
  }
});

async function kubeApply(): Promise<void> {
  // this if is here to suppress linter error that selectedContextName can be undefined
  if (!selectedContextName) {
    throw new Error('No context selected');
  }

  let tempFilePath: string = await window.createTempFile(customYamlContent);

  runStarted = true;
  runFinished = false;

  try {
    const namespace = await window.kubernetesGetCurrentNamespace();
    let objects: KubernetesObject[] = await window.kubernetesApplyResourcesFromFile(
      selectedContextName,
      tempFilePath,
      namespace,
    );
    if (objects.length === 0) {
      playKubeResultRaw = `No resource(s) were applied.`;
    } else if (objects.length === 1) {
      runWarning = `Successfully applied 1 ${objects[0].kind ?? 'unknown resource'}.`;
    } else {
      const counts = objects.reduce(
        (acc, obj) => {
          acc[obj.kind ?? 'unknown'] = (acc[obj.kind ?? 'unknown'] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      const resources = Object.entries(counts)
        .map(obj => `${obj[1]} ${obj[0]}`)
        .join(', ');
      playKubeResultRaw = `Successfully applied ${objects.length} resources (${resources}).`;
    }
  } catch (error) {
    runError = 'Could not apply Kubernetes YAML: ' + error;
  }
  runStarted = false;
  runFinished = true;
}

function goBackToPodsPage(): void {
  // redirect to the pods page
  handleNavigation({
    page: NavigationPage.PODMAN_PODS,
  });
}

onMount(async () => {
  contexts = await window.kubernetesGetContexts();
  selectedContextName = await window.kubernetesGetCurrentContextName();
});
</script>

  <EngineFormPage title="Create pods from a Kubernetes YAML file" inProgress={runStarted && !runFinished}>
    {#snippet icon()}
      <KubePlayIcon size="30px" />
    {/snippet}

    {#snippet content()}
      <div class="space-y-6">
 
        <div class='grid grid-cols-[140px_minmax(0,1fr)] gap-y-6 items-center'>
            <label for="kubeContexts" class="text-base font-bold text-[var(--pd-default-text)] align-middle h-min">Kubernetes Context:</label>
            <div class='flex flex-col'>
            <Dropdown class='self-start'
              id="kubeContexts"
              name="kubeContexts"
              value={selectedContextName}
              options={contexts.map(context => ({
                label: context.name,
                value: context.name,
              }))}/>
            </div>

           <label for="containerFilePath" class="text-base font-bold text-[var(--pd-default-text)]">Kubernetes YAML file:</label> 

            <FileInput
              name="containerFilePath"
              id="containerFilePath"
              readonly
              required
              bind:value={kubernetesYamlFilePath}
              placeholder="Select a .yaml file to play"
              options={kubeFileDialogOptions}
              class="w-full p-2 align-middle" />
        </div>


        <!-- Monaco Editor for custom YAML content -->
        <div class="space-y-3">
          <label for="custom-yaml-editor" class="block text-base font-bold text-[var(--pd-content-card-header-text)]">
            Custom Kubernetes YAML Content
          </label>
          <div id="custom-yaml-editor" class="h-[400px] border">
            {#await loadingSelectedFile}
                <MonacoEditor
                  readOnly={true}
                  language="yaml"
                  content="Loading file content ..."/>
            {:then content} 
              {#key fileContent}
                <MonacoEditor
                  readOnly={false}
                  language="yaml"
                  on:contentChange={(e): void => {
                    customYamlContent = e.detail;
                  }}
                  content={content}/>
              {/key}
            {/await}
          </div>
        </div>

        {#if !runFinished}
          <Button
            on:click={kubeApply}
            disabled={hasInvalidFields || runStarted}
            class="w-full"
            inProgress={runStarted}
            icon={KubePlayIcon}>
            {userChoice === 'custom' ? 'Play Custom YAML' : 'Play'}
          </Button>
        {/if}
        {#if runStarted}
          <div class="text-[var(--pd-content-card-text)] text-sm">
            Please wait during the Play Kube and do not change screen. This process may take a few minutes to complete...
          </div>
        {/if}

        {#if runWarning}
          <WarningMessage class="text-sm" error={runWarning} />
        {/if}

        {#if runError}
          <ErrorMessage class="text-sm" error={runError} />
        {/if}

        {#if playKubeResultRaw}
          <div
            class="text-[var(--pd-state-info)] p-1 flex flex-row items-center">
            <Fa size="1.125x" class="cursor-pointer text-[var(--pd-state-info)]" icon={faInfoCircle} />
            <div role="alert" aria-label="Warning Message Content" class="ml-2">{playKubeResultRaw}</div>
          </div>
        {/if}

        {#if runFinished}
          <Button onclick={goBackToPodsPage} class="w-full">Done</Button>
        {/if}
      </div>
    {/snippet}
  </EngineFormPage>
