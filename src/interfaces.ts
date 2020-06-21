import { VENDORS } from './constants';

// A manifest.json file
// But only the values we really care about
export interface Manifest {
  background?: {
    scripts?: string[];
    page?: string;
  };
  content_scripts?: {
    js?: string[];
    css?: string[];
  }[];
  options_ui?: {
    page?: string;
  };
  icons: {
    [size: number]: string;
  };
  web_accessible_resources?: string[];
  browser_action?: {
    default_icon?:
      | string
      | {
          [size: number]: string;
        };
    theme_icons?: { light: string; dark: string }[];
    default_popup?: string;
  };
  page_action?: {
    default_icon?:
      | string
      | {
          [size: number]: string;
        };
    default_popup?: string;
  };
  devtools_page?: string;
  user_scripts?: {
    api_script?: string;
  };
  chrome_url_overwrites?: {
    new_tab?: string;
    history?: string;
    bookmarks?: string;
  };
  sidebar_action?: {
    default_icon?:
      | string
      | {
          [size: number]: string;
        };
    default_panel?: string;
  };
  [x: string]: unknown;
}

export type AnyObject = { [key: string]: unknown; [key: number]: unknown };
export type StringMap = Map<string, string>;

export interface LoaderOptions {
  targetVendor: typeof VENDORS[number];
  merge?: Manifest;
}

export type ImportMessage = { source: string; importName: string };
export type ReplacerMessage = { importName: string; replacerName: string };
export type Message =
  | {
      type: 'import';
      value: ImportMessage;
    }
  | {
      type: 'replacer';
      value: ReplacerMessage;
    };
