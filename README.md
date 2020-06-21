# webextension-manifest-loader <!-- omit in toc -->

[![npm version](https://img.shields.io/npm/v/webextension-manifest-loader.svg)](https://www.npmjs.com/package/webextension-manifest-loader)
[![node version](https://img.shields.io/node/v/webextension-manifest-loader.svg)](https://www.npmjs.com/package/webextension-manifest-loader)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

Webpack loader that loads browser tailored manifest.json. It also imports all importable properties, allowing you to have 'manifest.json' as your only webpack entry point.

**Use it together with [inert-entry-webpack-plugin][inert], [spawn-loader][spawn], and maybe [html-loader][html], more info below.**

## Table of Contents <!-- omit in toc -->

- [Getting Started](#getting-started)
  - [webpack.config.js](#webpackconfigjs)
- [Options](#options)
- [Example](#example)
  - [Configuration](#configuration)
    - [webpack.config.js (configuration)](#webpackconfigjs-configuration)
    - [manifest.json (configuration)](#manifestjson-configuration)
  - [Output if targetVendor == 'chrome'](#output-if-targetvendor--chrome)
  - [manifest.json (output)](#manifestjson-output)
- [FAQ](#faq)
  - [Which properties does it currently support?](#which-properties-does-it-currently-support)
  - [Are there any known limitation or problems?](#are-there-any-known-limitation-or-problems)
- [Related and thanks](#related-and-thanks)

## Getting Started

To begin, you'll need to install webextension-manifest-loader:

```
npm install --save-dev webextension-manifest-loader
```

Then add the loader to your webpack config. For example:

### webpack.config.js

```javascript
module.exports = {
  module: {
    rules: [
      {
        // Prevent json-loader from loading the file
        type: 'javascript/auto',
        test: /manifest\.json$/,
        use: [
          // webextension-manifest-loader returns a function for importing in a .js file,
          // convert it to a plain string and resolve imports using extract-loader
          'extract-loader',
          {
            loader: 'webextension-manifest-loader',
            options: {
              // Use the environment variable TARGET_VENDOR as the target vendor
              targetVendor: process.env.TARGET_VENDOR,
              // Merge some properties into the finished manifest.json
              merge: {
                // This could easily come from an import of your package.json
                version: '1.3.0',
              },
            },
          },
        ],
      },
    ],
  },
};
```

## Options

|        Name        |   Type   |   Default   | Description                                                                   |
| :----------------: | :------: | :---------: | :---------------------------------------------------------------------------- |
| **`targetVendor`** | `string` | `undefined` | Specify the target vendor, should be one of `firefox`,`chrome`,`edge`,`opera` |
|    **`merge`**     | `Object` |    `{}`     | Allows merging properties into the finished manifest.json                     |

## Example

See [jsmnbom/ao3-enhancements](https://github.com/jsmnbom/ao3-enhancements) <sup>([manifest.json](https://github.com/jsmnbom/ao3-enhancements/blob/main/src/manifest.json), [webpack.config.ts](https://github.com/jsmnbom/ao3-enhancements/blob/main/webpack.config.ts))</sup> for a fully featured example of using this loader together with typescript, vue (+vuetify) and pug.

### Configuration

**Make sure you're using [inert-entry-webpack-plugin][inert], otherwise webpack will try to output manifest.json as a javascript file, and that will obviously fail!**

#### webpack.config.js (configuration)

```javascript
module.exports = {
  entry: {
    manifest: './manifest.json',
  },
  module: {
    rules: [
      {
        // Prevent json-loader from loading the file
        type: 'javascript/auto',
        test: /manifest\.json$/,
        use: [
          // webextension-manifest-loader returns a function for importing in a .js file,
          // convert it to a plain string and resolve imports using extract-loader
          'extract-loader',
          {
            loader: 'webextension-manifest-loader',
            options: {
              // Use the environment variable TARGET_VENDOR as the target vendor
              targetVendor: process.env.TARGET_VENDOR,
              // Merge some properties into the finished manifest.json
              merge: {
                // This could easily come from an import of your package.json
                version: '1.3.0',
              },
            },
          },
        ],
      },
      {
        test: /\.html$/,
        use: [
          'file-loader?name=[path][name].html',
          'extract-loader',
          'html-loader',
        ],
      },
    ],
  },
  plugins: [new InertEntryPlugin()],
};
```

#### manifest.json (configuration)

Now you'll be able to specify vendors in your manifest.json keys and to import files.

```jsonc
{
  "manifest_version": 2,
  "version": "",
  "__firefox_icons__": {
    "48": "./icon.svg",
    "96": "./icon.svg"
  },
  "__chrome_icons__": {
    "48": "./icon-48.png",
    "96": "./icon-96.png"
  },
  "options_ui": {
    "page": "~spawn-loader?name=options_ui/index.html!./options_ui/index.html",
    "__firefox_browser_style__": false,
    "__chrome_chrome_style__": false
  },
  "content_scripts": [
    {
      "matches": [...],
      "__firefox_js__": [
        "~spawn-loader?name=content_script/index.js!./content_script/index.js"
      ],
      "__chrome_js__": [
        "~file-loader?name=[name].[ext]!webextension-polyfill/dist/browser-polyfill.min.js",
        "~spawn-loader?name=content_script/index.js!./content_script/index.js"
      ],
      "css": ["./content_script/style.css"]
    }
  ]
}
```

Here we import `.svg` if compiling for firefox, but `.png`s if compiling for chrome since chrome doesn't support svgs in the icons property. We also add the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) on chrome but not on firefox as it's not needed there.

Use a loader like [spawn-loader][spawn] to add a new entry point. Remember to add a tilde in front of the loader or it will be resolved as a relative path.

### Output if targetVendor == 'chrome'

Here's the output of the above configuration when run through webpack.
And because we are using [html-loader][html] which can also resolve imports in `<script>` tags, again using [spawn-loader][spawn] we could include javascript files in our `options_ui/index.html`.

### manifest.json (output)

```jsonc
{
  "manifest_version": 2,
  "version": "0.3.0",
  "icons": {
    "48": "/icon-48.png",
    "96": "/icon-96.png"
  },
  "options_ui": {
    "page": "/options_ui/index.html",
    "chrome_style": false,
    "open_in_tab": true
  },
  "content_scripts": [
    {
      "matches": [...],
      "js": [
        "/browser-polyfill.min.js",
        "/content_script/index.js"
      ],
      "css": [
        "/content_script/style.css"
      ],
      "run_at": "document_start"
    }
  ],
}
```

## FAQ

### Which properties does it currently support?

All properties can use the target vendor feature, but only some properties will be resolved by webpack. These are currently: (if you need more please open an issue or PR)

Please see the [src/interfaces.ts -> Manifest](https://github.com/jsmnbom/webextension-manifest-loader/blob/main/src/interfaces.ts#L5) interface for these currently supported properties.

### Are there any known limitation or problems?

- Does not resolve imports in localizable property values (ones starting with \_\_MSG\_).
- Does not work with webpack's \[hash\], this should be okay as it's not really needed for webextensions.
- Webpack doesn't display progress for child compilers (like spawn-loader) correctly.

## Related and thanks

I wrote this loader mostly as a challange to myself to see if it could be done. It is heavily inspired by [wext-manifest-loader](https://github.com/abhijithvijayan/wext-manifest-loader), and uses parts from [html-loader][html] for the import mechanism.

[spawn]: https://github.com/erikdesjardins/spawn-loader
[inert]: https://github.com/erikdesjardins/inert-entry-webpack-plugin
[html]: https://github.com/webpack-contrib/html-loader
