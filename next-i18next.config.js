const path = require('path');

module.exports = {
  i18n: {
    locales: ['en-US', 'zh-TW', 'zh-CN'],
    defaultLocale: 'zh-CN',
    localePath: path.resolve('./public/locales')
  },
};
