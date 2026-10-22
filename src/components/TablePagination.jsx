import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select } from './ui';

const PAGE_SIZES = ['10', '25', '50'];

/** Custom pager for react-data-table-component: <DataTable paginationComponent={TablePagination} /> */
export default function TablePagination({ rowsPerPage, rowCount, currentPage, onChangePage, onChangeRowsPerPage }) {
  const pages = Math.max(1, Math.ceil(rowCount / rowsPerPage));
  const from = rowCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const to = Math.min(currentPage * rowsPerPage, rowCount);
  const go = (p) => onChangePage(Math.min(Math.max(p, 1), pages), rowCount);

  return (
    <div className="tp">
      <div className="tp-size">
        <span>Rows per page</span>
        <Select
          compact
          isSearchable={false}
          menuPlacement="top"
          options={PAGE_SIZES}
          value={String(rowsPerPage)}
          onChange={(v) => onChangeRowsPerPage(Number(v), currentPage)}
        />
      </div>
      <span className="tp-range">{from}–{to} of {rowCount}</span>
      <div className="tp-nav">
        <button type="button" className="pcard-btn" onClick={() => go(1)} disabled={currentPage <= 1} aria-label="First page"><ChevronsLeft size={16} /></button>
        <button type="button" className="pcard-btn" onClick={() => go(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span className="tp-page">{currentPage} / {pages}</span>
        <button type="button" className="pcard-btn" onClick={() => go(currentPage + 1)} disabled={currentPage >= pages} aria-label="Next page"><ChevronRight size={16} /></button>
        <button type="button" className="pcard-btn" onClick={() => go(pages)} disabled={currentPage >= pages} aria-label="Last page"><ChevronsRight size={16} /></button>
      </div>
    </div>
  );
}
