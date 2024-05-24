import fs from 'fs';
import path from 'path';

import {Head, Html, Main, NextScript} from 'next/document';

import {
  ELEMENT_ID,
  INSTANCE_ID_PLACEHOLDER,
  LIVE_DATA_POLL_RATE_PLACEHOLDER,
  PREFIX_PLACEHOLDER,
  TELEMETRY_PLACEHOLDER,
} from '../extractInitializationData';

function getSecurityPolicy() {
  return fs.readFileSync(path.join(__dirname, '../../../csp-header-dev.txt'), {encoding: 'utf8'});
}

// eslint-disable-next-line import/no-default-export
export default function Document() {
  const isDev = process.env.NODE_ENV === 'development';
  const values = {
    pathPrefix: PREFIX_PLACEHOLDER,
    telemetryEnabled: TELEMETRY_PLACEHOLDER,
    liveDataPollRate: LIVE_DATA_POLL_RATE_PLACEHOLDER,
    instanceId: isDev ? 'dev' : INSTANCE_ID_PLACEHOLDER,
  };
  return (
    <Html lang="en">
      <Head nonce="NONCE-PLACEHOLDER">
        <script
          nonce="NONCE-PLACEHOLDER"
          dangerouslySetInnerHTML={{
            __html: 'window.__webpack_public_path__ = "__PATH_PREFIX__"',
          }}
        />
        {/* Not sure if we need the following script */}
        <script
          id="webpack-nonce-setter"
          nonce="NONCE-PLACEHOLDER"
          dangerouslySetInnerHTML={{__html: `__webpack_nonce__ = 'NONCE-PLACEHOLDER';`}}
        />
        {isDev ? <meta httpEquiv="Content-Security-Policy" content={getSecurityPolicy()} /> : null}
        <script
          type="application/json"
          id={ELEMENT_ID}
          nonce="NONCE-PLACEHOLDER"
          // Very silly but the python tests expects to find "pathPrefix": "/dagster-path"" on a single line soo
          // format the json...
          dangerouslySetInnerHTML={{__html: JSON.stringify(values, null, 2)}}
        />
        <link
          rel="manifest"
          href={`${process.env.NEXT_PUBLIC_URL ?? ''}/manifest.json`}
          crossOrigin="use-credentials"
        />
        <link
          rel="icon"
          type="image/png"
          href={`${process.env.NEXT_PUBLIC_URL ?? ''}/favicon.png`}
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href={`${process.env.NEXT_PUBLIC_URL ?? ''}/favicon.svg`}
        />
      </Head>
      <body>
        <Main />
        <NextScript nonce="NONCE-PLACEHOLDER" />
      </body>
    </Html>
  );
}
