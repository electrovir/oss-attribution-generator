import {awaitedForEach} from 'augment-vir';
import {runShellCommand} from 'augment-vir/dist/cjs/node-only';
import {assert} from 'chai';
import {existsSync} from 'fs';
import {readdir, readFile} from 'fs/promises';
import {describe, it} from 'mocha';
import {join, resolve} from 'path';
import {
    actualOutputDirPath,
    expectedOutputDirPath,
    testFilesDirPath,
} from './file-paths.test-helper';

const tarToInstall = process.env.TAR_TO_INSTALL;

if (!tarToInstall) {
    console.error(`Failed to find process.env.TAR_TO_INSTALL`);
    process.exit(1);
}

describe(resolve(process.cwd(), __filename), () => {
    it('should produce expected output', async () => {
        await runShellCommand(
            `npm i --no-package-lock ${resolve(testFilesDirPath, tarToInstall)}`,
            {
                cwd: testFilesDirPath,
                rejectOnError: true,
            },
        );
        await runShellCommand(`npm test`, {
            cwd: testFilesDirPath,
            rejectOnError: true,
        });
        assert(existsSync(actualOutputDirPath));

        const outputFileNames = await readdir(actualOutputDirPath);

        await awaitedForEach(outputFileNames, async (fileName) => {
            const outputFilePath = join(actualOutputDirPath, fileName);
            const expectedFilePath = join(expectedOutputDirPath, fileName);

            const actualContents = (await readFile(outputFilePath)).toString();
            const expectedContents = (await readFile(expectedFilePath)).toString();

            assert.strictEqual(actualContents, expectedContents);
        });
    });
});
