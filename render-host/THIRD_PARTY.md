# Third-party notices

## Chromium Embedded Framework (CEF)

This product uses the Chromium Embedded Framework (https://bitbucket.org/chromiumembedded/cef),
© Marshall A. Greenblatt, distributed under the New BSD License. CEF bundles Chromium and its
many third-party components (BSD/MIT/LGPL and others); the full set of notices ships in the CEF
binary distribution (`LICENSE.txt` and `cef_license.txt` under the downloaded CEF directory) and
must accompany any distributed build.

The CEF binaries are downloaded at build time by the `cef-dll-sys` crate and are not vendored in
this repository.
