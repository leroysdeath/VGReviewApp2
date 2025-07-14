// To parse this data:
//
//   import { Convert } from "./file";
//
//   const gameSearch = Convert.toGameSearch(json);

export interface GameSearch {
    id:      number;
    cover:   Cover;
    name:    string;
    summary: string;
}

export interface Cover {
    id:  number;
    url: string;
}

// Converts JSON strings to/from your types
export class ConvertSearch {
    public static toGameSearch(json: string): GameSearch[] {
        return JSON.parse(json);
    }

    public static gameSearchToJson(value: GameSearch[]): string {
        return JSON.stringify(value);
    }
}
