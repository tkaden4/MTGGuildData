import { array } from "fp-ts/lib/Array";
import { identity } from "fp-ts/lib/function";
import { Option } from "fp-ts/lib/Option";

export const somes = <T>(as: Option<T>[]): T[] => array.filterMap(as, identity);
