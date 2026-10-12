// The kit's version, read from the package so release copy never goes stale.
import pkg from "../../../package.json";
export const version: string = pkg.version;
export const minor = version.split(".").slice(0, 2).join(".");
