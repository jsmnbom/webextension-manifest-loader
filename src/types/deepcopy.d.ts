declare module 'deepcopy' {
  type AnyObject = { [key: string]: unknown; [key: number]: unknown };
  export default function deepcopy<O extends AnyObject>(object: O): O;
}
