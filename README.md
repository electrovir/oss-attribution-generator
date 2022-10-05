# @electrovir/oss-attribution-generator

Modified by [electrovir](https://github.com/electrovir) from [oss-attribution-generator](https://github.com/zumwald/oss-attribution-generator/tree/147dbae73dce1cf190460be6a0074552c2b7bc19) by [zumwald](https://github.com/zumwald).

Changes include:

-   no longer supports bower
-   updated dependencies that don't have vulnerabilities

Everything else should be the same.

Utility to parse npm packages used in a project and generate an attribution file to include in your product.

## Installation

```bash
npm i -D @electrovir/oss-attribution-generator
```

## Usage

### For a single Node project

```bash
cd pathToYourProject
npx generate-attribution
git add ./oss-attribution
git commit -m 'adding open source attribution output from oss-attribution-generator'
```

### For multiple projects

For Node.js projects that use other Node.js projects located in different directories, the `-b` option can be used to provide a variable number of input directories. Each of the input directories are processed, and any duplicate entries (dependencies with same name and version number) are combined to produce a single attribution text.

```bash
cd pathToYourMainProject
npx generate-attribution -b pathToYourMainProject pathToYourFirstProjectDependency pathToYourSecondProjectDependency
git add ./oss-attribution
git commit -m 'adding open source attribution output from oss-attribution-generator'
```

### Help

Use the `--help` argument to get further usage details about the various program arguments:

```bash
npx generate-attribution --help
```

### Understanding the "overrides"

#### Ignoring a package

Sometimes, you may have an "internal" module which you/your team developed, or a module where you've arranged a special license with the owner. These wouldn't belong in your license attributions, so you can ignore them by creating an `overrides.json` file like so:

```json
{
    "signaling-agent": {
        "ignore": true
    }
}
```

#### Changing the properties of package in the attribution file only

Other times, you may need to supply your own text for the purpose of the attribution/credits. You have full control of this in the `overrides.json` file as well:

```json
{
    "some-package": {
        "name": "some-other-package-name",
        "version": "1.0.0-other-version",
        "authors": "some person",
        "url": "https://thatwebsite.com/since/their/original/link/was/broken",
        "license": "MIT",
        "licenseText": "you can even override the license text in case the original contents of the LICENSE file were wrong for some reason"
    }
}
```

## Prior art

Like most software, this component is built on the shoulders of giants; @electrovir/oss-attribution-generator was inspired in part by the following work:

-   [The original oss-attribution-generator](https://github.com/zumwald/oss-attribution-generator)
-   [license-checker](https://github.com/davglass/license-checker)
-   [node-licensecheck](https://github.com/iceddev/node-licensecheck)
-   [bower-license](https://github.com/AceMetrix/bower-license)
