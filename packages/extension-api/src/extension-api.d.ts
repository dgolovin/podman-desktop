/**********************************************************************
 * Copyright (C) 2022-2023 Red Hat, Inc.
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

declare module '@podman-desktop/api' {
  /**
   * Represents a reference to a command. Provides a title which
   * will be used to represent a command in the UI and, optionally,
   * an array of arguments which will be passed to the command handler
   * function when invoked.
   */
  export interface Command {
    title: string;
    command: string;
    tooltip?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arguments?: any[];
  }

  export interface MenuItem {
    /**
     * Unique within a single menu. Should be same as commandId for handler
     */
    id: string;

    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
    label?: string;

    icon?: string;
    /**
     * If false, the menu item will be greyed out and unclickable.
     */
    enabled?: boolean;
    /**
     * If false, the menu item will be entirely hidden.
     */
    visible?: boolean;
    /**
     * Should only be specified for `checkbox` or `radio` type menu items.
     */
    checked?: boolean;

    submenu?: MenuItem[];
  }

  export class Disposable {
    constructor(func: () => void);
    /**
     * Creates a new Disposable calling the provided function
     * on dispose.
     * @param callOnDispose Function that disposes something.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    constructor(callOnDispose: Function);

    /**
     * Dispose this object.
     */
    dispose(): void;

    static create(func: () => void): Disposable;

    /**
     * Combine many disposable-likes into one. Use this method
     * when having objects with a dispose function which are not
     * instances of Disposable.
     *
     * @param disposableLikes Objects that have at least a `dispose`-function member.
     * @return Returns a new disposable which, upon dispose, will
     * dispose all provided disposables.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static from(...disposableLikes: { dispose: () => any }[]): Disposable;
  }

  /**
   * Event to subscribe
   */
  export interface Event<T> {
    /**
     * @param listener The listener function will be called when the event happens.
     * @param thisArgs The `this`-argument which will be used when calling the event listener.
     * @param disposables An array to which a {@link Disposable} will be added.
     * @return A disposable which unsubscribes the event listener.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]): Disposable;
  }

  /**
   * A class to create and manage an {@link Event} for clients to subscribe to.
   * The emitter can only send one kind of event.
   *
   * Use this class to send events inside extension or provide API to the other
   * extensions.
   */
  export class EventEmitter<T> {
    /**
     * For the public to allow to subscribe to events from this Emitter
     */
    event: Event<T>;
    /**
     * To fire an event to the subscribers
     * @param event The event to send to the registered listeners
     */
    fire(data: T): void;
    /**
     * Dispose by removing registered listeners
     */
    dispose(): void;
  }

  export interface ExtensionContext {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly subscriptions: { dispose(): any }[];

    /**
     * An absolute file path in which the extension can store state.
     * The directory might not exist on disk and creation is
     * up to the extension.
     */
    readonly storagePath: string;
  }

  export type ProviderStatus =
    | 'not-installed'
    | 'installed'
    | 'configured'
    | 'ready'
    | 'started'
    | 'stopped'
    | 'starting'
    | 'stopping'
    | 'error'
    | 'unknown';

  export interface ProviderLifecycle {
    initialize?(initContext: LifecycleContext): Promise<void>;
    start(startContext: LifecycleContext): Promise<void>;
    stop(stopContext: LifecycleContext): Promise<void>;
    status(): ProviderStatus;
  }

  // For displaying essential information to the user
  // "name" of the warning / title and a "details" field for more information
  export interface ProviderInformation {
    name: string;
    details?: string;
  }

  export interface ProviderDetectionCheck {
    name: string;
    details?: string;
    status: boolean;
  }

  export interface ProviderOptions {
    id: string;
    name: string;
    status: ProviderStatus;
    version?: string;
    images?: ProviderImages;
    links?: ProviderLinks[];
    detectionChecks?: ProviderDetectionCheck[];

    // Provide way to add additional warnings to the provider
    warnings?: ProviderInformation[];
  }

  export type ProviderConnectionStatus = 'started' | 'stopped' | 'starting' | 'stopping' | 'unknown';

  export interface Logger {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(...data: any[]): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(...data: any[]): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(...data: any[]): void;
  }

  export interface LifecycleContext {
    log: Logger;
  }

  export interface ProviderConnectionLifecycle {
    start?(startContext: LifecycleContext, logger?: Logger): Promise<void>;
    stop?(stopContext: LifecycleContext, logger?: Logger): Promise<void>;
    delete?(logger?: Logger): Promise<void>;
  }

  export interface ContainerProviderConnectionEndpoint {
    socketPath: string;
  }

  export interface ContainerProviderConnection {
    name: string;
    type: 'docker' | 'podman';
    endpoint: ContainerProviderConnectionEndpoint;
    lifecycle?: ProviderConnectionLifecycle;
    status(): ProviderConnectionStatus;
  }

  export interface KubernetesProviderConnectionEndpoint {
    apiURL: string;
  }
  export interface KubernetesProviderConnection {
    name: string;
    endpoint: KubernetesProviderConnectionEndpoint;
    lifecycle?: ProviderConnectionLifecycle;
    status(): ProviderConnectionStatus;
  }

  // common set of options for creating a provider
  export interface ProviderConnectionFactory {
    // Allow to initialize a provider
    initialize?(): Promise<void>;

    // Optional display name when creating the provider. For example 'Podman Machine' or 'Kind Cluster', etc.
    creationDisplayName?: string;
  }

  // create programmatically a ContainerProviderConnection
  export interface ContainerProviderConnectionFactory extends ProviderConnectionFactory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(params: { [key: string]: any }, logger?: Logger, token?: CancellationToken): Promise<void>;
  }

  // create a kubernetes provider
  export interface KubernetesProviderConnectionFactory extends ProviderConnectionFactory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create?(params: { [key: string]: any }, logger?: Logger): Promise<void>;
  }

  export interface Link {
    title: string;
    url: string;
  }
  export type CheckResultLink = Link;

  export interface CheckResult {
    successful: boolean;
    description?: string;
    docLinks?: CheckResultLink[];
  }

  export interface InstallCheck {
    title: string;
    execute(): Promise<CheckResult>;
  }

  export interface ProviderInstallation {
    preflightChecks?(): InstallCheck[];
    // ask to install the provider
    install(logger: Logger): Promise<void>;
  }

  export interface ProviderUpdate {
    version: string;
    // ask to update the provider
    update(logger: Logger): Promise<void>;

    preflightChecks?(): InstallCheck[];
  }

  /**
   * By providing this interface, when Podman Desktop is starting
   * It'll start the provider through this interface.
   * It can be turned off/on by the user.
   */
  export interface ProviderAutostart {
    start(logger: Logger): Promise<void>;
  }

  export type ProviderLinks = Link;

  export interface ProviderImages {
    icon?: string | { light: string; dark: string };
    logo?: string | { light: string; dark: string };
  }

  export interface Provider {
    setContainerProviderConnectionFactory(
      containerProviderConnectionFactory: ContainerProviderConnectionFactory,
    ): Disposable;
    setKubernetesProviderConnectionFactory(
      containerProviderConnectionFactory: KubernetesProviderConnectionFactory,
    ): Disposable;

    registerContainerProviderConnection(connection: ContainerProviderConnection): Disposable;
    registerKubernetesProviderConnection(connection: KubernetesProviderConnection): Disposable;
    registerLifecycle(lifecycle: ProviderLifecycle): Disposable;

    // register installation flow
    registerInstallation(installation: ProviderInstallation): Disposable;

    // register update flow
    registerUpdate(update: ProviderUpdate): Disposable;

    // register autostart flow
    registerAutostart(autostart: ProviderAutostart): Disposable;

    dispose(): void;
    readonly name: string;
    readonly id: string;
    readonly status: ProviderStatus;
    updateStatus(status: ProviderStatus): void;
    onDidUpdateStatus: Event<ProviderStatus>;

    // version may not be defined
    readonly version: string | undefined;
    updateVersion(version: string): void;
    onDidUpdateVersion: Event<string>;

    readonly images: ProviderImages;

    readonly links: ProviderLinks[];

    // detection checks for the provider
    readonly detectionChecks: ProviderDetectionCheck[];

    // update the detection checks for the provider
    // it may happen after an update or an installation
    updateDetectionChecks(detectionChecks: ProviderDetectionCheck[]): void;

    // update warning information for the provider
    readonly warnings: ProviderInformation[];
    updateWarnings(warnings: ProviderInformation[]): void;

    // notify that detection checks have changed
    onDidUpdateDetectionChecks: Event<ProviderDetectionCheck[]>;
  }

  export namespace commands {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function executeCommand<T = unknown>(command: string, ...rest: any[]): PromiseLike<T>;
  }

  export interface ProviderEvent {
    id: string;
    name: string;
    status: ProviderStatus;
  }

  export interface UnregisterContainerConnectionEvent {
    providerId: string;
  }
  export interface UnregisterKubernetesConnectionEvent {
    providerId: string;
  }
  export interface RegisterKubernetesConnectionEvent {
    providerId: string;
  }
  export interface RegisterContainerConnectionEvent {
    providerId: string;
    connection: ContainerProviderConnection;
  }
  export interface ProviderContainerConnection {
    providerId: string;
    connection: ContainerProviderConnection;
  }

  export namespace provider {
    export function createProvider(provider: ProviderOptions): Provider;
    export const onDidUpdateProvider: Event<ProviderEvent>;
    export const onDidUnregisterContainerConnection: Event<UnregisterContainerConnectionEvent>;
    export const onDidRegisterContainerConnection: Event<RegisterContainerConnectionEvent>;
    export function getContainerConnections(): ProviderContainerConnection[];
  }

  export interface ProxySettings {
    httpProxy: string | undefined;
    httpsProxy: string | undefined;
    noProxy: string | undefined;
  }

  export namespace proxy {
    export function getProxySettings(): ProxySettings | undefined;
    export function setProxy(proxySettings: ProxySettings): void;
    // Podman Desktop has updated the settings, propagates the changes to the provider.
    export const onDidUpdateProxy: Event<ProxySettings>;

    // The state of the proxy
    export function isEnabled(): boolean;
    export const onDidStateChange: Event<boolean>;
  }

  // An interface for "Default" registries that include the name, URL as well as an icon
  // This allows an extension to "suggest" a registry to the user that you may
  // login via a username & password.
  export interface RegistrySuggestedProvider {
    name: string;
    url: string;

    // Optional base64 PNG image (for transparency / non vector icons)
    icon?: string;
  }

  export interface Registry extends RegistryCreateOptions {
    source: string;

    // Optional name and icon for the registry when it's being added (used for display within the UI)
    name?: string;
    icon?: string;
  }

  export interface RegistryCreateOptions {
    serverUrl: string;
    username: string;
    secret: string;
  }

  export interface RegistryProvider {
    readonly name: string;
    create(registryCreateOptions: RegistryCreateOptions): Registry;
  }

  /**
   * Handle registries from different sources
   */
  export namespace registry {
    export function registerRegistryProvider(registryProvider: RegistryProvider): Disposable;

    // expose a registry from a source
    export function registerRegistry(registry: Registry): Disposable;

    // remove registry from a source
    export function unregisterRegistry(registry: Registry): void;

    // suggest a registry to be included on the registry settings page
    export function suggestRegistry(registry: RegistrySuggestedProvider): Disposable;

    export const onDidRegisterRegistry: Event<Registry>;
    export const onDidUpdateRegistry: Event<Registry>;
    export const onDidUnregisterRegistry: Event<Registry>;
  }

  export namespace tray {
    /**
     * Creates a menu not related to a Provider
     * @param item the item to add in the tray menu
     */
    export function registerMenuItem(item: MenuItem): Disposable;

    /**
     * Creates a menu in the tray for a given Provider
     * @param providerId the same as the id on Provider provided by createProvider() method, need to place menu item properly
     * @param item
     */
    export function registerProviderMenuItem(providerId: string, item: MenuItem): Disposable;
  }

  export namespace configuration {
    export function getConfiguration(section?: string, scope?: ConfigurationScope): Configuration;

    /**
     * An event that is emitted when the {@link Configuration configuration} changed.
     */
    export const onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
  }

  /**
   * The configuration scope
   */
  export type ConfigurationScope = string | ContainerProviderConnection | KubernetesProviderConnection;

  export interface Configuration {
    /**
     * Return a value from this configuration.
     *
     * @param section Configuration name, supports _dotted_ names.
     * @return The value `section` denotes or `undefined`.
     */
    get<T>(section: string): T | undefined;

    /**
     * Return a value from this configuration.
     *
     * @param section Configuration name, supports _dotted_ names.
     * @param defaultValue A value should be returned when no value could be found, is `undefined`.
     * @return The value `section` denotes or the default.
     */
    get<T>(section: string, defaultValue: T): T;

    /**
     * Check if this configuration has a certain value.
     *
     * @param section Configuration name, supports _dotted_ names.
     * @return `true` if the section doesn't resolve to `undefined`.
     */
    has(section: string): boolean;

    /**
     * Update a configuration value. The updated configuration values are persisted.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(section: string, value: any): PromiseLike<void>;

    /**
     * Readable dictionary that backs this configuration.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly [key: string]: any;
  }

  /**
   * An event describing the change in Configuration
   */
  export interface ConfigurationChangeEvent {
    /**
     * Checks if the given section has changed.
     * If scope is provided, checks if the section has changed for resources under the given scope.
     *
     * @param section Configuration name, supports _dotted_ names.
     * @param scope A scope in which to check.
     * @return `true` if the given section has changed.
     */
    affectsConfiguration(section: string, scope?: ConfigurationScope): boolean;
  }

  /**
   * Defines a generalized way of reporting progress updates.
   */
  export interface Progress<T> {
    /**
     * Report a progress update.
     * @param value A progress item, like a message and/or an
     * report on how much work finished
     */
    report(value: T): void;
  }

  /**
   * A location in the editor at which progress information can be shown. It depends on the
   * location how progress is visually represented.
   */
  export enum ProgressLocation {
    /**
     * Show progress bar under app icon in launcher bar.
     */
    APP_ICON = 1,
  }

  /**
   * Value-object describing where and how progress should show.
   */
  export interface ProgressOptions {
    /**
     * The location at which progress should show.
     */
    location: ProgressLocation;

    /**
     * A human-readable string which will be used to describe the
     * operation.
     */
    title?: string;

    /**
     * Controls if a cancel button should show to allow the user to
     * cancel the long running operation.  Note that currently only
     * `ProgressLocation.Notification` is supporting to show a cancel
     * button.
     */
    cancellable?: boolean;
  }

  /**
   * A cancellation token is passed to an asynchronous or long running
   * operation to request cancellation.
   */
  export interface CancellationToken {
    /**
     * Is `true` when the token has been cancelled, `false` otherwise.
     */
    isCancellationRequested: boolean;

    /**
     * An {@link Event} which fires upon cancellation.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onCancellationRequested: Event<any>;
  }

  export interface CancellationTokenSource {
    /**
     * The cancellation token of this source.
     */
    token: CancellationToken;

    /**
     * Signal cancellation on the token.
     */
    cancel(): void;

    /**
     * Dispose object and free resources.
     */
    dispose(): void;
  }

  /**
   * Impacts the behavior and appearance of the validation message.
   */
  export enum InputBoxValidationSeverity {
    Info = 1,
    Warning = 2,
    Error = 3,
  }

  /**
   * Object to configure the behavior of the validation message.
   */
  export interface InputBoxValidationMessage {
    /**
     * The validation message to display.
     */
    readonly message: string;

    /**
     * The severity of the validation message.
     * NOTE: When using `InputBoxValidationSeverity.Error`, the user will not be allowed to accept (hit ENTER) the input.
     * `Info` and `Warning` will still allow the InputBox to accept the input.
     */
    readonly severity: InputBoxValidationSeverity;
  }

  /**
   * Options to configure the behavior of the input box UI.
   */
  export interface InputBoxOptions {
    /**
     * An optional string that represents the title of the input box.
     */
    title?: string;

    /**
     * The value to pre-fill in the input box.
     */
    value?: string;

    /**
     * Selection of the pre-filled {@linkcode InputBoxOptions.value value}. Defined as tuple of two number where the
     * first is the inclusive start index and the second the exclusive end index. When `undefined` the whole
     * pre-filled value will be selected, when empty (start equals end) only the cursor will be set,
     * otherwise the defined range will be selected.
     */
    valueSelection?: [number, number];

    /**
     * The text to display underneath the input box.
     */
    prompt?: string;

    /**
     * An optional string to show as placeholder in the input box to guide the user what to type.
     */
    placeHolder?: string;

    /**
     * Controls if a password input is shown. Password input hides the typed text.
     */
    password?: boolean;

    /**
     * Set to `true` to keep the input box open when focus moves to another part of the editor or to another window.
     * This setting is ignored on iPad and is always false.
     */
    ignoreFocusOut?: boolean;

    /**
     * An optional function that will be called to validate input and to give a hint
     * to the user.
     *
     * @param value The current value of the input box.
     * @return Either a human-readable string which is presented as an error message or an {@link InputBoxValidationMessage}
     *  which can provide a specific message severity. Return `undefined`, `null`, or the empty string when 'value' is valid.
     */
    validateInput?(
      value: string,
    ):
      | string
      | InputBoxValidationMessage
      | undefined
      | null
      | Promise<string | InputBoxValidationMessage | undefined | null>;
  }

  /**
   * The kind of {@link QuickPickItem quick pick item}.
   */
  export enum QuickPickItemKind {
    /**
     * When a {@link QuickPickItem} has a kind of {@link Separator}, the item is just a visual separator and does not represent a real item.
     * The only property that applies is {@link QuickPickItem.label label }. All other properties on {@link QuickPickItem} will be ignored and have no effect.
     */
    Separator = -1,
    /**
     * The default {@link QuickPickItem.kind} is an item that can be selected in the quick pick.
     */
    Default = 0,
  }

  /**
   * Button for an action in a {@link QuickPick} or {@link InputBox}.
   */
  export interface QuickInputButton {
    /**
     * Icon for the button.
     */
    readonly iconPath: Uri | { light: Uri; dark: Uri };

    /**
     * An optional tooltip.
     */
    readonly tooltip?: string | undefined;
  }

  /**
   * Options to configure the behavior of the quick pick UI.
   */
  export interface QuickPickOptions {
    /**
     * An optional string that represents the title of the quick pick.
     */
    title?: string;

    /**
     * An optional flag to include the description when filtering the picks.
     */
    matchOnDescription?: boolean;

    /**
     * An optional flag to include the detail when filtering the picks.
     */
    matchOnDetail?: boolean;

    /**
     * An optional string to show as placeholder in the input box to guide the user what to pick on.
     */
    placeHolder?: string;

    /**
     * Set to `true` to keep the picker open when focus moves to another part of the editor or to another window.
     * This setting is ignored on iPad and is always false.
     */
    ignoreFocusOut?: boolean;

    /**
     * An optional flag to make the picker accept multiple selections, if true the result is an array of picks.
     */
    canPickMany?: boolean;

    /**
     * An optional function that is invoked whenever an item is selected.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDidSelectItem?(item: QuickPickItem | string): any;
  }

  /**
   * Represents an item that can be selected from
   * a list of items.
   */
  export interface QuickPickItem {
    /**
     * A human-readable string which is rendered prominent. Supports rendering of {@link ThemeIcon theme icons} via
     * the `$(<name>)`-syntax.
     */
    label: string;

    /**
     * The kind of QuickPickItem that will determine how this item is rendered in the quick pick. When not specified,
     * the default is {@link QuickPickItemKind.Default}.
     */
    kind?: QuickPickItemKind;

    /**
     * A human-readable string which is rendered less prominent in the same line. Supports rendering of
     * {@link ThemeIcon theme icons} via the `$(<name>)`-syntax.
     *
     * Note: this property is ignored when {@link QuickPickItem.kind kind} is set to {@link QuickPickItemKind.Separator}
     */
    description?: string;

    /**
     * A human-readable string which is rendered less prominent in a separate line. Supports rendering of
     * {@link ThemeIcon theme icons} via the `$(<name>)`-syntax.
     *
     * Note: this property is ignored when {@link QuickPickItem.kind kind} is set to {@link QuickPickItemKind.Separator}
     */
    detail?: string;

    /**
     * Optional flag indicating if this item is picked initially. This is only honored when using
     * the {@link window.showQuickPick showQuickPick()} API. To do the same thing with
     * the {@link window.createQuickPick createQuickPick()} API, simply set the {@link QuickPick.selectedItems}
     * to the items you want picked initially.
     * (*Note:* This is only honored when the picker allows multiple selections.)
     *
     * @see {@link QuickPickOptions.canPickMany}
     *
     * Note: this property is ignored when {@link QuickPickItem.kind kind} is set to {@link QuickPickItemKind.Separator}
     */
    picked?: boolean;

    /**
     * Always show this item.
     *
     * Note: this property is ignored when {@link QuickPickItem.kind kind} is set to {@link QuickPickItemKind.Separator}
     */
    alwaysShow?: boolean;

    /**
     * Optional buttons that will be rendered on this particular item. These buttons will trigger
     * an {@link QuickPickItemButtonEvent} when clicked. Buttons are only rendered when using a quickpick
     * created by the {@link window.createQuickPick createQuickPick()} API. Buttons are not rendered when using
     * the {@link window.showQuickPick showQuickPick()} API.
     *
     * Note: this property is ignored when {@link QuickPickItem.kind kind} is set to {@link QuickPickItemKind.Separator}
     */
    buttons?: readonly QuickInputButton[];
  }

  export interface NotificationOptions {
    /**
     * A title for the notification, which will be shown at the top of the notification window when it is shown.
     */
    title?: string;
    /**
     * The body text of the notification, which will be displayed below the title.
     */
    body?: string;
    /**
     * Whether or not to emit an OS notification noise when showing the notification.
     */
    silent?: boolean;
  }

  /**
   * Aligned to the left side.
   */
  export const StatusBarAlignLeft = 'LEFT';
  /**
   * Aligned to the right side.
   */
  export const StatusBarAlignRight = 'RIGHT';
  /**
   * Represents the alignment of status bar items.
   */
  export type StatusBarAlignment = typeof StatusBarAlignLeft | typeof StatusBarAlignRight;

  /**
   * Default priority for the status bar items.
   */
  export const StatusBarItemDefaultPriority = 0;

  /**
   * A status bar item is a status bar contribution that can
   * show text and icons and run a command on click.
   */
  export interface StatusBarItem {
    /**
     * The alignment of this item.
     */
    readonly alignment: StatusBarAlignment;
    /**
     * The priority of this item. Higher value means the item should be shown more to the left
     * or more to the right.
     */
    readonly priority: number;
    /**
     * The text to show for the entry.
     */
    text?: string;
    /**
     * The tooltip text when you hover over this entry.
     */
    tooltip?: string;
    /**
     * Icon class that is used to display the particular icon from the Font Awesome icon set.
     * Icon class should be in format e.g. 'fa fa-toggle-on'. It is possible to provide an icons
     * for state which can be enabled or disabled.
     */
    iconClass?: string | { active: string; inactive: string };
    /**
     * Marks an item as disabled. When property is set to true, then icon will be changed to inactive
     * and there won't be possible to execute a command if it is provided in the following configuration.
     */
    enabled: boolean;
    /**
     * The identifier of a command to run on click.
     */
    command?: string;
    /**
     * Arguments that the command handler should be invoked with.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commandArgs?: any[];
    /**
     * Shows the entry in the status bar.
     */
    show(): void;
    /**
     * Hides the entry in the status bar.
     */
    hide(): void;

    /**
     * Dispose and free associated resources. Call
     * {@link StatusBarItem.hide}.
     */
    dispose(): void;
  }

  /**
   * Resource identifier for a resource
   */
  export class Uri {
    private constructor(scheme: string, authority: string, path: string);
    static file(path: string): Uri;
    readonly fsPath: string;
    readonly authority: string;
    readonly scheme: string;
    toString(): string;
  }

  /**
   * Notifies changes on files or folders.
   */
  export interface FileSystemWatcher extends Disposable {
    readonly onDidCreate: Event<Uri>;
    readonly onDidChange: Event<Uri>;
    readonly onDidDelete: Event<Uri>;
  }

  export namespace fs {
    export function createFileSystemWatcher(path: string): FileSystemWatcher;
  }

  export namespace window {
    /**
     * Show an information message. Optionally provide an array of items which will be presented as
     * clickable buttons.
     *
     * @param message The message to show.
     * @param items A set of items that will be rendered as actions in the message.
     * @return A promise that resolves to the selected item or `undefined` when being dismissed.
     */
    export function showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;

    /**
     * Show a warning message. Optionally provide an array of items which will be presented as
     * clickable buttons.
     *
     * @param message The message to show.
     * @param items A set of items that will be rendered as actions in the message.
     * @return A promise that resolves to the selected item or `undefined` when being dismissed.
     */
    export function showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;

    /**
     * Show a error message. Optionally provide an array of items which will be presented as
     * clickable buttons.
     *
     * @param message The message to show.
     * @param items A set of items that will be rendered as actions in the message.
     * @return A promise that resolves to the selected item or `undefined` when being dismissed.
     */
    export function showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;

    export function withProgress<R>(
      options: ProgressOptions,
      task: (progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken) => Promise<R>,
    ): Promise<R>;

    /**
     * Show OS desktop notification
     * @param options
     */
    export function showNotification(options: NotificationOptions): Disposable;

    /**
     * Creates a status bar {@link StatusBarItem} item.
     *
     * @param alignment The alignment of the item.
     * @param priority The priority of the item. Higher values mean more to the left or more to the right.
     * @return A new status bar item.
     */
    export function createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;

    /**
     * Opens an input box to ask the user for input.
     *
     * The returned value will be `undefined` if the input box was canceled (e.g. pressing ESC). Otherwise the
     * returned value will be the string typed by the user or an empty string if the user did not type
     * anything but dismissed the input box with OK.
     *
     * @param options Configures the behavior of the input box.
     * @param token A token that can be used to signal cancellation.
     * @return A promise that resolves to a string the user provided or to `undefined` in case of dismissal.
     */
    export function showInputBox(options?: InputBoxOptions, token?: CancellationToken): Promise<string | undefined>;

    /**
     * Shows a selection list allowing multiple selections.
     *
     * @param items An array of strings, or a promise that resolves to an array of strings.
     * @param options Configures the behavior of the selection list.
     * @param token A token that can be used to signal cancellation.
     * @return A promise that resolves to the selected items or `undefined`.
     */
    export function showQuickPick(
      items: readonly string[] | Promise<readonly string[]>,
      options: QuickPickOptions & { canPickMany: true },
      token?: CancellationToken,
    ): Promise<string[] | undefined>;

    /**
     * Shows a selection list.
     *
     * @param items An array of strings, or a promise that resolves to an array of strings.
     * @param options Configures the behavior of the selection list.
     * @param token A token that can be used to signal cancellation.
     * @return A promise that resolves to the selection or `undefined`.
     */
    export function showQuickPick(
      items: readonly string[] | Promise<readonly string[]>,
      options?: QuickPickOptions,
      token?: CancellationToken,
    ): Promise<string | undefined>;

    /**
     * Shows a selection list allowing multiple selections.
     *
     * @param items An array of items, or a promise that resolves to an array of items.
     * @param options Configures the behavior of the selection list.
     * @param token A token that can be used to signal cancellation.
     * @return A promise that resolves to the selected items or `undefined`.
     */
    export function showQuickPick<T extends QuickPickItem>(
      items: readonly T[] | Promise<readonly T[]>,
      options: QuickPickOptions & { canPickMany: true },
      token?: CancellationToken,
    ): Promise<T[] | undefined>;

    /**
     * Shows a selection list.
     *
     * @param items An array of items, or a promise that resolves to an array of items.
     * @param options Configures the behavior of the selection list.
     * @param token A token that can be used to signal cancellation.
     * @return A promise that resolves to the selected item or `undefined`.
     */
    export function showQuickPick<T extends QuickPickItem>(
      items: readonly T[] | Promise<readonly T[]>,
      options?: QuickPickOptions,
      token?: CancellationToken,
    ): Promise<T | undefined>;
  }

  export namespace kubernetes {
    // Path to the configuration file
    export function getKubeconfig(): Uri;
    export const onDidUpdateKubeconfig: Event<KubeconfigUpdateEvent>;
    export function setKubeconfig(kubeconfig: Uri): Promise<void>;
  }
  /**
   * An event describing the update in kubeconfig location
   */
  export interface KubeconfigUpdateEvent {
    readonly type: 'CREATE' | 'UPDATE' | 'DELETE';
    readonly location: Uri;
  }

  export interface ContainerInfo {
    engineId: string;
    engineName: string;
    engineType: 'podman' | 'docker';
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Command: string;
    Created: number;
    Ports: Port[];
    Labels: { [label: string]: string };
    State: string;
    Status: string;
    HostConfig: {
      NetworkMode: string;
    };
    NetworkSettings: {
      Networks: { [networkType: string]: NetworkInfo };
    };
    Mounts: Array<{
      Name?: string | undefined;
      Type: string;
      Source: string;
      Destination: string;
      Driver?: string | undefined;
      Mode: string;
      RW: boolean;
      Propagation: string;
    }>;
  }

  interface Port {
    IP: string;
    PrivatePort: number;
    PublicPort: number;
    Type: string;
  }

  interface NetworkInfo {
    IPAMConfig?: unknown;
    Links?: unknown;
    Aliases?: unknown;
    NetworkID: string;
    EndpointID: string;
    Gateway: string;
    IPAddress: string;
    IPPrefixLen: number;
    IPv6Gateway: string;
    GlobalIPv6Address: string;
    GlobalIPv6PrefixLen: number;
    MacAddress: string;
  }

  interface AuthConfig {
    username: string;
    password: string;
    serveraddress: string;
    email?: string | undefined;
  }

  interface RegistryConfig {
    [registryAddress: string]: {
      username: string;
      password: string;
    };
  }

  interface PortBinding {
    HostIp?: string | undefined;
    HostPort?: string | undefined;
  }

  interface PortMap {
    [key: string]: PortBinding[];
  }

  interface HostRestartPolicy {
    Name: string;
    MaximumRetryCount?: number | undefined;
  }

  interface HostConfig {
    AutoRemove?: boolean | undefined;
    Binds?: string[] | undefined;
    ContainerIDFile?: string | undefined;
    LogConfig?:
      | {
          Type: string;
          Config: unknown;
        }
      | undefined;
    NetworkMode?: string | undefined;
    PortBindings?: unknown;
    RestartPolicy?: HostRestartPolicy | undefined;
    VolumeDriver?: string | undefined;
    VolumesFrom?: unknown;
    Mounts?: MountConfig | undefined;
    CapAdd?: unknown;
    CapDrop?: unknown;
    Dns?: unknown[] | undefined;
    DnsOptions?: unknown[] | undefined;
    DnsSearch?: string[] | undefined;
    ExtraHosts?: unknown;
    GroupAdd?: string[] | undefined;
    IpcMode?: string | undefined;
    Cgroup?: string | undefined;
    Links?: unknown;
    OomScoreAdj?: number | undefined;
    PidMode?: string | undefined;
    Privileged?: boolean | undefined;
    PublishAllPorts?: boolean | undefined;
    ReadonlyRootfs?: boolean | undefined;
    SecurityOpt?: unknown;
    StorageOpt?: { [option: string]: string } | undefined;
    Tmpfs?: { [dir: string]: string } | undefined;
    UTSMode?: string | undefined;
    UsernsMode?: string | undefined;
    ShmSize?: number | undefined;
    Sysctls?: { [index: string]: string } | undefined;
    Runtime?: string | undefined;
    ConsoleSize?: number[] | undefined;
    Isolation?: string | undefined;
    MaskedPaths?: string[] | undefined;
    ReadonlyPaths?: string[] | undefined;
    CpuShares?: number | undefined;
    CgroupParent?: string | undefined;
    BlkioWeight?: number | undefined;
    BlkioWeightDevice?: unknown;
    BlkioDeviceReadBps?: unknown;
    BlkioDeviceWriteBps?: unknown;
    BlkioDeviceReadIOps?: unknown;
    BlkioDeviceWriteIOps?: unknown;
    CpuPeriod?: number | undefined;
    CpuQuota?: number | undefined;
    CpusetCpus?: string | undefined;
    CpusetMems?: string | undefined;
    Devices?: unknown;
    DeviceCgroupRules?: string[] | undefined;
    DeviceRequests?: DeviceRequest[] | undefined;
    DiskQuota?: number | undefined;
    KernelMemory?: number | undefined;
    Memory?: number | undefined;
    MemoryReservation?: number | undefined;
    MemorySwap?: number | undefined;
    MemorySwappiness?: number | undefined;
    NanoCpus?: number | undefined;
    OomKillDisable?: boolean | undefined;
    Init?: boolean | undefined;
    PidsLimit?: number | undefined;
    Ulimits?: unknown;
    CpuCount?: number | undefined;
    CpuPercent?: number | undefined;
    CpuRealtimePeriod?: number | undefined;
    CpuRealtimeRuntime?: number | undefined;
  }

  export interface ContainerInspectInfo {
    engineId: string;
    engineName: string;
    Id: string;
    Created: string;
    Path: string;
    Args: string[];
    State: {
      Status: string;
      Running: boolean;
      Paused: boolean;
      Restarting: boolean;
      OOMKilled: boolean;
      Dead: boolean;
      Pid: number;
      ExitCode: number;
      Error: string;
      StartedAt: string;
      FinishedAt: string;
      Health?:
        | {
            Status: string;
            FailingStreak: number;
            Log: Array<{
              Start: string;
              End: string;
              ExitCode: number;
              Output: string;
            }>;
          }
        | undefined;
    };
    Image: string;
    ResolvConfPath: string;
    HostnamePath: string;
    HostsPath: string;
    LogPath: string;
    Name: string;
    RestartCount: number;
    Driver: string;
    Platform: string;
    MountLabel: string;
    ProcessLabel: string;
    AppArmorProfile: string;
    ExecIDs?: string[] | undefined;
    HostConfig: HostConfig;
    GraphDriver: {
      Name: string;
      Data: {
        DeviceId: string;
        DeviceName: string;
        DeviceSize: string;
      };
    };
    Mounts: Array<{
      Name?: string | undefined;
      Source: string;
      Destination: string;
      Mode: string;
      RW: boolean;
      Propagation: string;
    }>;
    Config: {
      Hostname: string;
      Domainname: string;
      User: string;
      AttachStdin: boolean;
      AttachStdout: boolean;
      AttachStderr: boolean;
      ExposedPorts: { [portAndProtocol: string]: unknown };
      Tty: boolean;
      OpenStdin: boolean;
      StdinOnce: boolean;
      Env: string[];
      Cmd: string[];
      Image: string;
      Volumes: { [volume: string]: unknown };
      WorkingDir: string;
      Entrypoint?: string | string[] | undefined;
      OnBuild?: unknown;
      Labels: { [label: string]: string };
    };
    NetworkSettings: {
      Bridge: string;
      SandboxID: string;
      HairpinMode: boolean;
      LinkLocalIPv6Address: string;
      LinkLocalIPv6PrefixLen: number;
      Ports: {
        [portAndProtocol: string]: Array<{
          HostIp: string;
          HostPort: string;
        }>;
      };
      SandboxKey: string;
      SecondaryIPAddresses?: unknown;
      SecondaryIPv6Addresses?: unknown;
      EndpointID: string;
      Gateway: string;
      GlobalIPv6Address: string;
      GlobalIPv6PrefixLen: number;
      IPAddress: string;
      IPPrefixLen: number;
      IPv6Gateway: string;
      MacAddress: string;
      Networks: {
        [type: string]: {
          IPAMConfig?: unknown;
          Links?: unknown;
          Aliases?: unknown;
          NetworkID: string;
          EndpointID: string;
          Gateway: string;
          IPAddress: string;
          IPPrefixLen: number;
          IPv6Gateway: string;
          GlobalIPv6Address: string;
          GlobalIPv6PrefixLen: number;
          MacAddress: string;
        };
      };
      Node?:
        | {
            ID: string;
            IP: string;
            Addr: string;
            Name: string;
            Cpus: number;
            Memory: number;
            Labels: unknown;
          }
        | undefined;
    };
  }

  interface ContainerJSONEvent {
    type: string;
    status: string;
    id: string;
    Type?: string;
  }

  export namespace containerEngine {
    export function listContainers(): Promise<ContainerInfo[]>;
    export function inspectContainer(engineId: string, id: string): Promise<ContainerInspectInfo>;
    export function saveImage(engineId: string, id: string, filename: string): Promise<void>;
    export const onEvent: Event<ContainerJSONEvent>;
  }

  /**
   * Represents a session of a currently logged in user.
   */
  export interface AuthenticationSession {
    /**
     * The identifier of the authentication session.
     */
    readonly id: string;

    /**
     * The access token.
     */
    readonly accessToken: string;

    /**
     * The account associated with the session.
     */
    readonly account: AuthenticationSessionAccountInformation;

    /**
     * The permissions granted by the session's access token. Available scopes
     * are defined by the [AuthenticationProvider](#AuthenticationProvider).
     */
    readonly scopes: ReadonlyArray<string>;
  }

  /**
   * The information of an account associated with an [AuthenticationSession](#AuthenticationSession).
   */
  export interface AuthenticationSessionAccountInformation {
    /**
     * The unique identifier of the account.
     */
    readonly id: string;

    /**
     * The human-readable name of the account.
     */
    readonly label: string;
  }

  /**
   * Options to be used when getting an [AuthenticationSession](#AuthenticationSession) from an [AuthenticationProvider](#AuthenticationProvider).
   */
  export interface AuthenticationGetSessionOptions {
    /**
     * Whether login should be performed if there is no matching session.
     *
     * If true, a modal dialog will be shown asking the user to sign in. If false, a numbered badge will be shown
     * on the accounts activity bar icon. An entry for the extension will be added under the menu to sign in. This
     * allows quietly prompting the user to sign in.
     *
     * If there is a matching session but the extension has not been granted access to it, setting this to true
     * will also result in an immediate modal dialog, and false will add a numbered badge to the accounts icon.
     *
     * Defaults to false.
     */
    createIfNone?: boolean;

    /**
     * Whether the existing user session preference should be cleared.
     *
     * For authentication providers that support being signed into multiple accounts at once, the user will be
     * prompted to select an account to use when [getSession](#authentication.getSession) is called. This preference
     * is remembered until [getSession](#authentication.getSession) is called with this flag.
     *
     * Defaults to false.
     */
    clearSessionPreference?: boolean;

    /**
     * Whether we should attempt to reauthenticate even if there is already a session available.
     *
     * If true, a modal dialog will be shown asking the user to sign in again. This is mostly used for scenarios
     * where the token needs to be re minted because it has lost some authorization.
     *
     * If there are no existing sessions and forceNewSession is true, it will behave identically to
     * {@link AuthenticationGetSessionOptions.createIfNone createIfNone}.
     *
     * This defaults to false.
     */
    forceNewSession?: boolean | { detail: string };

    /**
     * Whether we should show the indication to sign in in the Accounts menu.
     *
     * If false, the user will be shown a badge on the Accounts menu with an option to sign in for the extension.
     * If true, no indication will be shown.
     *
     * Defaults to false.
     *
     * Note: you cannot use this option with any other options that prompt the user like {@link AuthenticationGetSessionOptions.createIfNone createIfNone}.
     */
    silent?: boolean;
  }

  /**
   * Basic information about an [authenticationProvider](#AuthenticationProvider)
   */
  export interface AuthenticationProviderInformation {
    /**
     * The unique identifier of the authentication provider.
     */
    readonly id: string;

    /**
     * The human-readable name of the authentication provider.
     */
    readonly label: string;
  }

  /**
   * An [event](#Event) which fires when an [AuthenticationSession](#AuthenticationSession) is added, removed, or changed.
   */
  export interface AuthenticationSessionsChangeEvent {
    /**
     * The [authenticationProvider](#AuthenticationProvider) that has had its sessions change.
     */
    readonly provider: AuthenticationProviderInformation;
  }

  /**
   * Options for creating an [AuthenticationProvider](#AuthenticationProvider).
   */
  export interface AuthenticationProviderOptions {
    /**
     * Whether it is possible to be signed into multiple accounts at once with this provider.
     * If not specified, will default to false.
     */
    readonly supportsMultipleAccounts?: boolean;
  }

  /**
   * An [event](#Event) which fires when an [AuthenticationSession](#AuthenticationSession) is added, removed, or changed.
   */
  export interface AuthenticationProviderAuthenticationSessionsChangeEvent {
    /**
     * The [AuthenticationSession](#AuthenticationSession)s of the [AuthenticationProvider](#AuthentiationProvider) that have been added.
     */
    readonly added?: ReadonlyArray<AuthenticationSession>;

    /**
     * The [AuthenticationSession](#AuthenticationSession)s of the [AuthenticationProvider](#AuthentiationProvider) that have been removed.
     */
    readonly removed?: ReadonlyArray<AuthenticationSession>;

    /**
     * The [AuthenticationSession](#AuthenticationSession)s of the [AuthenticationProvider](#AuthentiationProvider) that have been changed.
     * A session changes when its data excluding the id are updated. An example of this is a session refresh that results in a new
     * access token being set for the session.
     */
    readonly changed?: ReadonlyArray<AuthenticationSession>;
  }

  /**
   * A dialog that can be used to notify autentication provider about 
   * the closure of the authentication request and to allow the to cancel it.
   */
  export interface AuthenticationDialog extends Disposable {
    onDidClose: Event<void>;
  }

  /**
   * A provider for performing authentication to a service.
   */
  export interface AuthenticationProvider {
    /**
     * An [event](#Event) which fires when the array of sessions has changed, or data
     * within a session has changed.
     */
    readonly onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent>;

    /**
     * Get a list of sessions.
     * @param scopes An optional list of scopes. If provided, the sessions returned should match
     * these permissions, otherwise all sessions should be returned.
     * @returns A promise that resolves to an array of authentication sessions.
     */
    getSessions(scopes?: string[]): Promise<ReadonlyArray<AuthenticationSession>>;

    /**
     * Prompts a user to login.
     *
     * If login is successful, the onDidChangeSessions event should be fired.
     *
     * If login fails, a rejected promise should be returned.
     *
     * If the provider has specified that it does not support multiple accounts,
     * then this should never be called if there is already an existing session matching these
     * scopes.
     * @param scopes A list of scopes, permissions, that the new session should be created with.
     * @param requestAuthenticationDialogCallback A callback that will be called when the provider needs to show a dialog to the user.
     * @returns A promise that resolves to an authentication session.
     */
    createSession(scopes: string[], requestAuthenticationDialogCallback?: (url: string) => Promise<AuthenticationDialog>): Promise<AuthenticationSession>;

    /**
     * Removes the session corresponding to session id.
     *
     * If the removal is successful, the onDidChangeSessions event should be fired.
     *
     * If a session cannot be removed, the provider should reject with an error message.
     * @param sessionId The id of the session to remove.
     */
    removeSession(sessionId: string): Promise<void>;
  }

  /**
   * Namespace for authentication.
   */
  export namespace authentication {
    /**
     * Get an authentication session matching the desired scopes. Rejects if a provider with providerId is not
     * registered, or if the user does not consent to sharing authentication information with
     * the extension. If there are multiple sessions with the same scopes, the user will be shown a
     * quickpick to select which account they would like to use.
     *
     * Currently, there are only two authentication providers that are contributed from built in extensions
     * to VS Code that implement GitHub and Microsoft authentication: their providerId's are 'github' and 'microsoft'.
     * @param providerId The id of the provider to use
     * @param scopes A list of scopes representing the permissions requested. These are dependent on the authentication provider
     * @param options The [getSessionOptions](#GetSessionOptions) to use
     * @returns A promise that resolves to an authentication session
     */
    export function getSession(
      providerId: string,
      scopes: string[],
      options: AuthenticationGetSessionOptions & { createIfNone: true },
    ): Promise<AuthenticationSession | undefined>;

    /**
     * Get an authentication session matching the desired scopes. Rejects if a provider with providerId is not
     * registered, or if the user does not consent to sharing authentication information with
     * the extension. If there are multiple sessions with the same scopes, the user will be shown a
     * quickpick to select which account they would like to use.
     *
     * Currently, there are only two authentication providers that are contributed from built in extensions
     * to VS Code that implement GitHub and Microsoft authentication: their providerId's are 'github' and 'microsoft'.
     * @param providerId The id of the provider to use
     * @param scopes A list of scopes representing the permissions requested. These are dependent on the authentication provider
     * @param options The [getSessionOptions](#GetSessionOptions) to use
     * @returns A promise that resolves to an authentication session if available, or undefined if there are no sessions
     */
    export function getSession(
      providerId: string,
      scopes: string[],
      options?: AuthenticationGetSessionOptions,
    ): Promise<AuthenticationSession | undefined>;

    /**
     * An [event](#Event) which fires when the authentication sessions of an authentication provider have
     * been added, removed, or changed.
     */
    export const onDidChangeSessions: Event<AuthenticationSessionsChangeEvent>;

    /**
     * Register an authentication provider.
     *
     * There can only be one provider per id and an error is being thrown when an id
     * has already been used by another provider. Ids are case-sensitive.
     *
     * @param id The unique identifier of the provider.
     * @param label The human-readable name of the provider.
     * @param provider The authentication provider provider.
     * @params options Additional options for the provider.
     * @return A [disposable](#Disposable) that unregisters this provider when being disposed.
     */
    export function registerAuthenticationProvider(
      id: string,
      label: string,
      provider: AuthenticationProvider,
      options?: AuthenticationProviderOptions,
    ): Disposable;
  }
}
