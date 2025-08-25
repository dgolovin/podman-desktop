<script lang="ts">
import { faCircleArrowUp, faCircleXmark, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, DropdownMenu, Tooltip } from '@podman-desktop/ui-svelte';
import Fa from 'svelte-fa';

import type { CliToolInfo } from '/@api/cli-tool-info';

import ActionsMenu from '../image/ActionsMenu.svelte';
import Markdown from '../markdown/Markdown.svelte';
import {
  type ConnectionCallback,
  eventCollect,
  registerConnectionCallback,
} from './preferences-connection-rendering-task';
import type { ILoadingStatus } from './Util';

export let cliTool: CliToolInfo;
let showError = false;
let errorMessage = '';
let newVersion: string | undefined = cliTool.newVersion;
let cliToolUpdateStatus: ILoadingStatus;
$: cliToolUpdateStatus = {
  inProgress: false,
  status: cliTool.canUpdate ? 'toUpdate' : 'unknown',
  action: 'update',
};
let cliToolInstallStatus: ILoadingStatus;
$: cliToolInstallStatus = {
  inProgress: false,
  status: cliTool.canInstall ? 'toInstall' : 'unknown',
  action: 'install',
};
let cliToolUninstallStatus: ILoadingStatus;
$: cliToolUninstallStatus = {
  inProgress: false,
  status: cliTool.canInstall ? 'toUninstall' : 'unknown',
  action: 'uninstall',
};
let tooltipText = '';
$: tooltipText = cliTool.path ? `Path: ${cliTool.path}` : 'not installed';

async function showTaskManager(): Promise<void> {
  // call the command show-task-manager'
  await window.executeCommand('show-task-manager');
}

async function update(cliTool: CliToolInfo, selectVersion = false): Promise<void> {
  newVersion = cliTool.newVersion;
  if (!newVersion || selectVersion) {
    // user has to select the version to update to
    try {
      newVersion = await window.selectCliToolVersionToUpdate(cliTool.id, selectVersion);
    } catch (e) {
      // do nothing
      console.log(e);
    }
  }
  if (!newVersion) {
    return;
  }
  try {
    cliToolUpdateStatus.inProgress = true;
    cliToolUpdateStatus = cliToolUpdateStatus;
    const loggerHandlerKey = registerConnectionCallback(getLoggerHandler(cliTool.id));
    await window.updateCliTool(cliTool.id, loggerHandlerKey, newVersion, eventCollect);
    showError = false;
  } catch (e) {
    errorMessage = `Unable to update ${cliTool.displayName} to version ${newVersion}.`;
    showError = true;
  } finally {
    cliToolUpdateStatus.inProgress = false;
    cliToolUpdateStatus = cliToolUpdateStatus;
  }
}

async function install(cliTool: CliToolInfo, latest = true): Promise<void> {
  // user has to select the version to install
  let versionToInstall;
  try {
    versionToInstall = await window.selectCliToolVersionToInstall(cliTool.id, latest);
  } catch (e) {
    // do nothing
    errorMessage = `Error when selecting a version: ${String(e)}`;
    console.error(e);
    showError = true;
  }
  if (!versionToInstall) {
    return;
  }
  try {
    cliToolInstallStatus.inProgress = true;
    cliToolInstallStatus = cliToolInstallStatus;
    const loggerHandlerKey = registerConnectionCallback(getLoggerHandler(cliTool.id));
    await window.installCliTool(cliTool.id, versionToInstall, loggerHandlerKey, eventCollect);
    showError = false;
  } catch (e) {
    errorMessage = `Unable to install ${cliTool.displayName} to version ${versionToInstall}.`;
    showError = true;
  } finally {
    cliToolInstallStatus.inProgress = false;
    cliToolInstallStatus = cliToolInstallStatus;
  }
}

async function uninstall(cliTool: CliToolInfo): Promise<void> {
  const result = await window.showMessageBox({
    title: 'Uninstall',
    message: `Uninstall ${cliTool.displayName} ${cliTool.version} ?`,
    buttons: ['Yes', 'Cancel'],
  });

  if (!result || result.response !== 0) {
    return;
  }

  try {
    cliToolUninstallStatus.inProgress = true;
    cliToolUninstallStatus = cliToolUninstallStatus;
    const loggerHandlerKey = registerConnectionCallback(getLoggerHandler(cliTool.id));
    await window.uninstallCliTool(cliTool.id, loggerHandlerKey, eventCollect);
    showError = false;
  } catch (e) {
    errorMessage = `Unable to uninstall ${cliTool.displayName}. Error: ${String(e)}`;
    showError = true;
  } finally {
    cliToolUninstallStatus.inProgress = false;
    cliToolUninstallStatus = cliToolUninstallStatus;
  }
}

function getLoggerHandler(_cliToolId: string): ConnectionCallback {
  return {
    log: (): void => {},
    warn: (): void => {},
    error: (_args): void => {
      showError = true;
    },
    onEnd: (): void => {},
  };
}
</script>

<div
  role="row"
  class="bg-[var(--pd-invert-content-card-bg)] mb-5 rounded-md p-3 flex flex-col"
  aria-label={cliTool.displayName}>
  <div class="divide-x divide-[var(--pd-content-divider)] flex flex-row">
    <div>
      <!-- left col - cli-tool icon/name + "create new" button -->
      <div class="min-w-[170px] max-w-[200px] h-full flex flex-col justify-between">
        <div class="flex flex-row">
          {#if cliTool?.images?.icon ?? cliTool?.extensionInfo.icon}
            {#if typeof cliTool.images?.icon === 'string'}
              <img
                src={cliTool.images.icon}
                aria-label="cli-logo"
                alt="{cliTool.name} logo"
                class="max-w-[40px] max-h-[40px] h-full" />
            {:else if typeof cliTool.extensionInfo.icon === 'string'}
              <img
                src={cliTool.extensionInfo.icon}
                aria-label="cli-logo"
                alt="{cliTool.name} logo"
                class="max-w-[40px] max-h-[40px] h-full" />
            {/if}
          {/if}
          <Tooltip area-label="cli-full-path" bottomRight={true} tip="{tooltipText}">
          <div class="flex flex-col">
              
          <span
            id={cliTool.id}
            class="flex-row my-auto ml-3 break-words font-semibold text-[var(--pd-invert-content-header-text)]"
            aria-label="cli-name">{cliTool.name}</span>
            {#if cliTool.version}
              <span
              id={cliTool.id}-installed-version
              class="flex-row my-auto ml-3 break-words font-semibold text-[var(--pd-invert-content-header-text)]"
              aria-label="cli-name">v{cliTool.version}</span>
            {/if}
          
           </div>
           </Tooltip>
        </div>
        <div class="flex flex-row space-x-1 w-full">
          {#if !cliTool.version && cliTool.canInstall && cliToolInstallStatus}
            <div class="p-0.5 rounded-lg bg-[var(--pd-invert-content-bg)] w-fit">
              <Button
                type="primary"
                on:click={async (): Promise<void> => {
                  if (cliTool.canInstall) {
                    await install(cliTool);
                  }
                }}
                inProgress={cliToolInstallStatus.inProgress}
                title={`Install ${cliTool.displayName} v${cliTool.newVersion}`} >Install</Button>
            </div>
          {/if}
          {#if cliTool.version && cliTool.canUpdate && cliToolUpdateStatus && cliTool.newVersion}
            <div class="p-0.5 rounded-lg bg-[var(--pd-invert-content-bg)] w-fit">
              <Button
                type="primary"
                on:click={async (): Promise<void> => {
                  if (cliTool.canUpdate) {
                    await update(cliTool);
                  }
                }}
                inProgress={cliToolUpdateStatus.inProgress}
                title={!cliTool.canUpdate
                  ? 'No updates'
                  : cliTool.newVersion
                    ? `Update to v${cliTool.newVersion}`
                    : 'Upgrade/Downgrade'}>Update</Button>
            </div>
          {/if}
          <div class="w-full"></div>
          <Tooltip bottom tip="More Options">
              <ActionsMenu dropdownMenu={true}>
                <DropdownMenu.Item 
                  title="Install specific version ..."
                  icon={faCircleArrowUp} 
                  onClick={async (): Promise<void> => {
                    if (cliTool.version)  {
                      await update(cliTool, true);
                    } else {
                      await install(cliTool, false);
                    }
                  }}
                  enabled={(!cliTool.version && cliTool.canInstall || !!cliTool.version && cliTool.canUpdate) && !cliToolUpdateStatus.inProgress && !cliToolInstallStatus.inProgress && !cliToolUninstallStatus.inProgress}/>
                <DropdownMenu.Item 
                  title="Uninstall"
                  icon={faTrash} 
                  onClick={async (): Promise<void> => {
                    if (cliTool.canInstall) {
                      await uninstall(cliTool);
                    }
                  }}
                  enabled={!!cliTool.version && cliTool.canInstall && !cliToolUninstallStatus.inProgress}
                />
              </ActionsMenu>
            </Tooltip>
        </div>
      </div>
    </div>
    <!-- cli-tools columns -->
    <div class="grow flex-column divide-[var(--pd-content-divider)] ml-2">
      <span class="my-auto ml-3 break-words text-[var(--pd-invert-content-header-text)]" aria-label="cli-display-name"
        >{cliTool.displayName} {#if cliTool.newVersion ?? cliTool.version}(latest {cliTool.newVersion ?? cliTool.version}){/if}</span>
      <div
        role="region"
        class="float-right text-[var(--pd-invert-content-card-text)] px-2 text-sm"
        aria-label="cli-registered-by">
        Registered by {cliTool.extensionInfo.label}
      </div>
      <div role="region" class="ml-3 mt-2 text-[var(--pd-invert-content-card-text)]">
        <div class="text-[var(--pd-invert-content-card-text)]">
          <Markdown markdown={cliTool.description} />
        </div>
      </div>
      {#if showError}
        <div class="flex flex-row w-full items-center text-xs text-[var(--pd-state-error)] p-2 ml-1 mt-2">
          <Fa icon={faCircleXmark} class="mr-1 text-[var(--pd-state-error)]" />
          <span>{errorMessage}</span>
          <Button
            type="link"
            padding="p-0"
            class="ml-1 text-sm"
            aria-label="{cliTool.displayName} failed"
            on:click={showTaskManager}>Check why it failed</Button>
        </div>
      {/if}
    </div>
  </div>
</div>
