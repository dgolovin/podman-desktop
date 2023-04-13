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

import type {
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  AuthenticationSession,
  AuthenticationSessionAccountInformation,
  Event,
  AuthenticationDialog,
} from '@podman-desktop/api';
import { beforeEach, expect, test, vi } from 'vitest';
import type { ApiSenderType } from './api';
import { AuthenticationImpl } from './authentication';
import type { Dialogs } from './dialog-impl';
import { Emitter as EventEmitter } from './events/emitter';

function randomNumber(n = 5) {
  return Math.round(Math.random() * 10 * n);
}

class RandomAuthenticationSession implements AuthenticationSession {
  id: string;
  accessToken: string;
  account: AuthenticationSessionAccountInformation;
  constructor(public readonly scopes: readonly string[]) {
    this.id = `id${randomNumber()}`;
    this.accessToken = `accessToken${randomNumber()}`;
    this.account = {
      id: `${randomNumber()}`,
      label: `label${randomNumber()}`,
    };
  }
}

class AuthenticationProviderSingleAccout implements AuthenticationProvider {
  private _onDidChangeSession = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
  private session: AuthenticationSession | undefined;
  onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent> = this._onDidChangeSession.event;
  async getSessions(scopes?: string[] | undefined): Promise<readonly AuthenticationSession[]> {
    return this.session ? [this.session] : [];
  }
  async createSession(scopes: string[], loginDialogCallback: (url: string) => Promise<AuthenticationDialog>): Promise<AuthenticationSession> {
    this.session =  new RandomAuthenticationSession(scopes);
    return this.session;
  }
  async removeSession(): Promise<void> {
    if (this.session) {
      this._onDidChangeSession.fire({ added: [], removed: [this.session], changed: [] });
      this.session = undefined;
    }
  }
}

const apiSender: ApiSenderType = {
  send: vi.fn(),
  receive: vi.fn(),
};

const dialogs: Dialogs = {
  showDialog: vi.fn(),
};

let authModule: AuthenticationImpl;


beforeEach(function () {
  vi.clearAllMocks();
  authModule = new AuthenticationImpl(apiSender, dialogs);
});

test('Registering the same provider twice throws an error', async () => {
  const authProvidrer1 = new AuthenticationProviderSingleAccout();
  authModule.registerAuthenticationProvider('company.auth-provider', 'Provider 1', authProvidrer1);
  expect(() => authModule.registerAuthenticationProvider('company.auth-provider', 'Provider 1', authProvidrer1)).throws('An authentication provider with id \'company.auth-provider\' is already registered');
});

test('Registered authentication provider stored in autentication module', async () => {
  const authProvidrer1 = new AuthenticationProviderSingleAccout();
  authModule.registerAuthenticationProvider('company.auth-provider', 'Provider 1', authProvidrer1);
  const providersInfo = await authModule.getAuthenticationProvidersInfo();
  expect(providersInfo).length(1, 'Provider was not registered');
});

test('Authentication creates session if no session exists', async () => {
  const authProvidrer1 = new AuthenticationProviderSingleAccout();
  authModule.registerAuthenticationProvider('company.auth-provider', 'Provider 1', authProvidrer1);
  const session = await authModule.getSession({id: 'Extension1', label: 'Extension Client 1'}, 'company.auth-provider', ['scope1', 'scope2']);
  expect(session).is.not.undefined;
});

test('Authentication returns session if session from the same provider exists', async () => {
  const authProvidrer1 = new AuthenticationProviderSingleAccout();
  const createSessionSpy = vi.spyOn(authProvidrer1, 'createSession');
  authModule.registerAuthenticationProvider('company.auth-provider', 'Provider 1', authProvidrer1);
  const session1 = await authModule.getSession({id: 'Extension1', label: 'Extension Client 1'}, 'company.auth-provider', ['scope1', 'scope2']);
  expect(createSessionSpy).toBeCalledTimes(1);
  const session2 = await authModule.getSession({id: 'Extension2', label: 'Extension Client 2'}, 'company.auth-provider', ['scope1', 'scope2']);
  expect(createSessionSpy).toBeCalledTimes(1);
});

test('Signing out of session removes the session from provider and emits event', async () => {
  const authProvidrer1 = new AuthenticationProviderSingleAccout();
  authModule.registerAuthenticationProvider('company.auth-provider', 'Provider 1', authProvidrer1);
  const listener = vi.fn();
  authProvidrer1.onDidChangeSessions(listener);
  const session = await authModule.getSession({id: 'Extension1', label: 'Extension Client 1'}, 'company.auth-provider', ['scope1', 'scope2']);
  expect(session).is.not.undefined;
  const onDidChangeSessionsSpy = vi.spyOn(authProvidrer1, 'onDidChangeSessions');
  await authModule.signOut('company.auth-provider', session? session.id : '');
  const sessions = await authProvidrer1.getSessions(['scope1', 'scope2']);
  expect(sessions).length(0);
  expect(listener).toBeCalledTimes(1);
});

test('Dispose authentication provider removes hte provider', async () => {
  const authProvidrer1 = new AuthenticationProviderSingleAccout();
  const disposable = authModule.registerAuthenticationProvider('company.auth-provider', 'Provider 1', authProvidrer1);
  expect(await authModule.getAuthenticationProvidersInfo()).length(1);
  disposable.dispose();
  expect(await authModule.getAuthenticationProvidersInfo()).length(0);
});

test(('Removing session from not registered provider throws an error'), async () => {
  await expect(() => authModule.removeSession('company.auth-provider', 'session1')).rejects.toThrow('Requested authentication provider company.auth-provider is not installed.');
});
