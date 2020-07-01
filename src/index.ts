import stripJsonComments from 'strip-json-comments';
import { getOptions, urlToRequest, stringifyRequest } from 'loader-utils';
import validateOptions from 'schema-utils';
import deepmerge from 'deepmerge';
import webpack from 'webpack';
import { Schema } from 'schema-utils/declarations/validate';

import { VENDORS } from './constants';
import {
  Manifest,
  LoaderOptions,
  Message,
  ImportMessage,
  ReplacerMessage,
  StringMap,
} from './interfaces';
import { objectMap, convertVendorKeys } from './utils';

const optionsSchema = {
  type: 'object',
  properties: {
    targetVendor: {
      type: 'string',
    },
    merge: {
      type: 'object',
      additionalProperties: true,
    },
  },
};

function loader(this: webpack.loader.LoaderContext, source: string) {
  const done = this.async() as webpack.loader.loaderCallback;

  const options = (Object.assign(
    {
      merge: {} as Manifest,
    },
    getOptions(this)
  ) as unknown) as LoaderOptions;

  validateOptions(optionsSchema as Schema, options, {
    name: 'Webextension Manifest Loader',
  });

  const targetVendor = options.targetVendor;

  if (!VENDORS.includes(targetVendor)) {
    throw new Error(
      `options.targetVendor must be set to one of ${VENDORS}, not ${targetVendor}.`
    );
  }

  const rawManifest = JSON.parse(stripJsonComments(source));

  let manifest: Manifest = convertVendorKeys(rawManifest, targetVendor);

  manifest = deepmerge(manifest, options.merge!);

  const messages: Message[] = [];
  const content = sourceExtract(manifest, messages);

  const importedMessages: ImportMessage[] = [];
  const replaceableMessages: ReplacerMessage[] = [];

  for (const message of messages) {
    // eslint-disable-next-line default-case
    switch (message.type) {
      case 'import':
        importedMessages.push(message.value);
        break;
      case 'replacer':
        replaceableMessages.push(message.value);
        break;
    }
  }

  const importCode = getImportCode(importedMessages, this);
  const moduleCode = getModuleCode(content, replaceableMessages);
  const exportCode = `export default JSON.stringify(code, null, 2);`;

  const out = `${importCode}${moduleCode}${exportCode}`;
  done(null, out);
}

const sourceExtract = (manifest: Manifest, messages: Message[]) => {
  const importsMap: StringMap = new Map();
  const replacersMap: StringMap = new Map();

  const extract = sourceExtractSingle(importsMap, replacersMap, messages);

  // Icons
  if (manifest.icons) {
    manifest.icons = objectMap(manifest.icons, (key, val) => [
      key,
      extract(val as string),
    ]);
  }

  // Content scripts
  if (manifest.content_scripts) {
    manifest.content_scripts = manifest.content_scripts.map((entry) => {
      if (entry.js) entry.js = entry.js.map((val) => extract(val));
      if (entry.css) entry.css = entry.css.map((val) => extract(val));
      return entry;
    });
  }

  // Background scripts
  if (manifest.background) {
    if (manifest.background.scripts) {
      manifest.background.scripts = manifest.background.scripts.map((val) =>
        extract(val)
      );
    }
    if (manifest.background.page) {
      manifest.background.page = extract(manifest.background.page);
    }
  }

  // Options ui
  if (manifest.options_ui) {
    if (manifest.options_ui.page) {
      manifest.options_ui.page = extract(manifest.options_ui.page);
    }
  }

  // Web accessible resources
  if (manifest.web_accessible_resources) {
    manifest.web_accessible_resources = manifest.web_accessible_resources.map(
      (val) => extract(val)
    );
  }

  // Browser action
  if (manifest.browser_action) {
    // Default icon
    if (manifest.browser_action.default_icon) {
      if (typeof manifest.browser_action.default_icon === 'string') {
        manifest.browser_action.default_icon = extract(
          manifest.browser_action.default_icon
        );
      } else {
        manifest.browser_action.default_icon = objectMap(
          manifest.browser_action.default_icon,
          (key, val) => [key, extract(val as string)]
        );
      }
    }
    // Theme icons
    if (manifest.browser_action.theme_icons) {
      manifest.browser_action.theme_icons = manifest.browser_action.theme_icons.map(
        (theme_icon) => {
          theme_icon.dark = extract(theme_icon.dark);
          theme_icon.light = extract(theme_icon.light);
          return theme_icon;
        }
      );
    }
    // Default popup
    if (manifest.browser_action.default_popup) {
      manifest.browser_action.default_popup = extract(
        manifest.browser_action.default_popup
      );
    }
  }

  // Page action
  if (manifest.page_action) {
    // Default icon
    if (manifest.page_action.default_icon) {
      if (typeof manifest.page_action.default_icon === 'string') {
        manifest.page_action.default_icon = extract(
          manifest.page_action.default_icon
        );
      } else {
        manifest.page_action.default_icon = objectMap(
          manifest.page_action.default_icon,
          (key, val) => [key, extract(val as string)]
        );
      }
    }
    // Default popup
    if (manifest.page_action.default_popup) {
      manifest.page_action.default_popup = extract(
        manifest.page_action.default_popup
      );
    }
  }

  // User scripts
  if (manifest.user_scripts) {
    if (manifest.user_scripts.api_script) {
      manifest.user_scripts.api_script = extract(
        manifest.user_scripts.api_script
      );
    }
  }

  // Chrome url overrides
  if (manifest.chrome_url_overwrites) {
    // New tab
    if (manifest.chrome_url_overwrites.new_tab) {
      manifest.chrome_url_overwrites.new_tab = extract(
        manifest.chrome_url_overwrites.new_tab
      );
    }
    // Bookmarks
    if (manifest.chrome_url_overwrites.bookmarks) {
      manifest.chrome_url_overwrites.bookmarks = extract(
        manifest.chrome_url_overwrites.bookmarks
      );
    }
    // History
    if (manifest.chrome_url_overwrites.history) {
      manifest.chrome_url_overwrites.history = extract(
        manifest.chrome_url_overwrites.history
      );
    }
  }

  // Sidebar action
  if (manifest.sidebar_action) {
    // Default icon
    if (manifest.sidebar_action.default_icon) {
      if (typeof manifest.sidebar_action.default_icon === 'string') {
        manifest.sidebar_action.default_icon ==
          extract(manifest.sidebar_action.default_icon);
      } else {
        manifest.sidebar_action.default_icon = objectMap(
          manifest.sidebar_action.default_icon,
          (key, val) => [key, extract(val as string)]
        );
      }
    }
    // Default popup
    if (manifest.sidebar_action.default_panel) {
      manifest.sidebar_action.default_panel = extract(
        manifest.sidebar_action.default_panel
      );
    }
  }

  return manifest;
};

const sourceExtractSingle = (
  importsMap: StringMap,
  replacersMap: StringMap,
  messages: Message[]
) => (value: string) => {
  // Assume it's a request since we only extract
  // values from the manifest that has requests
  const importKey = urlToRequest(decodeURIComponent(value));
  let importName = importsMap.get(importKey);

  if (!importName) {
    importName = `___WEBEXTENSION_MANIFEST_LOADER_IMPORT_${importsMap.size}___`;
    importsMap.set(importKey, importName);

    messages.push({
      type: 'import',
      value: {
        source: importKey,
        importName,
      },
    });
  }

  const replacerKey = importKey;
  let replacerName = replacersMap.get(replacerKey);

  if (!replacerName) {
    replacerName = `___WEBEXTENSION_MANIFEST_LOADER_REPLACER_${replacersMap.size}___`;
    replacersMap.set(replacerKey, replacerName);

    messages.push({
      type: 'replacer',
      value: {
        importName,
        replacerName,
      },
    });
  }

  return replacerName;
};

const GET_SOURCE_FROM_IMPORT_NAME =
  '___WEBEXTENSION_MANIFEST_LOADER_GET_SOURCE_FROM_IMPORT___';

const getImportCode = (
  messages: ImportMessage[],
  context: webpack.loader.LoaderContext
) => {
  // First add import for the helper
  const stringifiedHelperRequest = stringifyRequest(
    context,
    require.resolve('./runtime/getUrl.js')
  );

  let code = `var ${GET_SOURCE_FROM_IMPORT_NAME} = require(${stringifiedHelperRequest});\n`;

  for (const item of messages) {
    const { importName, source } = item;
    const stringifiedSourceRequest = stringifyRequest(context, source);

    code += `var ${importName} = require(${stringifiedSourceRequest});\n`;
  }

  return `// Imports\n${code}`;
};

const getModuleCode = (manifest: Manifest, messages: ReplacerMessage[]) => {
  // Convert to string so we can string replace
  let code = JSON.stringify(manifest);

  let replacersCode = '';

  for (const item of messages) {
    const { importName, replacerName } = item;

    // Add helper wrapper
    replacersCode += `var ${replacerName} = ${GET_SOURCE_FROM_IMPORT_NAME}(${importName});\n`;

    // Remove quotes around the name, so that it's a variable
    code = code.replace(
      new RegExp(`"${replacerName}"`, 'g'),
      () => replacerName
    );
  }
  return `// Module\n${replacersCode}var code = ${code};\n`;
};

export = loader;
