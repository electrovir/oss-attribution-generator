const {baseConfig} = require('virmator/base-configs/base-cspell.js');

module.exports = {
    ...baseConfig,
    ignorePaths: [
        ...baseConfig.ignorePaths,
        'test-files/*oss-attribution',
    ],
    words: [
        ...baseConfig.words,
        'jetpack',
        'licensecheck',
        'npmchecker',
        'zumwald',
        'Zumwalt',
    ],
};
