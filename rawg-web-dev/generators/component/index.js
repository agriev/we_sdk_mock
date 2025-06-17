const path = require('path');

module.exports = {
  description: 'Add component',
  prompts: [
    {
      type: 'list',
      name: 'type',
      message: 'Select the type of component',
      default: 'Stateless',
      choices: () => ['Stateless', 'Component'],
    },
    {
      type: 'input',
      name: 'name',
      message: 'What should it be called?',
      validate: (value) => {
        if (/.+/.test(value)) {
          return true;
        }
        return 'name is required';
      },
    },
    {
      type: 'confirm',
      name: 'connectedComponent',
      default: true,
      message: 'Do you want a connected component?',
    },
    {
      type: 'confirm',
      name: 'injectReactIntl',
      default: false,
      message: 'Do you want to inject react-intl?',
    },
    {
      type: 'input',
      name: 'relativePath',
      message: 'Folder (/src/app/...',
    },
  ],
  actions: (data) => {
    // Generate index.js and index.test.js
    let componentTemplate;

    switch (data.type) {
      case 'Stateless': {
        componentTemplate = path.resolve(__dirname, 'stateless.js.hbs');
        break;
      }
      case 'Component': {
        componentTemplate = path.resolve(__dirname, 'component.js.hbs');
        break;
      }
      default: {
        componentTemplate = path.resolve(__dirname, 'stateless.js.hbs');
      }
    }

    let relativePath;

    if (data.relativePath) {
      relativePath = `src/app/${data.relativePath}/{{dashCase name}}.js`;
    } else {
      relativePath = 'src/app/{{dashCase name}}.js';
    }

    const stylTemplate = path.resolve(__dirname, 'component.styl.hbs');
    const stylPath = `src/app/${data.relativePath}/{{dashCase name}}.styl`;

    const storybookTemplate = path.resolve(__dirname, 'component.stories.js.hbs');
    const storybookPath = `src/app/${data.relativePath}/{{dashCase name}}.stories.js`;

    const packageTemplate = path.resolve(__dirname, 'package.json.hbs');
    const packagePath = `src/app/${data.relativePath}/package.json`;

    const actions = [
      {
        type: 'add',
        path: path.resolve(process.cwd(), relativePath),
        templateFile: componentTemplate,
        abortOnFail: true,
      },
      {
        type: 'add',
        path: path.resolve(process.cwd(), stylPath),
        templateFile: stylTemplate,
        abortOnFail: true,
      },
      {
        type: 'add',
        path: path.resolve(process.cwd(), storybookPath),
        templateFile: storybookTemplate,
        abortOnFail: true,
      },
      {
        type: 'add',
        path: path.resolve(process.cwd(), packagePath),
        templateFile: packageTemplate,
        abortOnFail: true,
      },
    ];

    return actions;
  },
};
