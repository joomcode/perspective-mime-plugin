# perspective-mime

A JupyterLab extension for rendering perspective.arrow files.

## Prerequisites

* JupyterLab 1.0 or later

## Installation

```bash
jupyter labextension install perspective-mime
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```

