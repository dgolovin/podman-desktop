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

export interface PushImageInfo {
  inProgress: boolean;
  finished: boolean;
  error?: string;
  cancellableTokenId?: number;
  logsTerminal?: Terminal;
  taskId: number;
}

let taskCounter = 0;

export function getNextTaskId(): number {
  return ++taskCounter;
}

export function cleanupPushImageInfo(taskId: number): void {
  const map = get(pushImagesInfo);
  map.delete(taskId);
  pushImagesInfo.set(map);
}

export function clonePushImageInfo(original: PushImageInfo): PushImageInfo {
  return {
    ...original,
    taskId: 0,
  };
}

export function createDefaultPushImageInfo(): PushImageInfo {
  return {
    taskId: 0,
    inProgress: false,
    finished: false,
  };
}

export const pushImagesInfo: Writable<Map<number, PushImageInfo>> = writable(new Map());
export const lastUpdatedTaskId: Writable<number | undefined> = writable();
