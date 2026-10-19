/** Run the existing server TypeScript with the checked-in TypeScript dependency. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

export const requireSource = createRequire(import.meta.url);
const ts = requireSource("typescript");

// Match the repository's existing Tay test loader. Native type stripping alone
// does not resolve this source tree's extensionless imports/parameter properties.
requireSource.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: filename,
    }).outputText,
    filename,
  );
