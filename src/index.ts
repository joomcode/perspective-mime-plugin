import {IRenderMime} from '@jupyterlab/rendermime-interfaces';
import {Widget} from '@lumino/widgets';
import {IRenderMimeRegistry} from '@jupyterlab/rendermime';
import {INotebookTracker} from '@jupyterlab/notebook';
import {IStateDB} from '@jupyterlab/statedb';
import { Message } from '@lumino/messaging';

/* css */
import "../less/index.less";
import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";
import "@finos/perspective-viewer-openlayers/dist/umd/perspective-viewer-openlayers.js";
// @ts-ignore
import perspective from "@finos/perspective/dist/esm/perspective.js";

/**
 * The default mime type for the extension.
 */
const MIME_TYPE = 'application/vnd.perspective.arrow';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-perspective.arrow';
export const PSP_CONTAINER_CLASS = "PSPContainer";
const CONFIG_MIME_TYPE = 'application/perspective-config+json';
/**
 * A widget for rendering perspective.arrow.
 */
const WORKER = perspective.worker();
export class OutputWidget extends Widget implements IRenderMime.IRenderer {
    /**
     * Construct a new output widget.
     */
    constructor(options: IRenderMime.IRendererOptions, tracker: INotebookTracker, stateDb: IStateDB) {
        super();
        this._mimeType = options.mimeType;
        this._tracker = tracker;
        this._stateDb = stateDb;

        let widget_cell_id = this.findCell();
        if (widget_cell_id) {
            console.log(`Fetching state ${widget_cell_id}`)
            this._stateDb.fetch(widget_cell_id).then(value => {
                console.log(`Restoring state for ${widget_cell_id}: ${value}`)
                return value
            }).then((value) => {
                if (this._model) {
                    const new_data = {
                        ...this._model.data
                    }
                    new_data["application/clicks"] = value
                    this._model.setData({data: new_data})
                }
            });
        }

        this._model = undefined;
        this._viewer = OutputWidget.createNode(this.node)

        this._synchronize_state = this._synchronize_state.bind(this);
        this._viewer.addEventListener(
            "perspective-config-update",
            this._synchronize_state
        );
    }

    onAfterShow(msg: Message) {
        this._viewer.notifyResize(true);
        super.onAfterShow(msg);
    }

    onActivateRequest(msg: Message) {
        if (this.isAttached) {
            this._viewer.focus();
        }
        super.onActivateRequest(msg);
    }


    static createNode(node: HTMLElement) {
        node.classList.add("p-Widget");
        node.classList.add(PSP_CONTAINER_CLASS);
        const viewer = document.createElement("perspective-viewer");
        viewer.classList.add(CLASS_NAME);
        viewer.setAttribute("type", MIME_TYPE);
        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }

        node.appendChild(viewer);

        // allow perspective's event handlers to do their work
        viewer.addEventListener(
            "contextmenu",
            (event) => event.stopPropagation(),
            false
        );

        const div = document.createElement("div");
        div.style.setProperty("display", "flex");
        div.style.setProperty("flex-direction", "row");
        node.appendChild(div);

        return viewer;
    }

    async _synchronize_state() {
        if (!this._model) {
            console.log(`_synchronize_state triggered before render`)
            return
        }
        const config = await this._viewer.save();

        delete config['editable']
        delete config['zoom']
        delete config['scroll_lock']
        delete config['settings']

        const plugin_config = config['plugin_config']
        if (plugin_config) {
            delete config['plugin_config']['editable']
            delete config['plugin_config']['zoom']
            delete config['plugin_config']['scroll_lock']
            delete config['plugin_config']['legend']
            delete config['plugin_config']['columns']
        }

        this.setData(config)
    }

    /**
     * Render perspective into this widget's node.
     */
    renderModel(model: IRenderMime.IMimeModel): Promise<void> {
        this._model = model
        const mime_data = model['data'][this._mimeType]
        if(!mime_data){
            return Promise.resolve();
        }
        // @ts-ignore
        const type= mime_data['type'] as string
        // @ts-ignore
        let data = mime_data['data'] as string;
        const config = model['data'][CONFIG_MIME_TYPE]

        console.log(`Restored config ${JSON.stringify(config)}`)


        return this._update(type, data).then(() => {
            if (config) {
                this._viewer.restore(config)
            }
        });
    }

    async _update(type: string, raw_data: any) {
        try {
            let data;
            if (type === "csv") {
                // load csv directly
                data = raw_data.toString();
            } else if (type === "arrow") {
                // load arrow directly
                data = Uint8Array.from(
                    atob(raw_data.toString()),
                    (c) => c.charCodeAt(0)
                ).buffer;
            } else if (type === "json") {
                data = raw_data.toJSON();
                if (Array.isArray(data) && data.length > 0) {
                    // already is records form, load directly
                    data = data;
                } else {
                    // Column-oriented or single records JSON
                    // don't handle for now, just need to implement
                    // a simple transform but we can't handle all
                    // cases
                    throw "Not handled";
                }
            } else {
                // don't handle other mimetypes for now
                throw "Not handled";
            }
            try {
                const table = await this._viewer.getTable();
                table.replace(data);
            } catch (e) {
                // construct new table
                const table_promise = WORKER.table(data);

                // load data
                await this._viewer.load(table_promise);
            }
        } catch (e) {
            throw e;
        }

        // // pickup theme from env
        // this._psp.theme =
        //     document.body.getAttribute("data-jp-theme-light") === "false"
        //         ? "Material Light"
        //         : "Material Dark";
    }

    findCell() {
        const next_cell_id = this._tracker.activeCell?.model.id;
        const cells = this._tracker.currentWidget!.model!.cells;
        let cell = undefined;
        for (let i = 0; i < cells.length; i++) {
            if (cells.get(i).id === next_cell_id) {
                cell = cells.get(i - 1);
                break;
            }
        }
        return cell?.id;
    }

    setDirty() {
        let model = this._tracker.currentWidget?.model
        if (model) {
            model.dirty = true
        }
    }

    setData(data: any){
        if (!this._model) {
            return
        }
        const new_data = {
            ...this._model.data
        }
        new_data[CONFIG_MIME_TYPE] = data

        if(this._model.data !== new_data){
            this._model.setData({data: new_data})
            let id = this._tracker.activeCell?.model?.id;
            if (id) {
                this._stateDb.save(id, data)
            }

            this.setDirty()
        }
    }

    private _viewer: any;
    private _tracker: INotebookTracker;
    private _stateDb: IStateDB;
    private _mimeType: string;
    private _model: IRenderMime.IMimeModel | undefined;
}

/**
 * A mime renderer factory for perspective data.
 */

export class OutputWidgetFactory implements IRenderMime.IRendererFactory {

    constructor(tracker: INotebookTracker, stateDb: IStateDB) {
        this._tracker = tracker;
        this._stateDb = stateDb;
    }

    _tracker: INotebookTracker
    _stateDb: IStateDB
    safe = true
    mimeTypes = [MIME_TYPE]
    createRenderer = (options: IRenderMime.IRendererOptions) => new OutputWidget(options, this._tracker, this._stateDb)
}

function activate(app: any, rendermime: IRenderMimeRegistry, tracker: INotebookTracker, stateDb: IStateDB) {
    rendermime.addFactory(new OutputWidgetFactory(tracker, stateDb), 0);
}


export const perspectiveRenderers = {
    activate: activate,
    id: "@finos/perspective-jupyterlab:renderers",
    requires: [IRenderMimeRegistry, INotebookTracker, IStateDB],
    // @ts-ignore
    optional: [],
    autoStart: true,
};

export default perspectiveRenderers;
