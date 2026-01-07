export async function register() {
  if (typeof window === 'undefined') {
    // Polyfill localStorage for server-side rendering
    // @ts-ignore
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0
    };
  }
}
