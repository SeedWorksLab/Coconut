export const HOSTED_WEB = process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB === '1'
  || (typeof window !== 'undefined'
    && (window.location.hostname === 'coconut.seedworkslab.de'
      || (window.location.hostname === 'seedworkslab.de'
        && /^\/apps\/coconut\/web(?:\/|$)/.test(window.location.pathname))));
