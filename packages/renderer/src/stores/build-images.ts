/**********************************************************************
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import type { Terminal } from '@xterm/xterm';
import type { Writable } from 'svelte/store';
import { get, writable } from 'svelte/store';

import type { ProviderContainerConnectionInfo } from '/@api/provider-info';

export interface BuildArg {
  key: string;
  value: string;
}

export interface BuildImageInfo {
  buildImageKey?: symbol;
  buildRunning: boolean;
  buildFinished: boolean;
  containerImageName: string;
  containerFilePath: string;
  containerBuildContextDirectory: string;
  containerBuildPlatform: string;
  buildParentImageName?: string;
  buildError?: string;
  buildArgs: BuildArg[];
  cancellableTokenId?: number;
  selectedProvider?: ProviderContainerConnectionInfo;
  logsTerminal?: Terminal;
  taskId: number;
}

let taskCounter = 0;

export function getNextTaskId(): number {
  return ++taskCounter;
}

export function cleanupBuildImageInfo(taskId: number): void {
  const map = get(buildImagesInfo);
  map.delete(taskId);
  buildImagesInfo.set(map);
}

export function cloneBuildImageInfo(original: BuildImageInfo): BuildImageInfo {
  return {
    ...original,
    taskId: 0,
    buildArgs: original.buildArgs.map(originalArg => ({ ...originalArg })),
  };
}

export function createDefaultBuildImageInfo(): BuildImageInfo {
  return {
    taskId: 0,
    containerImageName: '',
    buildRunning: false,
    buildFinished: false,
    containerFilePath: '',
    containerBuildContextDirectory: '',
    containerBuildPlatform: '',
    buildArgs: [{ key: '', value: '' }],
  };
}

export const buildImagesInfo: Writable<Map<number, BuildImageInfo>> = writable(new Map());
export const lastUpdatedTaskId: Writable<number | undefined> = writable();
