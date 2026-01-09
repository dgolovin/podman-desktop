/**********************************************************************
 * Copyright (C) 2022-2026 Red Hat, Inc.
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

import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import * as tls from 'node:tls';

import { injectable } from 'inversify';
import { X509 } from 'jsrsasign';
import wincaAPI from 'win-ca/api';

import { isLinux, isMac, isWindows } from '/@/util.js';
import type { CertificateInfo } from '/@api/certificate-info.js';

import { spawnWithPromise } from './util/spawn-promise.js';

/**
 * Provides access to the certificates of the underlying platform.
 * It supports Linux, Windows and MacOS.
 */
@injectable()
export class Certificates {
  private allCertificates: string[] = [];

  /**
   * Setup all certificates globally depending on the platform.
   */
  async init(): Promise<void> {
    this.allCertificates = await this.retrieveCertificates();

    // initialize the certificates globally
    https.globalAgent.options.ca = this.allCertificates;
  }

  getAllCertificates(): string[] {
    return this.allCertificates;
  }

  async retrieveCertificates(): Promise<string[]> {
    if (isMac()) {
      return this.retrieveMacOSCertificates();
    } else if (isWindows()) {
      return this.retrieveWindowsCertificates();
    } else if (isLinux()) {
      return this.retrieveLinuxCertificates();
    }

    // else return default root certificates
    return [...tls.rootCertificates];
  }

  public extractCertificates(content: string): string[] {
    // need to create an array of text from the content starting by '-----BEGIN CERTIFICATE-----'
    // use a regexp
    return content.split(/(?=-----BEGIN CERTIFICATE-----)/g).filter(c => c.trim().length > 0);
  }

  async retrieveMacOSCertificates(): Promise<string[]> {
    const rootCertificates = await this.getMacOSCertificates(
      '/System/Library/Keychains/SystemRootCertificates.keychain',
    );
    const userCertificates = await this.getMacOSCertificates();
    return rootCertificates.concat(userCertificates);
  }

  // get the certificates from the Windows certificate store
  async retrieveWindowsCertificates(): Promise<string[]> {
    // delegate to the win-ca module
    const winCaRetrieval = new Promise<string[]>(resolve => {
      const CAs: string[] = [...tls.rootCertificates];

      if (import.meta.env.PROD) {
        const rootExePath = path.join(process.resourcesPath, 'win-ca', 'roots.exe');
        wincaAPI.exe(rootExePath);
      } else {
        wincaAPI.exe(require.resolve('win-ca/lib/roots.exe'));
      }

      wincaAPI({
        format: wincaAPI.der2.pem,
        inject: false,
        store: ['root', 'ca'],
        ondata: (ca: string) => {
          CAs.push(ca);
        },
        onend: () => {
          resolve(CAs);
        },
      });
    });

    try {
      const result = await winCaRetrieval;
      // also do the patch on tls.createSecureContext()
      wincaAPI.inject('+');
      return result;
    } catch (error) {
      console.error('Error while retrieving Windows certificates', error);
      // return default root certificates
      return [...tls.rootCertificates];
    }
  }

  // grab the certificates from the Linux certificate store
  async retrieveLinuxCertificates(): Promise<string[]> {
    // certificates on Linux are stored in /etc/ssl/certs/ folder
    // for example
    // /etc/ssl/certs/ca-certificates.crt or /etc/ssl/certs/ca-bundle.crt
    const LINUX_FILES = ['/etc/ssl/certs/ca-certificates.crt', '/etc/ssl/certs/ca-bundle.crt'];

    // read the files and parse the content
    const certificates: string[] = [];
    for (const file of LINUX_FILES) {
      // if the file exists, read it
      if (fs.existsSync(file)) {
        const content = await fs.promises.readFile(file, { encoding: 'utf8' });
        try {
          this.extractCertificates(content).forEach(certificate => certificates.push(certificate));
        } catch (error) {
          console.log(`error while extracting certificates from ${file}`, error);
        }
      }
    }
    // remove any duplicates
    return certificates.filter((value, index, self) => self.indexOf(value) === index);
  }

  async getMacOSCertificates(key?: string): Promise<string[]> {
    const command = '/usr/bin/security';
    const spawnArgs = ['find-certificate', '-a', '-p'];
    // do we have an extra parameter
    if (key) {
      spawnArgs.push(key);
    }

    // call the spawn command (as we've lot ot output)
    const spawnResult = await spawnWithPromise(command, spawnArgs);
    if (spawnResult.error) {
      console.log('error while executing command', command, spawnArgs, spawnResult.error);
      return [];
    } else {
      try {
        return this.extractCertificates(spawnResult.stdout);
      } catch (error) {
        console.log('error while extracting certificates', error);
        return [];
      }
    }
  }

  /**
   * Parse a PEM-encoded certificate using jsrsasign.
   * @param pem The PEM-encoded certificate string.
   * @returns The parsed X509 certificate, or undefined if parsing fails.
   */
  parseCertificateFromPem(pem: string): X509 | undefined {
    try {
      const x509 = new X509();
      x509.readCertPEM(pem);
      return x509;
    } catch (error) {
      console.log('error while parsing certificate', error);
      return undefined;
    }
  }

  /**
   * Extract a specific RDN value from a DN array.
   * @param dnArray The DN array from jsrsasign (e.g., x509.getSubject().array)
   * @param type The RDN type to find (e.g., 'CN', 'O')
   */
  private getRDNValue(dnArray: Array<Array<{ type: string; value: string; ds: string }>>, type: string): string {
    for (const rdn of dnArray) {
      for (const attr of rdn) {
        if (attr.type === type) {
          return attr.value;
        }
      }
    }
    return '';
  }

  /**
   * Get display name from DN with fallback: CN → O → Full DN string
   */
  private getDisplayName(x509: X509, getSubjectOrIssuer: 'subject' | 'issuer'): string {
    const dn = getSubjectOrIssuer === 'subject' ? x509.getSubject() : x509.getIssuer();
    const dnArray = dn.array;

    const cn = this.getRDNValue(dnArray, 'CN');
    if (cn) return cn;

    const org = this.getRDNValue(dnArray, 'O');
    if (org) return org;

    return getSubjectOrIssuer === 'subject' ? x509.getSubjectString() : x509.getIssuerString();
  }

  /**
   * Parse jsrsasign date format (e.g., "240101120000Z") to Date object.
   */
  private parseX509Date(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    try {
      // jsrsasign returns dates in format: YYMMDDHHmmssZ or YYYYMMDDHHmmssZ
      let year: number;
      let rest: string;

      if (dateStr.length === 13) {
        // YYMMDDHHmmssZ format
        const yy = parseInt(dateStr.substring(0, 2), 10);
        year = yy >= 50 ? 1900 + yy : 2000 + yy;
        rest = dateStr.substring(2);
      } else if (dateStr.length === 15) {
        // YYYYMMDDHHmmssZ format
        year = parseInt(dateStr.substring(0, 4), 10);
        rest = dateStr.substring(4);
      } else {
        return undefined;
      }

      const month = parseInt(rest.substring(0, 2), 10) - 1;
      const day = parseInt(rest.substring(2, 4), 10);
      const hour = parseInt(rest.substring(4, 6), 10);
      const minute = parseInt(rest.substring(6, 8), 10);
      const second = parseInt(rest.substring(8, 10), 10);

      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } catch {
      return undefined;
    }
  }

  /**
   * Convert a jsrsasign X509 to a serializable CertificateInfo for IPC.
   * @param x509 The jsrsasign X509 object.
   * @param pem The original PEM string.
   * @returns The serializable certificate information.
   */
  toCertificateInfo(x509: X509, pem: string): CertificateInfo {
    // Get basicConstraints extension for isCA
    const basicConstraints = x509.getExtBasicConstraints();
    const isCA = basicConstraints?.cA ?? false;

    return {
      subjectCommonName: this.getDisplayName(x509, 'subject'),
      subject: x509.getSubjectString(),
      issuerCommonName: this.getDisplayName(x509, 'issuer'),
      issuer: x509.getIssuerString(),
      serialNumber: x509.getSerialNumberHex(),
      validFrom: this.parseX509Date(x509.getNotBefore()),
      validTo: this.parseX509Date(x509.getNotAfter()),
      isCA,
      pem,
    };
  }

  /**
   * Parse a PEM-encoded certificate and return serializable CertificateInfo.
   * @param pem The PEM-encoded certificate string.
   * @returns The parsed certificate information.
   */
  parseCertificate(pem: string): CertificateInfo {
    const x509 = this.parseCertificateFromPem(pem);
    if (x509) {
      return this.toCertificateInfo(x509, pem);
    }
    // Return minimal info for unparsable certificates
    return {
      subjectCommonName: 'Non parsable certificate',
      subject: 'Non parsable certificate',
      issuerCommonName: '',
      issuer: '',
      serialNumber: '',
      validFrom: undefined,
      validTo: undefined,
      isCA: false,
      pem,
    };
  }

  /**
   * Get all certificates as parsed CertificateInfo objects.
   * @returns An array of parsed certificate information.
   */
  getAllCertificateInfos(): CertificateInfo[] {
    return this.allCertificates.map(pem => this.parseCertificate(pem));
  }
}
