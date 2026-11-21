// SPDX-License-Identifier: MIT
/** Brand mark: invoice sheet with the validation stamp. Same drawing as public/icon.svg. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 512 512">
      <rect width="512" height="512" rx="112" fill="#0e5a66" />
      <path d="M152 88h148l92 92v236a28 28 0 0 1-28 28H152a28 28 0 0 1-28-28V116a28 28 0 0 1 28-28z" fill="#fff" />
      <path d="M300 88v64a28 28 0 0 0 28 28h64z" fill="#b9dade" />
      <rect x="172" y="236" width="152" height="26" rx="13" fill="#0e5a66" />
      <rect x="172" y="294" width="96" height="26" rx="13" fill="#0e5a66" />
      <circle cx="372" cy="384" r="92" fill="#a6400f" stroke="#0e5a66" strokeWidth="22" />
      <path d="M326 386l32 32 60-64" fill="none" stroke="#fff" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
