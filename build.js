const cpy = require("cpy");

const {lessLoader} = require("esbuild-plugin-less");

const {WasmPlugin} = require("@finos/perspective-esbuild-plugin/wasm");
const {WorkerPlugin} = require("@finos/perspective-esbuild-plugin/worker");
const {build} = require("@finos/perspective-esbuild-plugin/build");

const PROD_BUILD = {
    entryPoints: ["lib/index.js"],
    define: {
        global: "window",
    },
    plugins: [lessLoader(), WasmPlugin(true), WorkerPlugin({inline: true})],
    external: ["@jupyter*", "@lumino*"],
    format: "esm",
    loader: {
        ".html": "text",
        ".ttf": "file",
    },
    outfile: "dist/umd/perspective-mime.js",
};

async function build_all() {
    cpy(["dist/css/*"], "dist/umd");
    await Promise.all([PROD_BUILD].map(build)).catch(() => process.exit(1));
    cpy(["dist/css/*"], "dist/umd");
}

build_all();
