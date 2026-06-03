import { r as HTTPResponse } from "../_libs/h3+rou3+srvx.mjs";
//#region #nitro/virtual/renderer-template
var rendererTemplate = () => new HTTPResponse("<!doctype html>\r\n<html lang=\"en\">\r\n  <head>\r\n    <meta charset=\"UTF-8\" />\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\r\n    <title>Neureuther</title>\r\n    <script type=\"module\" crossorigin src=\"/assets/index-PGVyFoEu.js\"><\/script>\n    <link rel=\"stylesheet\" crossorigin href=\"/assets/index-BqkwESM8.css\">\n  </head>\r\n\r\n  <body>\r\n    <div id=\"root\"></div>\r\r\n  </body>\r\n</html>\r\n", { headers: { "content-type": "text/html; charset=utf-8" } });
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260522-beta_lru-c_92a490d1fda324bb1c89741fa0229fd5/node_modules/nitro/dist/runtime/internal/routes/renderer-template.mjs
function renderIndexHTML(event) {
	return rendererTemplate(event.req);
}
//#endregion
export { renderIndexHTML as default };
