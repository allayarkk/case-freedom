import { parse } from 'csv-parse/sync';

export const parseCSV = (content: string) => {
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
};
