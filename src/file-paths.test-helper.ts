import {dirname, join} from 'path';

const repoRootDirPath = dirname(__dirname);
export const testFilesDirPath = join(repoRootDirPath, 'test-files');

export const expectedOutputDirPath = join(testFilesDirPath, 'expected-oss-attribution');
export const actualOutputDirPath = join(testFilesDirPath, 'oss-attribution');
