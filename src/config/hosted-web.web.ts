export const HOSTED_WEB = process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB === '1'
  || (typeof window !== 'undefined'
    && window.location.hostname === 'seedworkslab.github.io'
    && /^\/apps\/coconut\/web(?:\/|$)/.test(window.location.pathname));
