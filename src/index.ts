#!/usr/bin/env node

import {existsSync} from 'fs';
import * as jetpack from 'fs-jetpack';
import {mkdir, readFile, writeFile} from 'fs/promises';
import * as npmchecker from 'license-checker';
import * as os from 'os';
import {basename, join, resolve} from 'path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const licenseCheckerCustomFormat = {
    name: '',
    version: '',
    description: '',
    repository: '',
    publisher: '',
    email: '',
    url: '',
    licenses: '',
    licenseFile: '',
    licenseModified: false,
};

function getAttributionForAuthor(a: any) {
    return typeof a === 'string'
        ? a
        : a.name + (a.email || a.homepage || a.url ? ` <${a.email || a.homepage || a.url}>` : '');
}

async function readArgs() {
    const setupYargs = yargs(hideBin(process.argv))
        .usage(
            'Calculate the npm and bower modules used in this project and generate a third-party attribution (credits) text.',
        )
        .alias('o', 'outputDir')
        .string('outputDir')
        .default('outputDir', './oss-attribution')
        .alias('b', 'baseDir')
        .array('baseDir')
        .default('baseDir', process.cwd())
        .boolean('help')
        .example(
            '$0 -o ./tpn',
            'run the tool and output text and backing json to ${projectRoot}/tpn directory.',
        )
        .example(
            '$0 -b ./some/path/to/projectDir',
            'run the tool for Bower/NPM projects in another directory.',
        )
        .example(
            '$0 -o tpn -b ./some/path/to/projectDir',
            'run the tool in some other directory and dump the output in a directory called "tpn" there.',
        );

    const args = await setupYargs.argv;

    if (args.help) {
        setupYargs.showHelp();
        process.exit(1);
    }

    return args;
}

async function getNpmLicenses(baseDirs: string[]) {
    const npmDirs = baseDirs.filter((dir) => {
        if (!existsSync(join(dir, 'package.json'))) {
            console.error(
                `Directory at "${dir}" does not look like an NPM project, skipping NPM checks for it.`,
            );
            return false;
        }

        return true;
    });

    console.log(`Looking at directories:\n\t${npmDirs.join('\n\t')}`);

    const rawResults = await Promise.all(
        npmDirs.map(async (dir) => {
            return new Promise((resolve, reject) => {
                npmchecker.init(
                    {
                        start: dir,
                        production: true,
                        customFormat: licenseCheckerCustomFormat,
                    },
                    (error, json) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            Object.getOwnPropertyNames(json).forEach((k) => {
                                (json[k] as any).dir = dir;
                            });
                            resolve(json);
                        }
                    },
                );
            });
        }),
    );

    // the result is passed in as an array, one element per npmDir passed in
    // de-dupe the entries and merge it into a single object
    let result: any = {};
    for (let i = 0; i < rawResults.length; i++) {
        result = Object.assign(rawResults[i]!, result);
    }

    // we want to exclude the top-level project from being included
    const dir = result[Object.keys(result)[0]!]['dir'];
    const topLevelProjectInfo = JSON.parse((await readFile(join(dir, 'package.json'))).toString());
    const keys = Object.getOwnPropertyNames(result).filter((k) => {
        return k !== `${topLevelProjectInfo.name}@${topLevelProjectInfo.version}`;
    });

    return Promise.all(
        keys.map(async (key) => {
            console.log('processing', key);

            const packageName = result[key];
            const defaultPackagePath = `${packageName['dir']}/node_modules/${packageName.name}/package.json`;

            const itemAtPath = jetpack.exists(defaultPackagePath);
            let packagePath = [defaultPackagePath];

            if (itemAtPath !== 'file') {
                packagePath = jetpack.find(packageName['dir'], {
                    matching: `**/node_modules/${packageName.name}/package.json`,
                });
            }

            let packageJson: any = {};

            if (packagePath && packagePath[0]) {
                packageJson = JSON.parse((await readFile(packagePath[0])).toString());
            } else {
                return Promise.reject(`${packageName.name}: unable to locate package.json`);
            }

            console.log('processing', packageJson.name, 'for authors and licenseText');

            const props: any = {};

            props.authors =
                (packageJson.author && getAttributionForAuthor(packageJson.author)) ||
                (packageJson.contributors &&
                    packageJson.contributors
                        .map((contributor: any) => {
                            return getAttributionForAuthor(contributor);
                        })
                        .join(', ')) ||
                (packageJson.maintainers &&
                    packageJson.maintainers
                        .map((maintainer: any) => {
                            return getAttributionForAuthor(maintainer);
                        })
                        .join(', '));

            const licenseFile = packageName.licenseFile;

            try {
                if (
                    licenseFile &&
                    existsSync(licenseFile) &&
                    basename(licenseFile).match(/license/i)
                ) {
                    props.licenseText = jetpack.read(licenseFile);
                } else {
                    props.licenseText = '';
                }
            } catch (e) {
                console.warn(e);

                return {
                    authors: '',
                    licenseText: '',
                };
            }

            return {
                ignore: false,
                name: packageName.name,
                version: packageName.version,
                authors: props.authors,
                url: packageName.repository,
                license: packageName.licenses,
                licenseText: props.licenseText,
            };
        }),
    );
}

async function main() {
    const inputs = await readArgs();

    /** MAIN */

    // sanitize inputs
    const options = {
        baseDir: [] as string[],
        outputDir: resolve(inputs.outputDir),
    };

    for (let i = 0; i < inputs.baseDir.length; i++) {
        options.baseDir.push(resolve(inputs.baseDir[i]!));
    }

    let npmOutput = (await getNpmLicenses(options.baseDir)) || {};

    const userOverridesPath = join(options.outputDir, 'overrides.json');
    if (existsSync(userOverridesPath)) {
        const userOverrides = jetpack.read(userOverridesPath, 'json');
        console.log('using overrides:', userOverrides);
        // foreach override, loop through the properties and assign them to the base object.
        npmOutput = {
            ...npmOutput,
            ...userOverrides,
        };
    }

    const licenseInfos = npmOutput;
    const attributionSequence = licenseInfos
        .filter((licenseInfo) => {
            return !licenseInfo.ignore && licenseInfo.name != undefined;
        })
        .sort((a, b) => {
            return (a.name.toLowerCase() as string).localeCompare(b.name.toLowerCase());
        })
        .map((licenseInfo) => {
            return [
                licenseInfo.name,
                `${licenseInfo.version} <${licenseInfo.url}>`,
                licenseInfo.licenseText ||
                    `license: ${licenseInfo.license}${os.EOL}authors: ${licenseInfo.authors}`,
            ].join(os.EOL);
        });

    let attribution = attributionSequence.join(
        `${os.EOL}${os.EOL}******************************${os.EOL}${os.EOL}`,
    );

    const headerPath = join(options.outputDir, 'header.txt');

    if (existsSync(headerPath)) {
        const template = jetpack.read(headerPath);
        console.log('using template', template);
        attribution = template + os.EOL + os.EOL + attribution;
    }

    !existsSync(options.outputDir) && (await mkdir(options.outputDir));

    await writeFile(join(options.outputDir, 'licenseInfos.json'), JSON.stringify(licenseInfos));

    await writeFile(join(options.outputDir, 'attribution.txt'), attribution);
    console.log('done');
}

main();
