// SPDX-License-Identifier: MIT
declare module 'saxon-js' {
  const SaxonJS: {
    transform(options: Record<string, unknown>, mode: 'async'): Promise<{ principalResult?: unknown }>;
  };
  export default SaxonJS;
}
