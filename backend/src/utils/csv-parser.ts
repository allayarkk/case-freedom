import { parse } from 'csv-parse/sync';

export const parseCSV = (content: string) => {
    // Detect delimiter: if there are more semicolons than commas, use semicolon
    const firstLine = content.split('\n')[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: delimiter,
        relax_column_count: true,
        skip_records_with_error: true
    });
};
