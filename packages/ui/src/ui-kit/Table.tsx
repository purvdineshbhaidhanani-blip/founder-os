import React from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** Defaults to `row[key]` when omitted; provide `render` for anything non-primitive. */
  accessor?: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption?: string;
}

/** Generic, product-agnostic data table — column definitions and row data are entirely caller-supplied. */
export function Table<T>({ columns, rows, getRowKey, caption }: TableProps<T>): React.JSX.Element {
  return (
    <div className="fx-table-wrap">
      <table className="fx-table">
        {caption && <caption className="fx-field__hint">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : column.accessor
                      ? column.accessor(row)
                      : String((row as Record<string, unknown>)[column.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
