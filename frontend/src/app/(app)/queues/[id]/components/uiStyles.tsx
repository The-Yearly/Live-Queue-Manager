export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3a542]";
export const panel = "rounded-xl border border-[#3b3832] bg-[#26241f]";
export const button = `inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
export const primaryButton = `${button} bg-[#e3a542] font-semibold text-[#1d1c19] hover:bg-[#eab55e]`;
export const secondaryButton = `${button} border border-[#3b3832] text-[#ece7dc] hover:border-[#5a564c] hover:bg-[#2e2c26]`;
export const dangerButton = `${button} border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`;
export const smallButton = "h-8 px-2.5";
export const iconButton = `inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-[#a39e91] hover:bg-[#2e2c26] hover:text-[#ece7dc] disabled:cursor-not-allowed disabled:opacity-25 ${focusRing}`;
export const textInput =
  "h-10 w-full rounded-lg border border-[#3b3832] bg-[#1d1c19] px-3 text-sm text-[#ece7dc] placeholder:text-[#7d786c] focus:border-[#e3a542] focus:outline-none";
export const errorBox =
  "rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300";
