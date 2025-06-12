import path from "node:path";
import process from "node:process";
export default (p) => path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
