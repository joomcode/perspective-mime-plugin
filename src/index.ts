import { IRenderMime } from '@jupyterlab/rendermime-interfaces';


import { JSONObject } from '@lumino/coreutils';


import { Widget } from '@lumino/widgets';

/**
 * The default mime type for the extension.
 */
const MIME_TYPE = 'application/vnd.perspective.arrow';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-perspective.arrow';

/**
 * A widget for rendering perspective.arrow.
 */
export class OutputWidget extends Widget implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
  }

  /**
   * Render perspective.arrow into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    
    let data = model.data[this._mimeType] as JSONObject;
    this.node.textContent = JSON.stringify(data);
    
    return Promise.resolve();
  }

  private _mimeType: string;
}

/**
 * A mime renderer factory for perspective.arrow data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new OutputWidget(options)
};

/**
 * Extension definition.
 */
const extension: IRenderMime.IExtension = {
  id: 'perspective-mime:plugin',
  rendererFactory,
  rank: 0,
  dataType: 'json',
  fileTypes: [
    {
      name: 'perspective.arrow',
      mimeTypes: [MIME_TYPE],
      extensions: ['.perspective.arrow']
    }
  ],
  documentWidgetFactoryOptions: {
    name: 'perspective-mime-viewer',
    primaryFileType: 'perspective.arrow',
    fileTypes: ['perspective.arrow'],
    defaultFor: ['perspective.arrow']
  }
};

export default extension;
