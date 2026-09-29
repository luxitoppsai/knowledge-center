// @ts-check
const {themes} = require('prism-react-renderer');

// vista computada: los datos valen a la fecha del build, no a la de quien mira la página
const fechaBuild = new Date().toISOString();

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Knowledge Center',
  tagline: 'Documentación viva de todos los proyectos, computada en vivo desde los repos',
  favicon: 'img/favicon.svg',

  url: 'https://luxitoppsai.github.io',
  baseUrl: '/knowledge-center/',
  organizationName: 'luxitoppsai',
  projectName: 'knowledge-center',
  trailingSlash: false,

  onBrokenLinks: 'warn',

  customFields: {fechaBuild},

  headTags: [
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'}},
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'}},
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
      },
    },
  ],

  i18n: {defaultLocale: 'es', locales: ['es']},

  markdown: {mermaid: true, hooks: {onBrokenMarkdownLinks: 'warn'}},
  themes: ['@docusaurus/theme-mermaid'],
  plugins: ['./plugins/project-pages'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: {customCss: require.resolve('./src/css/custom.css')},
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {defaultMode: 'dark', respectPrefersColorScheme: false},
      image: 'img/social-card.png',
      navbar: {
        title: 'Knowledge Center',
        logo: {alt: 'KC', src: 'img/logo.svg'},
        items: [
          {to: '/', label: 'Dashboard', position: 'left'},
          {to: '/portafolio', label: 'Portafolio', position: 'left'},
          {to: '/linaje', label: 'Linaje', position: 'left'},
          {to: '/docs/intro', label: 'Documentación', position: 'left'},
        ],
      },
      footer: {
        style: 'light',
        copyright: `Knowledge Center · datos al ${new Date(fechaBuild).toLocaleDateString('es-PE', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})}`,
      },
      mermaid: {theme: {light: 'neutral', dark: 'dark'}},
      prism: {theme: themes.vsDark, darkTheme: themes.vsDark},
    }),
};

module.exports = config;
