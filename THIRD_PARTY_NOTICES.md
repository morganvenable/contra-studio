# Third-party material

The MIT license in LICENSE covers Contra Studio's original implementation and
documentation. Third-party material retains its own attribution and terms.

## Libraries

The current package-lock.json declares only MIT, Apache-2.0, BSD-3-Clause and ISC
licenses across its locked dependencies. No dependency in that lockfile declares
GPL, LGPL or AGPL. This is a lockfile inventory, not a review of every installed
package file. Preserve the license notices supplied with distributed libraries.

- Three.js: MIT (the application's runtime dependency).
- TypeScript and Playwright: Apache-2.0 (development tools).
- Vite, Rollup and esbuild: MIT (build tools).
- Other transitive dependency declarations are recorded in package-lock.json.

## Dance records and attribution

Source choreography, author credits, retained public-page HTML, and embedded
source snapshots are third-party data; this project's MIT license does not
relicense those works. This applies to test-data source records, the source data
embedded in src/ready-library.ts, and public/contradb-index.json. Keep each
record's authorship, status, provenance and any permission information intact.
Public access alone is not recorded permission to redistribute choreography.

ContraDB's server software is AGPL-3.0. Contra Studio does not bundle or depend on
that server implementation. Its reader and bounded public-page gateway are
independently written. References to AGPL in source provenance describe the
upstream software, not the license of Contra Studio. Do not copy upstream server
code into this project.

Before a new public distribution, review the included third-party source-data
set separately from the MIT code. Do not replace an unknown data permission with
an MIT label merely because the original application code is MIT.
