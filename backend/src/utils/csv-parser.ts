import { parse } from 'csv-parse/sync';

export const parseCSV = (content: string) => {
    const firstLine = content.split('\n')[0];
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter,
        relax_column_count: true,
        skip_records_with_error: true,
    });
};
