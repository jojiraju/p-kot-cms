import { createTheme } from 'react-data-table-component';

// Shared react-data-table-component look so every table matches the dark theme.
// Pass theme={tableTheme} and customStyles={tableStyles} to <DataTable>.
export const tableTheme = 'pkot';

createTheme(
  tableTheme,
  {
    text: { primary: '#fdf4e3', secondary: '#a8968a', disabled: 'rgba(168, 150, 138, .4)' },
    background: { default: 'transparent' },
    context: { background: '#2a1c16', text: '#fdf4e3' },
    divider: { default: 'rgba(253, 244, 227, .09)' },
    button: { default: '#a8968a', hover: 'rgba(249, 168, 37, .12)', focus: 'rgba(249, 168, 37, .18)', disabled: 'rgba(168, 150, 138, .3)' },
    selected: { default: 'rgba(249, 168, 37, .1)', text: '#fdf4e3' },
    highlightOnHover: { default: 'rgba(249, 168, 37, .07)', text: '#fdf4e3' },
    striped: { default: 'rgba(253, 244, 227, .03)', text: '#fdf4e3' },
    sortFocus: { default: '#f9a825' },
  },
  'dark',
);

export const tableStyles = {
  table: { style: { backgroundColor: 'transparent' } },
  tableWrapper: { style: { backgroundColor: 'transparent' } },
  responsiveWrapper: { style: { backgroundColor: 'transparent' } },
  headRow: { style: { backgroundColor: 'transparent', minHeight: 50, borderBottomWidth: 1, borderBottomColor: 'rgba(253, 244, 227, .09)' } },
  headCells: {
    style: { color: '#a8968a', fontSize: '12px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', paddingLeft: 18, paddingRight: 18 },
    activeSortStyle: { color: '#f9a825', '&:hover:not(:focus)': { color: '#f9a825' } },
    inactiveSortStyle: { '&:hover': { color: '#fdf4e3' } },
  },
  rows: {
    style: { backgroundColor: 'transparent', color: '#fdf4e3', fontSize: '14px', minHeight: 70, '&:not(:last-of-type)': { borderBottomColor: 'rgba(253, 244, 227, .09)' } },
    highlightOnHoverStyle: { backgroundColor: 'rgba(249, 168, 37, .07)', color: '#fdf4e3', outline: 'none', borderBottomColor: 'rgba(253, 244, 227, .09)' },
  },
  cells: { style: { paddingLeft: 18, paddingRight: 18 } },
  pagination: {
    style: { backgroundColor: 'transparent', color: '#a8968a', borderTopStyle: 'solid', borderTopWidth: 1, borderTopColor: 'rgba(253, 244, 227, .09)', minHeight: 60, fontFamily: 'inherit', fontSize: '13px' },
    pageButtonsStyle: {
      fill: '#a8968a', color: '#a8968a', backgroundColor: 'transparent', borderRadius: 10, height: 36, width: 36, padding: 6, margin: '0 2px',
      '&:disabled': { cursor: 'unset', fill: 'rgba(168, 150, 138, .3)' },
      '&:hover:not(:disabled)': { backgroundColor: 'rgba(249, 168, 37, .12)', fill: '#f9a825' },
      '&:focus': { outline: 'none', backgroundColor: 'rgba(249, 168, 37, .18)' },
    },
  },
  noData: { style: { backgroundColor: 'transparent', color: '#a8968a' } },
  progress: { style: { backgroundColor: 'transparent', color: '#a8968a' } },
};
